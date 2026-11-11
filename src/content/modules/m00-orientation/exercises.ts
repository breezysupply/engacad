import type { Exercise } from '../../../curriculum/types';

export const W01_EXERCISES: Exercise[] = [
  {
    id: 'w01-ex-reachable',
    lessonId: 'w01-l1',
    mode: 'guided',
    title: 'Report a reachable service',
    estimatedMinutes: 10,
    skills: ['orient.run-check', 'py.print-basics'],
    prompt: `The checker gives your program one input, \`service_name\`, holding the name of a service as text.

Print **one line** saying that the service is reachable. When \`service_name\` is \`"beacon-api"\` the output must be:

\`\`\`text
beacon-api is reachable
\`\`\`

Check will also try other service names — including one that contains a space — so your line has to come from the input, not from typing the example name.`,
    protectedInputs: ['service_name'],
    inputNotes: { service_name: 'the name of a service, as text (str)' },
    starter: `# Inputs provided by the checker (use them; don't reassign them):
#   service_name  -> the name of a service, as text
#
# Task: print one line saying the service is reachable, e.g.
#   beacon-api is reachable

print("replace me")
`,
    cases: [
      { id: 'nominal', label: 'service_name = "beacon-api"', kind: 'nominal', inputs: { service_name: '"beacon-api"' }, expect: { stdout: 'beacon-api is reachable\n' } },
      { id: 'alternate', label: 'service_name = "dns-resolver"', kind: 'alternate', inputs: { service_name: '"dns-resolver"' }, expect: { stdout: 'dns-resolver is reachable\n' } },
      { id: 'boundary-space', label: 'service_name = "billing gateway" (contains a space)', kind: 'boundary', inputs: { service_name: '"billing gateway"' }, expect: { stdout: 'billing gateway is reachable\n' } },
    ],
    requirements: [
      { id: 'runs', kind: 'runs', label: 'The program runs without an error', concept: 'Running a program', feedback: 'Fix the error first: read the last line of the traceback, then the line number above it.' },
      { id: 'output', kind: 'stdout', match: 'lines', label: 'Prints "<service_name> is reachable" for every input', concept: 'print() with several values', feedback: 'Compare your line with the expected one character by character. print() puts exactly one space between comma-separated values.' },
      { id: 'uses-input', kind: 'uses', construct: 'name:service_name', label: 'Uses the provided service_name input', concept: 'Variables hold values', feedback: 'Your code never reads service_name. Use the name without quotes to mean “the value it holds”.' },
      { id: 'protected', kind: 'protected', label: 'Does not reassign service_name', concept: 'Provided inputs', feedback: 'The checker sets service_name for each case. If you assign it yourself, your program ignores the real input.' },
    ],
    hints: [
      { level: 1, text: 'Press Run on the starter code. What does it print? Which part of the expected line should change when the service changes, and which part stays the same?' },
      { level: 2, text: 'print() accepts several values separated by commas and prints them with one space between them. Text in quotes is printed literally; a name without quotes is replaced by the value it holds.' },
      { level: 3, text: 'You need exactly two values inside print(...): the variable service_name (no quotes) and the text "is reachable" (in quotes).' },
    ],
    solution: {
      source: `print(service_name, "is reachable")\n`,
      explanation: '`service_name` has no quotes, so Python looks up the value it holds — "beacon-api" in the default case. `"is reachable"` is literal text. print() joins the two values with a single space and ends the line. Because the first value comes from the input, the same line of code works for "dns-resolver" and "billing gateway" too.',
    },
    negativeExamples: [
      { label: 'Hardcoded example name', source: 'print("beacon-api is reachable")\n' },
      { label: 'Variable name in quotes (prints the word, not the value)', source: 'print("service_name is reachable")\n' },
      { label: 'Missing space between values', source: 'print(service_name + "is reachable")\n' },
      { label: 'Reassigns the input', source: 'service_name = "beacon-api"\nprint(service_name, "is reachable")\n' },
    ],
    allowedHintLevel: 3,
    independentVariantId: 'w01-ex-service-card',
  },
  {
    id: 'w01-ex-service-card',
    lessonId: 'w01-l1',
    mode: 'independent',
    title: 'Independent: a two-line service card',
    estimatedMinutes: 10,
    skills: ['orient.run-check', 'py.print-basics'],
    prompt: `This time there are **two** inputs: \`service_name\` and \`region\` (both text).

Print a two-line service card. For \`service_name = "beacon-api"\` and \`region = "eu-west-1"\` the output must be exactly:

\`\`\`text
service: beacon-api
region: eu-west-1
\`\`\`

This is an independent task. You may use the level 1 hint and still earn **Applied** evidence; using a deeper hint or revealing the solution records the pass as **Guided** practice instead.`,
    protectedInputs: ['service_name', 'region'],
    inputNotes: { service_name: 'the name of a service (str)', region: 'the region it runs in (str) — may be empty if unknown' },
    starter: `# Inputs provided by the checker:
#   service_name  -> e.g. "beacon-api"
#   region        -> e.g. "eu-west-1" (may be empty if unknown)
#
# Print a two-line service card:
#   service: beacon-api
#   region: eu-west-1

`,
    cases: [
      { id: 'nominal', label: 'beacon-api in eu-west-1', kind: 'nominal', inputs: { service_name: '"beacon-api"', region: '"eu-west-1"' }, expect: { stdout: 'service: beacon-api\nregion: eu-west-1\n' } },
      { id: 'alternate', label: 'dns-resolver in us-east-2', kind: 'alternate', inputs: { service_name: '"dns-resolver"', region: '"us-east-2"' }, expect: { stdout: 'service: dns-resolver\nregion: us-east-2\n' } },
      { id: 'boundary-empty-region', label: 'region is empty ("")', kind: 'boundary', inputs: { service_name: '"edge-proxy"', region: '""' }, expect: { stdout: 'service: edge-proxy\nregion:\n' } },
    ],
    requirements: [
      { id: 'runs', kind: 'runs', label: 'The program runs without an error', concept: 'Running a program', feedback: 'Fix the error first: read the last line of the traceback.' },
      { id: 'output', kind: 'stdout', match: 'lines', label: 'Prints both card lines, in order, for every input', concept: 'print() with several values', feedback: 'Each print() call produces one line. Check the label text (including the colon) and the order of the two lines.' },
      { id: 'uses-service', kind: 'uses', construct: 'name:service_name', label: 'Uses the service_name input', concept: 'Variables hold values', feedback: 'Read the service name from service_name rather than typing it.' },
      { id: 'uses-region', kind: 'uses', construct: 'name:region', label: 'Uses the region input', concept: 'Variables hold values', feedback: 'Read the region from region rather than typing it.' },
      { id: 'protected', kind: 'protected', label: 'Does not reassign the inputs', concept: 'Provided inputs', feedback: 'The checker supplies service_name and region; assigning them yourself hides the real values.' },
    ],
    hints: [
      { level: 1, text: 'Two lines of output usually means two print() calls. Write the first line, Run it, then add the second.' },
      { level: 2, text: 'Each line is a label in quotes followed by a value from a variable — the same pattern as the guided exercise.' },
      { level: 3, text: 'print("service:", service_name) produces the first line. Write the matching call for the region.' },
    ],
    solution: {
      source: `print("service:", service_name)\nprint("region:", region)\n`,
      explanation: 'Each print() call writes one line. The label is literal text in quotes; the value comes from the provided variable, so the same program works for any service and region. When region is empty, print still writes the label; the trailing space it adds is ignored by this checker because trailing spaces were not part of what this task teaches.',
    },
    negativeExamples: [
      { label: 'Hardcoded card', source: 'print("service: beacon-api")\nprint("region: eu-west-1")\n' },
      { label: 'Lines swapped', source: 'print("region:", region)\nprint("service:", service_name)\n' },
      { label: 'Everything on one line', source: 'print("service:", service_name, "region:", region)\n' },
    ],
    allowedHintLevel: 1,
  },
  // ───── review prompts (delayed transfer) ─────
  {
    id: 'w01-rev-connecting',
    lessonId: 'w01-l1',
    mode: 'review',
    title: 'Review: connection message',
    estimatedMinutes: 5,
    skills: ['py.print-basics'],
    prompt: `Inputs: \`host\` (text) and \`port\` (a whole number, \`int\`).

Print one line. For \`host = "db-01"\` and \`port = 5432\`:

\`\`\`text
connecting to db-01 on port 5432
\`\`\``,
    protectedInputs: ['host', 'port'],
    inputNotes: { host: 'a host name (str)', port: 'a TCP port number (int)' },
    starter: `# Inputs: host (str), port (int)\n# Print: connecting to <host> on port <port>\n\n`,
    cases: [
      { id: 'nominal', label: 'db-01:5432', kind: 'nominal', inputs: { host: '"db-01"', port: '5432' }, expect: { stdout: 'connecting to db-01 on port 5432\n' } },
      { id: 'alternate', label: 'cache:6379', kind: 'alternate', inputs: { host: '"cache"', port: '6379' }, expect: { stdout: 'connecting to cache on port 6379\n' } },
      { id: 'boundary', label: 'highest port 65535', kind: 'boundary', inputs: { host: '"edge.internal"', port: '65535' }, expect: { stdout: 'connecting to edge.internal on port 65535\n' } },
    ],
    requirements: [
      { id: 'runs', kind: 'runs', label: 'Runs without an error', concept: 'Running a program', feedback: 'If you see a TypeError, you may be joining text and a number with +. print() with commas accepts both.' },
      { id: 'output', kind: 'stdout', match: 'lines', label: 'Prints the connection message for every input', concept: 'print() with several values', feedback: 'print() accepts text and numbers together when they are separated by commas.' },
      { id: 'protected', kind: 'protected', label: 'Does not reassign the inputs', concept: 'Provided inputs', feedback: 'Use host and port as given.' },
    ],
    hints: [
      { level: 1, text: 'Which words are fixed, and which come from inputs? There are four pieces.' },
      { level: 2, text: 'print() can mix text and numbers when they are separated by commas.' },
      { level: 3, text: 'print("connecting to", host, "on port", port)' },
    ],
    solution: { source: 'print("connecting to", host, "on port", port)\n', explanation: 'Four comma-separated values; print converts the int port to text and separates everything with single spaces.' },
    negativeExamples: [
      { label: 'Hardcoded', source: 'print("connecting to db-01 on port 5432")\n' },
      { label: 'String + int TypeError', source: 'print("connecting to " + host + " on port " + port)\n' },
    ],
    allowedHintLevel: 1,
  },
  {
    id: 'w01-rev-status-arrow',
    lessonId: 'w01-l1',
    mode: 'review',
    title: 'Review: check status lines',
    estimatedMinutes: 5,
    skills: ['py.print-basics'],
    prompt: `Inputs: \`check_name\` and \`status\` (both text).

Print two lines: the check name on the first line, and the status after an arrow on the second. For \`check_name = "disk-usage"\`, \`status = "OK"\`:

\`\`\`text
check: disk-usage
  -> OK
\`\`\`

Note the two leading spaces before the arrow.`,
    protectedInputs: ['check_name', 'status'],
    inputNotes: { check_name: 'name of a health check (str)', status: 'its status (str)' },
    starter: `# Inputs: check_name (str), status (str)\n\n`,
    cases: [
      { id: 'nominal', label: 'disk-usage OK', kind: 'nominal', inputs: { check_name: '"disk-usage"', status: '"OK"' }, expect: { stdout: 'check: disk-usage\n  -> OK\n' } },
      { id: 'alternate', label: 'tls-expiry WARN', kind: 'alternate', inputs: { check_name: '"tls-expiry"', status: '"WARN"' }, expect: { stdout: 'check: tls-expiry\n  -> WARN\n' } },
      { id: 'boundary', label: 'status with spaces', kind: 'boundary', inputs: { check_name: '"dns"', status: '"FAILED (timeout)"' }, expect: { stdout: 'check: dns\n  -> FAILED (timeout)\n' } },
    ],
    requirements: [
      { id: 'runs', kind: 'runs', label: 'Runs without an error', concept: 'Running a program', feedback: 'Read the traceback’s last line.' },
      { id: 'output', kind: 'stdout', match: 'lines', label: 'Prints both lines for every input, with the indent', concept: 'print() with several values', feedback: 'Leading spaces are part of the text: put them inside the quotes.' },
      { id: 'protected', kind: 'protected', label: 'Does not reassign the inputs', concept: 'Provided inputs', feedback: 'Use check_name and status as given.' },
    ],
    hints: [
      { level: 1, text: 'Two lines → two print() calls.' },
      { level: 2, text: 'Spaces inside quotes are printed exactly as written.' },
      { level: 3, text: 'print("  ->", status) for the second line.' },
    ],
    solution: { source: 'print("check:", check_name)\nprint("  ->", status)\n', explanation: 'The indent is literal text inside the quotes; print adds one space between the arrow and the status value.' },
    negativeExamples: [
      { label: 'Missing indent', source: 'print("check:", check_name)\nprint("->", status)\n' },
      { label: 'Hardcoded', source: 'print("check: disk-usage")\nprint("  -> OK")\n' },
    ],
    allowedHintLevel: 1,
  },
];
