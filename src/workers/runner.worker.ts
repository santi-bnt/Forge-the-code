/// <reference lib="webworker" />
import { loadPyodide } from 'pyodide';
import { buildNativeSource, pythonTestScript } from '../runner/harness';
import { compileAndRunNative } from '../runner/native';
import type { RunnerRequest, RunnerResponse } from '../runner';
import type { RunResult, TestCase, TestResult } from '../types';

const send = (response: RunnerResponse) => self.postMessage(response);
const status = (message: string) => self.postMessage({ status: message });
const resultsFromOutput = (tests: TestCase[], lines: string[]): TestResult[] => tests.map((test, index) => {
  const received = lines[index]?.trim() ?? '(no output)';
  return { input: test.input, expected: test.expected, received, hidden: test.hidden, passed: received === test.expected };
});

async function runPython(request: Extract<RunnerRequest, { kind: 'exercise' }>): Promise<RunResult> {
  status('Loading Python runtime…');
  const started = performance.now();
  const pyodide = await loadPyodide({ indexURL: new URL('/runtimes/pyodide/', self.location.origin).href });
  const output: string[] = [];
  pyodide.setStdout({ batched: line => output.push(line) });
  status('Running tests…');
  try {
    const raw = await pyodide.runPythonAsync(pythonTestScript(request.code, request.tests));
    const values = JSON.parse(raw as string) as { received?: string; error?: string }[];
    const results = request.tests.map((test, index): TestResult => {
      const value = values[index];
      return { input: test.input, expected: test.expected, received: value?.received ?? '(error)', error: value?.error, hidden: test.hidden, passed: value?.received === test.expected };
    });
    return { results, stdout: output.join('\n'), durationMs: Math.round(performance.now() - started) };
  } catch (error) {
    return { results: [], stdout: '', error: String(error), durationMs: Math.round(performance.now() - started) };
  }
}

async function runNative(request: RunnerRequest): Promise<RunnerResponse> {
  const started = performance.now();
  const embedded = request.kind === 'embedded';
  const language = embedded ? 'c' : request.language as 'c' | 'cpp';
  const source = embedded ? request.code : buildNativeSource(request.exercise, request.code, language, request.tests);
  const run = await compileAndRunNative(source, language, status);
  if (run.exitCode !== 0) return { error: `${run.stderr || run.stdout || `Exit code ${run.exitCode}`}` };
  if (embedded) return { events: run.stdout.split(/\r?\n/).filter(Boolean) };
  const tests = request.tests;
  const lines = run.stdout.trim().split(/\r?\n/);
  return { result: { results: resultsFromOutput(tests, lines), stdout: run.stdout, durationMs: Math.round(performance.now() - started) } };
}

self.onmessage = async event => {
  const request = event.data as RunnerRequest;
  try {
    if (request.kind === 'exercise' && request.language === 'python') send({ result: await runPython(request) });
    else send(await runNative(request));
  } catch (error) { send({ error: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}`.trim() : String(error) }); }
};
