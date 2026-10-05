import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyProgress, getProgress, mergeProgress, parseBackup, saveProgress, makeBackup } from './db';

describe('local progress and backup',()=>{
  beforeEach(async()=>saveProgress(emptyProgress));
  it('round trips progress through IndexedDB and normalizes old attempt counters',async()=>{
    await saveProgress({...emptyProgress,completedLessons:['arrays'],attempts:{'array-sum':{...emptyProgress.attempts['array-sum'],runs:3}}});
    expect((await getProgress()).completedLessons).toEqual(['arrays']);
    expect((await getProgress()).attempts['array-sum'].runs).toBe(3);
  });
  it('accepts a version 1 backup and validates its payload',()=>{
    const old={format:'codebook-progress',version:1,progress:{completedLessons:['arrays'],solvedExercises:[],attempts:{},drafts:{}}};
    expect(parseBackup(JSON.stringify(old)).completedLessons).toEqual(['arrays']);
    expect(()=>parseBackup('{broken')).toThrow('JSON');
    expect(()=>parseBackup(JSON.stringify({format:'codebook-backup',version:99,data:{}}))).toThrow('versión');
  });
  it('exports v2 and merges without dropping local drafts or notes',()=>{
    const current={...emptyProgress,bookmarks:['arrays'],drafts:{'x:c':'local'},notes:{arrays:'local note'}};
    const imported={...emptyProgress,completedLessons:['arrays'],drafts:{'x:c':'backup','y:c':'other'},notes:{arrays:'backup note'},bookmarks:['arrays','python-basics']};
    expect(makeBackup(imported).version).toBe(2);
    const merged=mergeProgress(current,imported);
    expect(merged.completedLessons).toEqual(['arrays']);
    expect(merged.bookmarks).toEqual(['arrays','python-basics']);
    expect(merged.drafts).toEqual({'x:c':'local','y:c':'other'});
    expect(merged.notes.arrays).toBe('local note');
  });
});
