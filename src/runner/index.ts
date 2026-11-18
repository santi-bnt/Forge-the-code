import type { Exercise, Language, RunResult, TestCase } from '../types';
import { executionTimeoutMs, startDeadline } from './limits';

export type RunnerRequest = { kind: 'exercise'; exercise: Exercise; code: string; language: Language; tests: TestCase[] } | { kind: 'embedded'; code: string; button: boolean } | { kind: 'interview'; code: string; tests: TestCase[] };
export type RunnerResponse = { result?: RunResult; events?: string[]; error?: string };

export function runInWorker(request: RunnerRequest, onStatus?: (status: string) => void, signal?: AbortSignal): Promise<RunnerResponse> {
  return new Promise((resolve) => {
    if (signal?.aborted) { resolve({ error: 'Execution cancelled.' }); return; }
    const worker = new Worker(new URL('../workers/runner.worker.ts', import.meta.url), { type: 'module' });
    const kind = request.kind === 'interview' || request.kind === 'exercise' && request.language === 'python' ? 'python' : 'native';
    let cancelDeadline=startDeadline(executionTimeoutMs(kind,'startup'),stop,(callback,delay)=>window.setTimeout(callback,delay));
    function finish(response: RunnerResponse) {
      cancelDeadline();
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      resolve(response);
    }
    function cancel() { finish({ error: 'Execution cancelled.' }); }
    function stop() { finish({ error: 'Time Limit Exceeded. The runner worker was stopped.' }); }
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onmessage = event => {
      if (event.data?.status) {
        onStatus?.(event.data.status);
        if (event.data.status.includes('Running tests')) { cancelDeadline();cancelDeadline=startDeadline(executionTimeoutMs(kind,'execution'),stop,(callback,delay)=>window.setTimeout(callback,delay)); }
        return;
      }
      finish(event.data as RunnerResponse);
    };
    worker.onerror = event => finish({ error: event.message || 'Runner failed.' });
    worker.postMessage(request);
  });
}
