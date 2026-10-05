import { describe, expect, it, vi } from 'vitest';
import { executionTimeoutMs, startDeadline } from './limits';

describe('runner time limits',()=>{
  it('sets a short execution deadline after runtime startup',()=>{
    expect(executionTimeoutMs('native','execution')).toBe(5000);
    expect(executionTimeoutMs('python','execution')).toBe(15000);
    expect(executionTimeoutMs('native','startup')).toBeGreaterThan(executionTimeoutMs('native','execution'));
  });
  it('can cancel a deadline when the worker finishes',()=>{
    vi.useFakeTimers();const stop=vi.fn();const cancel=startDeadline(5000,stop);cancel();vi.advanceTimersByTime(5001);expect(stop).not.toHaveBeenCalled();vi.useRealTimers();
  });
  it('fires when a worker exceeds its deadline',()=>{
    vi.useFakeTimers();const stop=vi.fn();startDeadline(5000,stop);vi.advanceTimersByTime(5000);expect(stop).toHaveBeenCalledOnce();vi.useRealTimers();
  });
});
