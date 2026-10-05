import type { Exercise, Language, RunResult, TestCase } from '../types';
import { executionTimeoutMs, startDeadline } from './limits';

export type RunnerRequest = { kind: 'exercise'; exercise: Exercise; code: string; language: Language; tests: TestCase[] } | { kind: 'embedded'; code: string; button: boolean };
export type RunnerResponse = { result?: RunResult; events?: string[]; error?: string };

export function runInWorker(request: RunnerRequest, onStatus?: (status: string) => void): Promise<RunnerResponse> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('../workers/runner.worker.ts', import.meta.url), { type: 'module' });
    const kind = request.kind === 'embedded' || request.language !== 'python' ? 'native' : 'python';
    let cancelDeadline=startDeadline(executionTimeoutMs(kind,'startup'),stop,(callback,delay)=>window.setTimeout(callback,delay));
    function stop() { worker.terminate(); resolve({ error: 'Time Limit Exceeded. The runner worker was stopped.' }); }
    worker.onmessage = event => {
      if (event.data?.status) {
        onStatus?.(event.data.status);
        if (event.data.status.includes('Running tests')) { cancelDeadline();cancelDeadline=startDeadline(executionTimeoutMs(kind,'execution'),stop,(callback,delay)=>window.setTimeout(callback,delay)); }
        return;
      }
      cancelDeadline(); worker.terminate(); resolve(event.data as RunnerResponse);
    };
    worker.onerror = event => { cancelDeadline(); worker.terminate(); resolve({ error: event.message || 'Runner failed.' }); };
    worker.postMessage(request);
  });
}
