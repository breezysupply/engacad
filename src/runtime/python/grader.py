"""EngAcad grading harness.

Runs inside Pyodide, both in the browser Web Worker and in the Node test suite,
so the code that grades the learner is the same code the content tests audit.

Public entry points (JSON in, JSON out):
    engacad_run(source, inputs_json)   -> exploratory execution, never grades
    engacad_check(source, spec_json)   -> deterministic per-requirement grading

Every execution gets a brand-new namespace dict, so state cannot leak between
Run calls or between Check cases.
"""

import ast
import builtins
import contextlib
import copy
import io
import json
import linecache
import math
import traceback

LEARNER_FILE = "<your code>"
MAX_OUTPUT = 20000
STATIC_KINDS = {"protected", "uses"}


# ───────────────────────── execution ─────────────────────────


def _blocked_input(prompt=""):
    raise RuntimeError(
        "input() is not used in EngAcad exercises: the checker provides inputs as "
        "variables (see the Inputs panel)."
    )


def _builtins():
    b = dict(builtins.__dict__)
    b["input"] = _blocked_input
    return b


def _truncate(text):
    if len(text) > MAX_OUTPUT:
        extra = len(text) - MAX_OUTPUT
        return text[:MAX_OUTPUT] + f"\n... output truncated ({extra} more characters)"
    return text


def _register_source(source):
    linecache.cache[LEARNER_FILE] = (len(source), None, source.splitlines(True), LEARNER_FILE)


def _syntax_error(exc):
    text = (exc.text or "").rstrip("\n")
    lines = [f"  Line {exc.lineno}"]
    if text:
        lines.append("    " + text.strip())
        if exc.offset:
            indent = len(text) - len(text.lstrip())
            caret = max(0, exc.offset - 1 - indent)
            lines.append("    " + " " * caret + "^")
    lines.append(f"{type(exc).__name__}: {exc.msg}")
    return {
        "type": type(exc).__name__,
        "message": exc.msg,
        "line": exc.lineno,
        "traceback": "\n".join(lines),
    }


def _runtime_error(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == LEARNER_FILE]
    lines = ["Traceback (most recent call last):"]
    for f in frames:
        where = f"  Line {f.lineno}" + ("" if f.name == "<module>" else f", in {f.name}")
        lines.append(where)
        if f.line:
            lines.append("    " + f.line.strip())
    lines.extend(s.rstrip("\n") for s in traceback.format_exception_only(type(exc), exc))
    return {
        "type": type(exc).__name__,
        "message": str(exc),
        "line": frames[-1].lineno if frames else None,
        "traceback": "\n".join(lines),
    }


def _execute(source, inputs):
    """Execute learner source in a fresh namespace. Returns (ns, stdout, stderr, error)."""
    ns = {"__name__": "__main__", "__builtins__": _builtins()}
    ns.update(copy.deepcopy(inputs))
    _register_source(source)
    try:
        code = compile(source, LEARNER_FILE, "exec")
    except SyntaxError as exc:
        return ns, "", "", _syntax_error(exc)
    out, err = io.StringIO(), io.StringIO()
    error = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            exec(code, ns)
        except SystemExit as exc:
            error = {
                "type": "SystemExit",
                "message": f"exit({exc.code!r}) was called, which stops the program early.",
                "line": None,
                "traceback": "SystemExit: the program called exit()",
            }
        except BaseException as exc:  # noqa: BLE001 - we report every learner failure
            error = _runtime_error(exc)
    return ns, _truncate(out.getvalue()), _truncate(err.getvalue()), error


def _parse_inputs(raw):
    return {name: ast.literal_eval(literal) for name, literal in raw.items()}


def _variables(ns, input_names):
    result = []
    for name, value in ns.items():
        if name.startswith("_") or name == "__builtins__":
            continue
        kind = type(value).__name__
        if kind in ("module",):
            continue
        r = repr(value)
        if len(r) > 200:
            r = r[:200] + "..."
        result.append({"name": name, "type": kind, "repr": r, "input": name in input_names})
        if len(result) >= 40:
            break
    return result


# ───────────────────────── static analysis ─────────────────────────


def _target_names(node):
    if isinstance(node, ast.Name):
        yield node.id, node.lineno
    elif isinstance(node, (ast.Tuple, ast.List)):
        for elt in node.elts:
            yield from _target_names(elt)
    elif isinstance(node, ast.Starred):
        yield from _target_names(node.value)


