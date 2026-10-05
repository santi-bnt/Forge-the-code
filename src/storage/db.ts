import type { AttemptStats, Backup, ImportMode, Progress } from '../types';

const DB_NAME = 'codebook';
const STORE = 'state';
export const emptyProgress: Progress = { completedLessons: [], solvedExercises: [], attempts: {}, drafts: {}, bookmarks: [], notes: {}, streak: 0, activeDays: [], language: 'python', lastTrack: 'algorithms', timeMinutes: 0, settings: { theme: 'dark', preferredLanguage: 'python' } };
export const emptyAttempt = (): AttemptStats => ({ runs: 0, submits: 0, failedSubmits: 0, hintsUsed: 0, solutionViewed: false });

export function normalizeProgress(value: unknown): Progress {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const attempts = raw.attempts && typeof raw.attempts === 'object' ? raw.attempts as Record<string, unknown> : {};
  return {
    ...emptyProgress, ...raw,
    completedLessons: Array.isArray(raw.completedLessons) ? raw.completedLessons.filter((x):x is string=>typeof x==='string') : [],
    solvedExercises: Array.isArray(raw.solvedExercises) ? raw.solvedExercises.filter((x):x is string=>typeof x==='string') : [],
    activeDays: Array.isArray(raw.activeDays) ? raw.activeDays.filter((x):x is string=>typeof x==='string') : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.filter((x):x is string=>typeof x==='string') : [],
    drafts: objectStrings(raw.drafts), notes: objectStrings(raw.notes),
    attempts: Object.fromEntries(Object.entries(attempts).map(([key,item])=>[key, typeof item==='number' ? {...emptyAttempt(),runs:item} : {...emptyAttempt(),...(item && typeof item==='object' ? item : {})}])),
    settings: {...emptyProgress.settings,...(raw.settings && typeof raw.settings==='object' ? raw.settings : {})},
    lastTrack: ['algorithms','python','c','cpp','embedded'].includes(String(raw.lastTrack)) ? raw.lastTrack as Progress['lastTrack'] : 'algorithms',
    language: ['python','c','cpp'].includes(String(raw.language)) ? raw.language as Progress['language'] : 'python',
  };
}
function objectStrings(value: unknown): Record<string,string> { return value && typeof value==='object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter((pair): pair is [string,string]=>typeof pair[1]==='string')) : {}; }
function openDb(): Promise<IDBDatabase> { return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}); }
export async function getProgress(): Promise<Progress> { const db=await openDb(); return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get('progress');request.onsuccess=()=>{resolve(normalizeProgress(request.result));db.close();};request.onerror=()=>{reject(request.error);db.close();};}); }
export async function saveProgress(progress: Progress): Promise<void> { const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(progress,'progress');tx.oncomplete=()=>{resolve();db.close();};tx.onerror=()=>{reject(tx.error);db.close();};}); }
export function recordActivity(progress: Progress): Progress { const now=new Date(); const today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10); const days=[...new Set([...progress.activeDays,today])];let streak=0;for(let offset=0;offset<days.length;offset++){const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-offset);if(days.includes(date.toISOString().slice(0,10)))streak++;else break;}return {...progress,activeDays:days,streak,lastActivity:now.toISOString()}; }
export function makeBackup(progress:Progress):Backup { return {format:'codebook-backup',version:2,exportedAt:new Date().toISOString(),data:progress}; }
export function parseBackup(text:string):Progress { let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw new Error('El archivo no es JSON válido.');}if(!parsed || typeof parsed!=='object')throw new Error('Backup inválido.');const backup=parsed as Record<string,unknown>;if(backup.format==='codebook-progress' && backup.version===1 && backup.progress)return normalizeProgress(backup.progress);if(backup.format!=='codebook-backup'||backup.version!==2||!backup.data||typeof backup.data!=='object')throw new Error('Formato o versión de backup no compatibles.');const data=backup.data as Record<string,unknown>;if(!Array.isArray(data.completedLessons)||!Array.isArray(data.solvedExercises)||!data.attempts||typeof data.attempts!=='object')throw new Error('Faltan datos de progreso en el backup.');return normalizeProgress(data); }
export function mergeProgress(current:Progress,incoming:Progress):Progress {const attempts={...current.attempts};for(const [id,value] of Object.entries(incoming.attempts)){const prior=attempts[id]??emptyAttempt();attempts[id]={runs:prior.runs+value.runs,submits:prior.submits+value.submits,failedSubmits:prior.failedSubmits+value.failedSubmits,hintsUsed:Math.max(prior.hintsUsed,value.hintsUsed),solutionViewed:prior.solutionViewed||value.solutionViewed,lastAttempt:[prior.lastAttempt,value.lastAttempt].filter(Boolean).sort().at(-1),solvedAt:[prior.solvedAt,value.solvedAt].filter(Boolean).sort()[0]};}return {...current,completedLessons:[...new Set([...current.completedLessons,...incoming.completedLessons])],solvedExercises:[...new Set([...current.solvedExercises,...incoming.solvedExercises])],activeDays:[...new Set([...current.activeDays,...incoming.activeDays])],bookmarks:[...new Set([...current.bookmarks,...incoming.bookmarks])],attempts,drafts:{...incoming.drafts,...current.drafts},notes:{...incoming.notes,...current.notes},timeMinutes:Math.max(current.timeMinutes,incoming.timeMinutes)}; }
export function exportProgress(progress:Progress) {const blob=new Blob([JSON.stringify(makeBackup(progress),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='codebook-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function importProgress(file:File,current:Progress,mode:ImportMode):Promise<Progress> {const incoming=parseBackup(await file.text());const value=mode==='merge'?mergeProgress(current,incoming):incoming;await saveProgress(value);return value;}
