import { describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { compareCases, equalOutput, interviewScript, type PythonCase } from './evaluator';
import { problems, problemById, topics } from './problems';
import { createMock, emptyInterview, finishMock, mergeInterview, mockAttempts, mockDeadline, mockDuration, normalizeInterview, remainingTime, summarize, type Attempt } from './progress';
import type { TestCase } from '../types';

describe('Interview Prep evaluator', () => {
  it('compares JSON values without confusing booleans, order, or numeric formatting', () => {
    expect(equalOutput('[1.0, 2]', '[1,2]')).toBe(true);
    expect(equalOutput('{"b":2,"a":1}', '{"a":1,"b":2}')).toBe(true);
    expect(equalOutput('false', '0')).toBe(false);
    expect(equalOutput('"1"', '1')).toBe(false);
    expect(equalOutput('[2,1]', '[1,2]')).toBe(false);
    expect(equalOutput('null', '[]')).toBe(false);
    expect(equalOutput('invalid', 'null')).toBe(false);
  });
  it('keeps argument lists, ordered output, types, visibility and errors distinct', () => {
    const cases: TestCase[] = [
      { input: '[[1,2]]', expected: '[1,2]' },
      { input: '[null,2]', expected: 'null', hidden: true },
      { input: '[0]', expected: '0' },
      { input: '[1]', expected: '1' },
      { input: '[]', expected: 'null' },
    ];
    const results = compareCases(cases, [
      { received: '[2,1]' }, { received: 'null' }, { received: 'false' }, { error: 'ValueError' },
    ]);
    expect(results.map(result => result.passed)).toEqual([false, true, false, false, false]);
    expect(results[1].hidden).toBe(true);
    expect(results[3].error).toBe('ValueError');
    expect(results[4].error).toBeTruthy();
  });

  it('verifies all 20 reference solutions in the actual Python runtime and captures exceptions', async () => {
    const pyodide = await loadPyodide();
    expect(problems).toHaveLength(20);
    expect(problemById.size).toBe(20);
    expect(topics).toHaveLength(9);
    for (const problem of problems) {
      expect(problem.tests.some(test => !test.hidden)).toBe(true);
      expect(problem.tests.some(test => test.hidden)).toBe(true);
      const output = await pyodide.runPythonAsync(interviewScript(problem.solution, problem.tests)) as string;
      const results = compareCases(problem.tests, JSON.parse(output) as PythonCase[]);
      expect(results.filter(result => !result.passed), problem.title).toEqual([]);
    }
    const cases = [{ input: '["café",2]', expected: '2' }, { input: '["bad",0]', expected: '0' }];
    const printed: string[] = [];
    pyodide.setStdout({ batched: line => printed.push(line) });
    const raw = await pyodide.runPythonAsync(interviewScript('def solve(text, n):\n    print(text)\n    return 4 // n', cases)) as string;
    expect(printed).toEqual(['café', 'bad']);
    const results = compareCases(cases, JSON.parse(raw) as PythonCase[]);
    expect(results[0].passed).toBe(true);
    expect(results[1].error).toContain('ZeroDivisionError');
    await expect(pyodide.runPythonAsync(interviewScript('def solve(', cases))).rejects.toThrow('SyntaxError');
  }, 30_000);
});

describe('Mock Assessment', () => {
  it('recovers safely from incomplete or malformed stored interview data', () => {
    expect(normalizeInterview(null)).toMatchObject(emptyInterview);
    const recovered = normalizeInterview({ drafts: { bad: null, good: { code: '', updatedAt: 0 } },
      attempts: { broken: { result: null } }, mocks: { broken: { problemIds: 'not an array' } },
      study: { broken: { problemId: 'x', ms: -1 } } });
    expect(recovered.drafts).toEqual({ good: { code: '', updatedAt: 0 } });
    expect(recovered.attempts).toEqual({});
    expect(recovered.mocks).toEqual({});
    expect(recovered.study).toEqual({});
    expect(summarize(recovered).solved.size).toBe(0);
  });
  const started = 100_000;
  const mock = createMock('mock', started, 0);
  const attempt = (id: string, at: number, extra: Partial<Attempt> = {}): Attempt => ({
    id, at, mockId: mock.id, problemId: mock.problemIds[0], kind: 'submit', success: true,
    result: { results: [], stdout: '', durationMs: 0 }, ...extra,
  });

  it('has four distinct known problems and resumes from the original 70 minute deadline', () => {
    const restored = JSON.parse(JSON.stringify(mock)) as typeof mock;
    expect(new Set(restored.problemIds).size).toBe(4);
    expect(restored.problemIds.every(id => problemById.has(id))).toBe(true);
    expect(remainingTime(restored, started)).toBe(mockDuration);
    expect(remainingTime(restored, started + 60_000)).toBe(69 * 60_000);
    expect(remainingTime(restored, started + mockDuration + 1)).toBe(0);
  });

  it('excludes late, unrelated, and invalid attempts and preserves early completion', () => {
    const finished = finishMock(mock, started + 200);
    const submissions = [
      attempt('accepted', started + 100), attempt('late', started + 201),
      attempt('other', started + 100, { mockId: 'other' }),
      attempt('wrong-problem', started + 100, { problemId: 'nested-shipments' }),
      attempt('at-deadline', mockDeadline(mock)), attempt('before', started - 1),
    ];
    expect(mockAttempts(finished, submissions).map(item => item.id)).toEqual(['accepted']);
    expect(mockAttempts(mock, submissions).map(item => item.id)).toEqual(['accepted', 'late']);
    expect(finishMock(finished, started + 500).finishedAt).toBe(started + 200);
    expect(finishMock(mock, mockDeadline(mock) + 50).finishedAt).toBe(mockDeadline(mock));
  });

  it('deduplicates synchronized events and counts only successful Submit attempts as solved', () => {
    const run = attempt('run', started + 1, { kind: 'run' });
    const fail = attempt('fail', started + 2, { success: false });
    const pass = attempt('pass', started + 3);
    const local = { ...emptyInterview, attempts: { run, fail }, mocks: { mock }, study: { time: { problemId: run.problemId, ms: 3500 } } };
    const remote = { ...emptyInterview, attempts: { run, pass }, mocks: { mock: finishMock(mock, started + 100) } };
    expect(summarize(local).solved.size).toBe(0);
    const merged = mergeInterview(local, remote);
    expect(merged.mocks.mock.finishedAt).toBe(started + 100);
    expect(summarize(merged)).toMatchObject({ successRate: 50, averageTime: 3500 });
    expect(summarize(merged).attempts).toHaveLength(3);
    expect(summarize(merged).solved.size).toBe(1);
  });
});