def find_assignments(tree, names):
    """Return [{name, line}] for every rebinding of a protected name."""
    names = set(names)
    found = []

    def add(name, line):
        if name in names:
            found.append({"name": name, "line": line})

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for t in node.targets:
                for n, line in _target_names(t):
                    add(n, line)
        elif isinstance(node, (ast.AugAssign, ast.AnnAssign)):
            for n, line in _target_names(node.target):
                add(n, line)
        elif isinstance(node, ast.NamedExpr):
            add(node.target.id, node.lineno)
        elif isinstance(node, (ast.For, ast.AsyncFor, ast.comprehension)):
            for n, line in _target_names(node.target):
                add(n, getattr(node, "lineno", line))
        elif isinstance(node, ast.withitem) and node.optional_vars is not None:
            for n, line in _target_names(node.optional_vars):
                add(n, line)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            add(node.name, node.lineno)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                add((alias.asname or alias.name).split(".")[0], node.lineno)
        elif isinstance(node, ast.Delete):
            for t in node.targets:
                for n, line in _target_names(t):
                    add(n, line)
        elif isinstance(node, ast.Global):
            for n in node.names:
                add(n, node.lineno)
    found.sort(key=lambda f: f["line"])
    return found


def _uses(tree, construct):
    """Does the parsed source use a construct? e.g. 'fstring', 'call:print', 'name:x', 'op:Add'."""
    kind, _, arg = construct.partition(":")
    for node in ast.walk(tree):
        if kind == "fstring" and isinstance(node, ast.JoinedStr):
            return True
        if kind == "call" and isinstance(node, ast.Call):
            fn = node.func
            if isinstance(fn, ast.Name) and fn.id == arg:
                return True
            if isinstance(fn, ast.Attribute) and fn.attr == arg:
                return True
        if kind == "name" and isinstance(node, ast.Name) and node.id == arg and isinstance(node.ctx, ast.Load):
            return True
        if kind == "op" and isinstance(node, (ast.BinOp, ast.AugAssign)) and type(node.op).__name__ == arg:
            return True
        if kind == "compare" and isinstance(node, ast.Compare):
            if not arg or any(type(op).__name__ == arg for op in node.ops):
                return True
    return False


# ───────────────────────── comparisons ─────────────────────────


def _norm_lines(text):
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return lines


def _compare_stdout(expected, observed, match):
    if match == "exact":
        if expected == observed:
            return True, None
    exp_lines, obs_lines = _norm_lines(expected), _norm_lines(observed)
    if match != "exact" and exp_lines == obs_lines:
        return True, None
    detail = {"lineCountExpected": len(exp_lines), "lineCountObserved": len(obs_lines)}
    for i in range(max(len(exp_lines), len(obs_lines))):
        e = exp_lines[i] if i < len(exp_lines) else None
        o = obs_lines[i] if i < len(obs_lines) else None
        if e != o:
            detail.update({"firstDiffLine": i + 1, "expectedLine": e, "observedLine": o})
            break
    else:
        if match == "exact":
            detail.update({"firstDiffLine": None, "note": "Only trailing whitespace or newlines differ."})
    return False, detail


def _type_ok(value, expected_value, wanted):
    if wanted == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if wanted:
        return type(value).__name__ == wanted
    return type(value) is type(expected_value)


def _values_equal(value, expected, tolerance):
    if isinstance(expected, float) or isinstance(value, float):
        if isinstance(value, bool) or isinstance(expected, bool):
            return value == expected and type(value) is type(expected)
        try:
            return math.isclose(float(value), float(expected), rel_tol=1e-9, abs_tol=tolerance)
        except (TypeError, ValueError):
            return False
    return value == expected


def _short(value):
    r = repr(value)
    return r if len(r) <= 160 else r[:160] + "..."


