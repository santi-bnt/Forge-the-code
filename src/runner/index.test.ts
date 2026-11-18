import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInWorker } from './index';

class TestWorker {
  static latest: TestWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { message: string }) => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { TestWorker.latest = this; }
}

describe('Interview Python worker lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('Worker', TestWorker);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  const request = { kind: 'interview' as const, code: 'def solve():\n    return 1', tests: [{ input: '[]', expected: '1' }] };

  it('terminates the worker when Python exceeds its execution timeout', async () => {
    const pending = runInWorker(request);
    const worker = TestWorker.latest;
    expect(worker.postMessage).toHaveBeenCalledWith(request);
    vi.advanceTimersByTime(10_000);
    worker.onmessage?.({ data: { status: 'Running tests…' } });
    vi.advanceTimersByTime(14_999);
    expect(worker.terminate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect((await pending).error).toContain('Time Limit Exceeded');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('cancels execution on navigation or a manual abort', async () => {
    const controller = new AbortController();
    const pending = runInWorker(request, undefined, controller.signal);
    const worker = TestWorker.latest;
    controller.abort();
    expect((await pending).error).toContain('cancelled');
    vi.advanceTimersByTime(60_000);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('returns actual results and clears the outstanding timeout', async () => {
    const pending = runInWorker(request);
    const worker = TestWorker.latest;
    const response = { result: { results: [], stdout: 'output', durationMs: 12 } };
    worker.onmessage?.({ data: response });
    expect(await pending).toEqual(response);
    vi.advanceTimersByTime(60_000);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
