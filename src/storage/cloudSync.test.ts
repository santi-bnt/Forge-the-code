import { describe, expect, it } from 'vitest';
import { emptyProgress } from './db';
import { mergeCloudProgress } from './cloudSync';
import { emptyInterview } from '../interview/progress';

describe('cloud progress conflict merge',()=>{
  it('merges interview events idempotently and selects the newer individual draft', () => {
    const study = { problemId: 'stock-corrections', ms: 1000 };
    const local = { ...emptyProgress, settings: { ...emptyProgress.settings, interview: { ...emptyInterview,
      drafts: { problem: { code: 'local', updatedAt: 1 } }, study: { shared: study } } } };
    const remote = { ...emptyProgress, settings: { ...emptyProgress.settings, interview: { ...emptyInterview,
      drafts: { problem: { code: 'remote', updatedAt: 2 } }, study: { shared: study, remote: study } } } };
    const merged = mergeCloudProgress(local, remote);
    expect(merged.settings.interview?.drafts.problem.code).toBe('remote');
    expect(Object.keys(merged.settings.interview!.study)).toHaveLength(2);
    expect(mergeCloudProgress(merged, remote).settings.interview).toEqual(merged.settings.interview);
  });
  it('never removes completed work and chooses the newer draft while retaining max attempt counts',()=>{
    const local={...emptyProgress,completedLessons:['binary-search'],solvedExercises:['find-index'],attempts:{...emptyProgress.attempts,'find-index':{runs:7,submits:4,failedSubmits:2,hintsUsed:1,solutionViewed:false}},drafts:{'find-index:cpp':'new local'},settings:{...emptyProgress.settings,updatedAt:'2026-02-01T00:00:00.000Z'}};
    const remote={...emptyProgress,completedLessons:[],solvedExercises:[],attempts:{...emptyProgress.attempts,'find-index':{runs:3,submits:2,failedSubmits:1,hintsUsed:4,solutionViewed:true}},drafts:{'find-index:cpp':'old cloud'},settings:{...emptyProgress.settings,updatedAt:'2026-01-01T00:00:00.000Z'}};
    const merged=mergeCloudProgress(local,remote);
    expect(merged.completedLessons).toContain('binary-search');
    expect(merged.solvedExercises).toContain('find-index');
    expect(merged.attempts['find-index']).toMatchObject({runs:7,submits:4,hintsUsed:4,solutionViewed:true});
    expect(merged.drafts['find-index:cpp']).toBe('new local');
    const newerRemote={...remote,drafts:{'find-index:cpp':'new cloud'},settings:{...remote.settings,updatedAt:'2026-03-01T00:00:00.000Z'}};
    expect(mergeCloudProgress(local,newerRemote).drafts['find-index:cpp']).toBe('new cloud');
  });
});
