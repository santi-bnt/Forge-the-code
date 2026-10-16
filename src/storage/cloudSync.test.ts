import { describe, expect, it } from 'vitest';
import { emptyProgress } from './db';
import { mergeCloudProgress } from './cloudSync';

describe('cloud progress conflict merge',()=>{
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
