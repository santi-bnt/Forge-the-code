import type { RunResult } from '../types';

export type Attempt = {
  id: string; problemId: string; mockId?: string; at: number; kind: 'run' | 'submit';
  success: boolean; result: RunResult;
};
export type Mock = { id: string; startedAt: number; finishedAt?: number; reviewedAt?: number; problemIds: string[] };
export type InterviewProgress = {
  drafts: Record<string, { code: string; updatedAt: number }>;
  attempts: Record<string, Attempt>;
  study: Record<string, { problemId: string; ms: number }>;
  mocks: Record<string, Mock>;
  lastProblem?: { id: string; at: number };
};

export const emptyInterview: InterviewProgress = { drafts: {}, attempts: {}, study: {}, mocks: {} };

export function normalizeInterview(value: unknown): InterviewProgress {
  const record = (item: unknown): Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
  const validTime = (item: unknown): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0;
  const entries = <Entry,>(items: unknown, valid: (entry: Record<string, unknown>) => boolean): Record<string, Entry> =>
    Object.fromEntries(Object.entries(record(items)).filter(([, entry]) => valid(record(entry)))) as Record<string, Entry>;
  const raw = record(value);
  const drafts = entries<InterviewProgress['drafts'][string]>(raw.drafts, entry => typeof entry.code === 'string' && validTime(entry.updatedAt));
  const study = entries<InterviewProgress['study'][string]>(raw.study, entry => typeof entry.problemId === 'string' && validTime(entry.ms));
  const mocks = entries<Mock>(raw.mocks, entry => typeof entry.id === 'string' && validTime(entry.startedAt)
    && (entry.finishedAt === undefined || validTime(entry.finishedAt))
    && (entry.reviewedAt === undefined || validTime(entry.reviewedAt))
    && Array.isArray(entry.problemIds) && entry.problemIds.length === 4 && new Set(entry.problemIds).size === 4
    && entry.problemIds.every(id => typeof id === 'string'));
  const attempts = entries<Attempt>(raw.attempts, entry => {
    const result = record(entry.result);
    return typeof entry.id === 'string' && typeof entry.problemId === 'string' && validTime(entry.at)
      && (entry.mockId === undefined || typeof entry.mockId === 'string')
      && (entry.kind === 'run' || entry.kind === 'submit') && typeof entry.success === 'boolean'
      && typeof result.stdout === 'string' && validTime(result.durationMs)
      && (result.error === undefined || typeof result.error === 'string')
      && Array.isArray(result.results) && result.results.every(item => {
        const test = record(item);
        return typeof test.input === 'string' && typeof test.expected === 'string' && typeof test.received === 'string'
          && typeof test.passed === 'boolean' && (test.error === undefined || typeof test.error === 'string');
      });
  });
  const last = record(raw.lastProblem);
  return { drafts, study, mocks, attempts, lastProblem: typeof last.id === 'string' && validTime(last.at) ? { id: last.id, at: last.at } : undefined };
}
export const mockDuration = 70 * 60_000;
export const mockDeadline = (mock: Mock) => mock.startedAt + mockDuration;
export const remainingTime = (mock: Mock, now: number) => mock.finishedAt !== undefined ? 0 : Math.min(mockDuration, Math.max(0, mockDeadline(mock) - now));

const mockSets = [
  ['replayed-events', 'first-eligible-bin', 'clean-catalog', 'next-busier-slot'],
  ['query-inventory', 'nearby-shelves', 'seller-leader', 'category-trails'],
  ['stock-corrections', 'warehouse-border', 'dispatch-capacity', 'aisle-route'],
];
export function createMock(id: string, now: number, previousCount: number): Mock {
  return { id, startedAt: now, problemIds: mockSets[previousCount % mockSets.length] };
}

export function finishMock(mock: Mock, now: number): Mock {
  return { ...mock, finishedAt: mock.finishedAt ?? Math.max(mock.startedAt, Math.min(now, mockDeadline(mock))) };
}

export function mockAttempts(mock: Mock, attempts: Attempt[]) {
  const cutoff = mock.finishedAt ?? mockDeadline(mock);
  return attempts.filter(attempt => attempt.mockId === mock.id && mock.problemIds.includes(attempt.problemId)
    && attempt.at >= mock.startedAt && attempt.at < mockDeadline(mock) && attempt.at <= cutoff);
}

export const passedSubmission = (attempt: Attempt) => attempt.kind === 'submit' && attempt.success;
export const draftKey = (problemId: string, mockId?: string) => mockId ? `${mockId}/${problemId}` : problemId;
export const getAttempts = (progress: InterviewProgress) => Object.values(progress.attempts).sort((a, b) => b.at - a.at);

export function mergeInterview(left = emptyInterview, right = emptyInterview): InterviewProgress {
  const drafts = { ...left.drafts };
  for (const [key, draft] of Object.entries(right.drafts)) {
    if (!drafts[key] || drafts[key].updatedAt < draft.updatedAt) drafts[key] = draft;
  }
  const mocks = { ...left.mocks };
  for (const [id, mock] of Object.entries(right.mocks)) {
    const prior = mocks[id];
    const earliestFinish = Math.min(prior?.finishedAt ?? Infinity, mock.finishedAt ?? Infinity);
    mocks[id] = prior ? {
      ...prior,
      finishedAt: Number.isFinite(earliestFinish) ? earliestFinish : undefined,
      reviewedAt: Math.max(prior.reviewedAt ?? 0, mock.reviewedAt ?? 0) || undefined,
    } : mock;
  }
  return {
    drafts, mocks, attempts: { ...right.attempts, ...left.attempts }, study: { ...right.study, ...left.study },
    lastProblem: (left.lastProblem?.at ?? 0) >= (right.lastProblem?.at ?? 0) ? left.lastProblem : right.lastProblem,
  };
}

export function summarize(progress: InterviewProgress) {
  const all = getAttempts(progress);
  const attempts = all.filter(attempt => {
    if (!attempt.mockId) return true;
    const mock = progress.mocks[attempt.mockId];
    return mock && mockAttempts(mock, [attempt]).length > 0;
  });
  const attempted = new Set(attempts.map(attempt => attempt.problemId));
  const solved = new Set(attempts.filter(passedSubmission).map(attempt => attempt.problemId));
  const submissions = attempts.filter(attempt => attempt.kind === 'submit');
  const studied = new Map<string, number>();
  for (const entry of Object.values(progress.study)) {
    studied.set(entry.problemId, (studied.get(entry.problemId) ?? 0) + entry.ms);
  }
  const studyTotal = [...studied.values()].reduce((sum, ms) => sum + ms, 0);
  return {
    attempts, attempted, solved,
    successRate: submissions.length ? Math.round(100 * submissions.filter(passedSubmission).length / submissions.length) : undefined,
    averageTime: studied.size ? studyTotal / studied.size : undefined,
  };
}
