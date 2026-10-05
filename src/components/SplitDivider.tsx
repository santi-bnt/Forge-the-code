import { useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

export function SplitDivider(){
  const [value,setValue]=useState(50);
  function setSplit(root:HTMLElement,clientX:number){const bounds=root.getBoundingClientRect();const percent=Math.max(35,Math.min(65,((clientX-bounds.left)/bounds.width)*100));root.style.setProperty('--lesson-split',`${percent}%`);setValue(percent);}
  function onPointerDown(event:ReactPointerEvent<HTMLDivElement>){const root=event.currentTarget.parentElement;if(!root)return;event.currentTarget.setPointerCapture(event.pointerId);setSplit(root,event.clientX);const move=(next:PointerEvent)=>setSplit(root,next.clientX);const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop,{once:true});}
  function onKeyDown(event:KeyboardEvent<HTMLDivElement>){if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();const root=event.currentTarget.parentElement;if(!root)return;const next=Math.max(35,Math.min(65,value+(event.key==='ArrowRight'?5:-5)));root.style.setProperty('--lesson-split',`${next}%`);setValue(next);}
  return <div className="workspace-divider" role="separator" aria-label="Resize lesson and editor panes" aria-orientation="vertical" aria-valuemin={35} aria-valuemax={65} aria-valuenow={Math.round(value)} tabIndex={0} onPointerDown={onPointerDown} onKeyDown={onKeyDown}/>;
}
