import type { Progress } from '../types';
import { emptyAttempt, emptyProgress, normalizeProgress } from './db';
import { supabase } from '../auth/supabase';

type Row = Record<string, unknown>;
function client() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; }
export function mergeCloudProgress(local:Progress,remote:Progress):Progress {
  const attempts={...local.attempts};for(const [id,right] of Object.entries(remote.attempts)){const left=attempts[id]??emptyAttempt();attempts[id]={runs:Math.max(left.runs,right.runs),submits:Math.max(left.submits,right.submits),failedSubmits:Math.max(left.failedSubmits,right.failedSubmits),hintsUsed:Math.max(left.hintsUsed,right.hintsUsed),solutionViewed:left.solutionViewed||right.solutionViewed,lastAttempt:[left.lastAttempt,right.lastAttempt].filter(Boolean).sort().at(-1),solvedAt:[left.solvedAt,right.solvedAt].filter(Boolean).sort()[0]};}
  const localStamp=Date.parse(String(local.settings.updatedAt??''));const remoteStamp=Date.parse(String(remote.settings.updatedAt??''));const newerRemote=Number.isFinite(remoteStamp)&&(!Number.isFinite(localStamp)||remoteStamp>localStamp);
  return normalizeProgress({...local,completedLessons:[...new Set([...local.completedLessons,...remote.completedLessons])],solvedExercises:[...new Set([...local.solvedExercises,...remote.solvedExercises])],activeDays:[...new Set([...local.activeDays,...remote.activeDays])],bookmarks:[...new Set([...local.bookmarks,...remote.bookmarks])],attempts,drafts:newerRemote?{...local.drafts,...remote.drafts}:{...remote.drafts,...local.drafts},notes:newerRemote?{...local.notes,...remote.notes}:{...remote.notes,...local.notes},lastLesson:newerRemote?remote.lastLesson:local.lastLesson,lastTrack:newerRemote?remote.lastTrack:local.lastTrack,language:newerRemote?remote.language:local.language,settings:newerRemote?remote.settings:local.settings,streak:Math.max(local.streak,remote.streak),timeMinutes:Math.max(local.timeMinutes,remote.timeMinutes)});
}
function rows(progress:Progress,userId:string,updatedAt:string) {
  return {
    lessons:progress.completedLessons.map(lesson_id=>({user_id:userId,lesson_id,status:'completed',progress:100,completed_at:updatedAt,last_opened_at:updatedAt,updated_at:updatedAt})),
    exercises:Object.entries(progress.attempts).map(([exercise_id,a])=>({user_id:userId,exercise_id,status:progress.solvedExercises.includes(exercise_id)?'solved':'started',runs:a.runs,submissions:a.submits,failed_submits:a.failedSubmits,last_attempt:a.lastAttempt??null,hints_used:a.hintsUsed,solution_viewed:a.solutionViewed,solved_at:a.solvedAt??null,updated_at:updatedAt})),
    drafts:Object.entries(progress.drafts).map(([key,code])=>{const [exercise_id,language]=key.split(':');return {user_id:userId,exercise_id,language,code,updated_at:updatedAt};}),
    notes:Object.entries(progress.notes).map(([resource_id,content])=>({user_id:userId,resource_type:'lesson',resource_id,content,updated_at:updatedAt})),
    bookmarks:progress.bookmarks.map(id=>{const [resource_type,...parts]=id.split(':');return {user_id:userId,resource_type:parts.length?resource_type:'lesson',resource_id:parts.length?parts.join(':'):id,created_at:updatedAt};}),
    settings:{user_id:userId,settings:progress.settings,last_lesson:progress.lastLesson,last_track:progress.lastTrack,language:progress.language,streak:progress.streak,active_days:progress.activeDays,last_activity:progress.lastActivity,time_minutes:progress.timeMinutes,updated_at:updatedAt},
  };
}
export async function pushProgress(userId:string,progress:Progress):Promise<void>{
  const db=client();const stamp=new Date().toISOString();const data=rows(progress,userId,stamp);
  const operations=[
    db.from('lesson_progress').upsert(data.lessons,{onConflict:'user_id,lesson_id'}),
    db.from('exercise_progress').upsert(data.exercises,{onConflict:'user_id,exercise_id'}),
    db.from('code_drafts').upsert(data.drafts,{onConflict:'user_id,exercise_id,language'}),
    db.from('notes').upsert(data.notes,{onConflict:'user_id,resource_type,resource_id'}),
    db.from('bookmarks').upsert(data.bookmarks,{onConflict:'user_id,resource_type,resource_id'}),
    db.from('user_settings').upsert(data.settings,{onConflict:'user_id'}),
  ];
  const results=await Promise.all(operations);for(const result of results)if(result.error)throw result.error;
}
export async function pullProgress(userId:string):Promise<Progress>{const db=client();const tables=['lesson_progress','exercise_progress','code_drafts','notes','bookmarks','user_settings'] as const;const results=await Promise.all(tables.map(table=>db.from(table).select('*').eq('user_id',userId)));for(const result of results)if(result.error)throw result.error;const [lessons,exercises,drafts,notes,bookmarks,settings]=results.map(result=>(result.data??[]) as Row[]);const remote=structuredClone(emptyProgress);remote.completedLessons=lessons.filter(row=>row.status==='completed').map(row=>String(row.lesson_id));remote.solvedExercises=exercises.filter(row=>row.status==='solved').map(row=>String(row.exercise_id));remote.attempts=Object.fromEntries(exercises.map(row=>[String(row.exercise_id),{runs:Number(row.runs??0),submits:Number(row.submissions??0),failedSubmits:Number(row.failed_submits??0),hintsUsed:Number(row.hints_used??0),solutionViewed:Boolean(row.solution_viewed),lastAttempt:typeof row.last_attempt==='string'?row.last_attempt:undefined,solvedAt:typeof row.solved_at==='string'?row.solved_at:undefined}]));remote.drafts=Object.fromEntries(drafts.map(row=>[`${row.exercise_id}:${row.language}`,String(row.code??'')]));remote.notes=Object.fromEntries(notes.map(row=>[String(row.resource_id),String(row.content??'')]));remote.bookmarks=bookmarks.map(row=>row.resource_type==='lesson'?String(row.resource_id):`${row.resource_type}:${row.resource_id}`);const setting=settings[0];if(setting){remote.settings={...remote.settings,...(setting.settings as object??{})};remote.lastLesson=typeof setting.last_lesson==='string'?setting.last_lesson:undefined;remote.lastTrack=String(setting.last_track??remote.lastTrack) as Progress['lastTrack'];remote.language=String(setting.language??remote.language) as Progress['language'];remote.streak=Number(setting.streak??0);remote.activeDays=Array.isArray(setting.active_days)?setting.active_days as string[]:[];remote.lastActivity=typeof setting.last_activity==='string'?setting.last_activity:undefined;remote.timeMinutes=Number(setting.time_minutes??0);(remote.settings as Record<string,unknown>).updatedAt=setting.updated_at;}
return normalizeProgress(remote);}
