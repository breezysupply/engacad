import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { LEVEL_LABEL } from '../../components/Badges';
import { skillById } from '../../content/skills';
import { exerciseById } from '../../content';
import type { CheckOutcome } from '../../progress/store';
import { explainError, type GradedCheck } from '../../runtime/python/grading';
import type { PyError, RunResult } from '../../runtime/python/protocol';

export function ErrorBox({ error }: { error: PyError }) {
  return (
    <div className="error-box" role="alert" data-testid="error-box">
      <h4>
        {error.type}
        {error.line ? ` on line ${error.line}` : ''}
      </h4>
      <p className="small" style={{ marginBottom: 8 }}>
        {explainError(error)}
      </p>
      <pre className="output-pre" style={{ background: 'var(--bg-elev)' }}>
        {error.traceback}
      </pre>
    </div>
  );
}

export function RunOutput({ result }: { result: RunResult }) {
  return (
    <div data-testid="run-output">
      <div className="row small muted" style={{ marginBottom: 6 }}>
        <span>Output (stdout)</span>
        <span className="spacer" />
        <span>Run never grades or awards evidence.</span>
      </div>
      <pre className="output-pre" data-testid="stdout">
        {result.stdout ? result.stdout : <span className="output-empty">(nothing was printed)</span>}
      </pre>
      {result.stderr && (
        <>
          <div className="small muted" style={{ margin: '8px 0 4px' }}>
            stderr
          </div>
          <pre className="output-pre">{result.stderr}</pre>
        </>
      )}
      {result.error && <ErrorBox error={result.error} />}
      {result.protectedWarnings.length > 0 && (
        <div className="callout callout-warn small">
          <div className="callout-title">
            <AlertTriangle size={15} /> Provided input reassigned
          </div>
          {result.protectedWarnings.map((w) => (
            <div key={`${w.name}${w.line}`}>
              <code>{w.name}</code> is reassigned on line {w.line}. Check supplies its own values, so this program would ignore them.
            </div>
          ))}
        </div>
      )}
      {result.variables.length > 0 && (
        <>
          <div className="small muted" style={{ margin: '12px 0 4px' }}>
            Variables after running
          </div>
          <table className="table var-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {result.variables.map((v) => (
                <tr key={v.name}>
                  <td>
                    {v.name} {v.input && <span className="badge">input</span>}
                  </td>
                  <td>
                    <code>{v.type}</code>
                  </td>
                  <td>
                    <code>{v.repr}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const KIND_LABEL = { nominal: 'normal', alternate: 'alternate', boundary: 'boundary' } as const;

export function CheckResults({ graded, outcome, onOpenExercise }: { graded: GradedCheck; outcome: CheckOutcome | null; onOpenExercise?: (id: string) => void }) {
  if (graded.timeout)
    return (
      <div data-testid="check-results">
        <div className="check-summary fail" data-testid="check-summary">
          <XCircle size={18} /> The program did not finish, so the Check could not complete.
        </div>
        <ErrorBox error={graded.timeout} />
      </div>
    );
  if (graded.syntaxError)
    return (
      <div data-testid="check-results">
        <div className="check-summary fail" data-testid="check-summary">
          <XCircle size={18} /> Python could not read your code, so no fixtures ran.
        </div>
        <ErrorBox error={graded.syntaxError} />
      </div>
    );
  const variantId = outcome?.decision?.level === 'guided' && outcome.decision.assisted ? exerciseById(outcome.attempt.exerciseId)?.independentVariantId : undefined;
  return (
    <div data-testid="check-results">
      <div className={`check-summary ${graded.passed ? 'pass' : 'fail'}`} data-testid="check-summary">
        {graded.passed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        <strong>
          {graded.passed ? 'All requirements met' : `${graded.passedCount} of ${graded.totalCount} requirements met`}
        </strong>
        <span className="small">across {graded.cases.length} fixtures</span>
      </div>

      {outcome?.decision && (
        <div className="evidence-note" data-testid="evidence-note">
          <div className="row" style={{ marginBottom: 4 }}>
            <Info size={15} />
            <strong>
              {LEVEL_LABEL[outcome.decision.level]} evidence recorded
              {outcome.newEvidence.length ? ` for ${outcome.newEvidence.map((e) => skillById(e.skillId)?.title ?? e.skillId).join(' · ')}` : ''}
            </strong>
          </div>
          <div className="small">{outcome.decision.reason}</div>
          {variantId && onOpenExercise && (
            <div className="small" style={{ marginTop: 6 }}>
              To show this independently, try the fresh task:{' '}
              <button className="btn btn-sm" onClick={() => onOpenExercise(variantId)}>
                {exerciseById(variantId)?.title}
              </button>
            </div>
          )}
          {outcome.scheduledReviews.length > 0 && (
            <div className="small muted" style={{ marginTop: 6 }}>
              First review scheduled for {new Date(outcome.scheduledReviews[0].dueAt).toLocaleDateString()}.
            </div>
          )}
        </div>
      )}

      {graded.requirements.map(({ requirement: r, passed, failures, staticDetail }) => (
        <div key={r.id} className={`req ${passed ? 'req-pass' : 'req-fail'}`} data-testid={`req-${r.id}`} data-passed={passed}>
          <div className="req-head">
            <span className="req-icon" aria-hidden>
              {passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            </span>
            <span style={{ flex: 1 }}>
              <span className="sr-only">{passed ? 'Passed: ' : 'Not yet: '}</span>
              {r.label}
            </span>
            <span className="badge">{r.concept}</span>
          </div>
          {!passed && (
            <div className="req-detail">
              {staticDetail?.observed && (
                <div className="cmp">
                  <span className="muted">Found</span>
                  <pre>{staticDetail.observed}</pre>
                </div>
              )}
              {failures.slice(0, 3).map((f) => (
                <div key={f.caseId} style={{ marginBottom: 8 }}>
                  <div className="small">
                    <span className="badge">{KIND_LABEL[f.caseKind]}</span> {f.caseLabel}
                  </div>
                  <div className="cmp">
                    {f.diff?.firstDiffLine ? (
                      <>
                        <span className="muted">Line {f.diff.firstDiffLine}</span>
                        <span className="small">
                          expected <pre style={{ display: 'inline-block' }}>{f.diff.expectedLine ?? '(no line)'}</pre> but got{' '}
                          <pre style={{ display: 'inline-block' }}>{f.diff.observedLine ?? '(no line)'}</pre>
                        </span>
                      </>
                    ) : null}
                    {f.expected !== undefined && (
                      <>
                        <span className="muted">Expected</span>
                        <pre>{f.expected || '(empty)'}</pre>
                      </>
                    )}
                    {f.observed !== undefined && (
                      <>
                        <span className="muted">Observed</span>
                        <pre>{f.observed || '(nothing)'}</pre>
                      </>
                    )}
                  </div>
                  {f.note && <div className="small muted">{f.note}</div>}
                  {f.diff?.note && <div className="small muted">{f.diff.note}</div>}
                </div>
              ))}
              {failures.length > 3 && <div className="small muted">…and {failures.length - 3} more fixtures.</div>}
              <div className="small">
                <strong>Nudge:</strong> {r.feedback}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
