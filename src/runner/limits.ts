export type RunnerKind = 'python' | 'native';
export type RunnerStage = 'startup' | 'execution';
export function executionTimeoutMs(kind:RunnerKind,stage:RunnerStage):number {
  if(stage==='startup')return kind==='native'?60_000:20_000;
  return kind==='native'?5_000:15_000;
}
export function startDeadline(timeoutMs:number,onTimeout:()=>void,schedule:(callback:()=>void,delay:number)=>ReturnType<typeof setTimeout>=setTimeout):()=>void {
  const timer=schedule(onTimeout,timeoutMs);
  return ()=>clearTimeout(timer);
}