def _eval_requirement(req, case, ns, stdout, error):
    kind = req["kind"]
    expect = case.get("expect", {})
    base = {"requirementId": req["id"], "caseId": case["id"], "applicable": True}

    if kind == "runs":
        if error is None:
            return {**base, "passed": True}
        return {**base, "passed": False, "observed": f"{error['type']}: {error['message']}",
                "expected": "the program finishes without an error"}

    if kind == "stdout":
        if "stdout" not in expect:
            return {**base, "applicable": False, "passed": True}
        ok, detail = _compare_stdout(expect["stdout"], stdout, req.get("match", "lines"))
        res = {**base, "passed": ok}
        if not ok:
            res.update({"expected": expect["stdout"], "observed": stdout, "diff": detail})
            if error is not None:
                res["note"] = f"The program stopped early with {error['type']}."
        return res

    if kind == "stdout-contains":
        ok = req["text"] in stdout
        res = {**base, "passed": ok}
        if not ok:
            res.update({"expected": f"output containing {req['text']!r}", "observed": stdout})
        return res

    if kind == "var":
        name = req["name"]
        literals = expect.get("vars", {})
        if name not in literals:
            return {**base, "applicable": False, "passed": True}
        expected = ast.literal_eval(literals[name])
        if name not in ns:
            note = " (the program stopped early with an error)" if error else ""
            return {**base, "passed": False, "expected": f"{name} = {_short(expected)}",
                    "observed": f"no variable named {name!r} was created{note}"}
        value = ns[name]
        if not _type_ok(value, expected, req.get("type")):
            wanted = req.get("type") or type(expected).__name__
            return {**base, "passed": False,
                    "expected": f"{name} is a {wanted} ({_short(expected)})",
                    "observed": f"{name} is a {type(value).__name__} ({_short(value)})"}
        if not _values_equal(value, expected, req.get("tolerance", 1e-9)):
            return {**base, "passed": False, "expected": f"{name} = {_short(expected)}",
                    "observed": f"{name} = {_short(value)}"}
        return {**base, "passed": True}

    if kind == "expr":
        env = {"ns": ns, "stdout": stdout, "error": error, "math": math,
               "expected": {k: ast.literal_eval(v) for k, v in expect.get("vars", {}).items()},
               "expected_stdout": expect.get("stdout"), "inputs": _parse_inputs(case.get("inputs", {}))}
        try:
            ok = bool(eval(req["expr"], {"__builtins__": builtins.__dict__}, env))
        except Exception as exc:  # noqa: BLE001
            return {**base, "passed": False, "observed": f"check could not evaluate: {type(exc).__name__}: {exc}"}
        return {**base, "passed": ok}

    return {**base, "passed": False, "observed": f"unknown requirement kind {kind!r}"}


# ───────────────────────── entry points ─────────────────────────


def engacad_run(source, inputs_json):
    raw = json.loads(inputs_json) if inputs_json else {}
    inputs = _parse_inputs(raw)
    warnings = []
    try:
        tree = ast.parse(source)
        warnings = find_assignments(tree, list(inputs))
    except SyntaxError:
        pass
    ns, stdout, stderr, error = _execute(source, inputs)
    return json.dumps({
        "stdout": stdout,
        "stderr": stderr,
        "error": error,
        "variables": _variables(ns, set(inputs)) if error is None or error["type"] != "SyntaxError" else [],
        "protectedWarnings": warnings,
    })


def engacad_check(source, spec_json):
    spec = json.loads(spec_json)
    requirements = spec["requirements"]
    protected = spec.get("protected", [])
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return json.dumps({"passed": False, "syntaxError": _syntax_error(exc), "static": [], "cases": []})

    static = []
    for req in requirements:
        if req["kind"] == "protected":
            hits = find_assignments(tree, protected)
            res = {"requirementId": req["id"], "passed": not hits}
            if hits:
                res["observed"] = ", ".join(f"{h['name']} reassigned on line {h['line']}" for h in hits)
                res["expected"] = "the provided inputs are used, not replaced"
            static.append(res)
        elif req["kind"] == "uses":
            used = _uses(tree, req["construct"])
            ok = (not used) if req.get("forbid") else used
            static.append({"requirementId": req["id"], "passed": ok})

    cases = []
    for case in spec["cases"]:
        ns, stdout, stderr, error = _execute(source, _parse_inputs(case["inputs"]))
        results = []
        for req in requirements:
            if req["kind"] in STATIC_KINDS:
                continue
            only = req.get("cases")
            if only and case["id"] not in only:
                continue
            results.append(_eval_requirement(req, case, ns, stdout, error))
        cases.append({
            "caseId": case["id"],
            "stdout": stdout,
            "stderr": stderr,
            "error": error,
            "results": results,
            "passed": all(r["passed"] for r in results),
        })

    passed = all(s["passed"] for s in static) and all(c["passed"] for c in cases)
    return json.dumps({"passed": passed, "syntaxError": None, "static": static, "cases": cases})
