import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { claimLegacyProgress, clearSyncQueueEntry, emptyProgress, getLegacyMigrationStatus, getProgress, getSyncQueue, markLegacyIgnored, mergeProgress, parseBackup, saveProgress, makeBackup } from './db';

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
  it('keeps user data isolated and preserves the unclaimed legacy record',async()=>{
    await saveProgress({...emptyProgress,completedLessons:['legacy-array'],notes:{legacy:'old note'},drafts:{'search:c':'old draft'}});
    expect(await getLegacyMigrationStatus('user-a')).toBe('pending');
    const claimed=await claimLegacyProgress('user-a');
    expect(claimed.completedLessons).toContain('legacy-array');
    await saveProgress({...emptyProgress,completedLessons:['user-b-lesson']},'user-b');
    expect((await getProgress('user-b')).completedLessons).toEqual(['user-b-lesson']);
    expect((await getProgress('user-a')).completedLessons).toContain('legacy-array');
    expect((await getProgress()).completedLessons).toContain('legacy-array');
    await claimLegacyProgress('user-a');
    expect((await getProgress('user-a')).notes.legacy).toBe('old note');
  });
  it('keeps declined legacy progress recoverable and records the choice per account',async()=>{
    await saveProgress({...emptyProgress,bookmarks:['arrays']});
    await markLegacyIgnored('user-c');
    expect(await getLegacyMigrationStatus('user-c')).toBe('fresh');
    expect((await getProgress()).bookmarks).toEqual(['arrays']);
    expect(await getLegacyMigrationStatus('user-d')).toBe('pending');
  });
  it('coalesces queued local writes per user and clears only after confirmed sync',async()=>{
    await saveProgress({...emptyProgress,notes:{lesson:'first'}},'queue-user');
    const inFlight=await getSyncQueue('queue-user');
    await saveProgress({...emptyProgress,notes:{lesson:'latest'}},'queue-user');
    const queued=await getSyncQueue('queue-user');
    expect(queued).toHaveLength(1);
    expect(queued[0].value.userId).toBe('queue-user');
    expect(queued[0].value.id).not.toBe(inFlight[0].value.id);
    await clearSyncQueueEntry(inFlight[0].key,String(inFlight[0].value.id));
    expect(await getSyncQueue('queue-user')).toHaveLength(1);
    await clearSyncQueueEntry(queued[0].key,String(queued[0].value.id));
    expect(await getSyncQueue('queue-user')).toHaveLength(0);
    expect((await getSyncQueue('different-user'))).toHaveLength(0);
  });
});
