window.BOJEditor = window.BOJEditor || {};

const PISTON_BASE_URL = 'https://boj-piston-proxy.dhxl50.workers.dev';

async function executeCode({ language, version, sourceCode, stdin, runTimeout = 5000 }) {
  const response = await fetch(`${PISTON_BASE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language,
      version,
      files: [{ content: sourceCode }],
      stdin: stdin || '',
      run_timeout: runTimeout,
      compile_timeout: 10000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Piston API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  return {
    language: result.language,
    version: result.version,
    stdout: result.run?.stdout ?? '',
    stderr: result.run?.stderr ?? '',
    output: result.run?.output ?? '',
    exitCode: result.run?.code,
    signal: result.run?.signal,
    compileOutput: result.compile?.output ?? null,
    compileExitCode: result.compile?.code ?? null,
  };
}

async function runTestCases({ language, version, sourceCode, testCases, runTimeout = 5000 }) {
  const results = [];

  for (const tc of testCases) {
    try {
      const result = await executeCode({
        language,
        version,
        sourceCode,
        stdin: tc.input,
        runTimeout,
      });

      const actualTrimmed = result.stdout.trimEnd();
      const expectedTrimmed = tc.expectedOutput.trimEnd();
      const passed = result.exitCode === 0 && actualTrimmed === expectedTrimmed;

      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.stdout,
        stderr: result.stderr,
        passed,
        exitCode: result.exitCode,
        signal: result.signal,
        compileOutput: result.compileOutput,
        compileExitCode: result.compileExitCode,
      });
    } catch (error) {
      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: '',
        stderr: error.message,
        passed: false,
        exitCode: null,
        signal: null,
        compileOutput: null,
        compileExitCode: null,
        error: true,
      });
    }
  }

  return results;
}

window.BOJEditor.Piston = { executeCode, runTestCases };
