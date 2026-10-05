import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import type { Progress } from '../types';
import { saveProgress } from '../storage/db';

export function PwaUpdatePrompt({ progress }: { progress: Progress }) {
  const [registration,setRegistration]=useState<ServiceWorkerRegistration|null>(null);
  const [available,setAvailable]=useState(false);
  const [updating,setUpdating]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!('serviceWorker'in navigator))return;
    const hadController=Boolean(navigator.serviceWorker.controller);
    const reload=()=>{if(hadController)window.location.reload();};
    navigator.serviceWorker.addEventListener('controllerchange',reload);
    let current:ServiceWorkerRegistration|undefined;
    let installing:ServiceWorker|null=null;
    let onInstallingState:(()=>void)|undefined;
    const check=()=>{if(current){setRegistration(current);if(current.waiting&&navigator.serviceWorker.controller)setAvailable(true);}};
    void navigator.serviceWorker.register('/sw.js').then(value=>{
      current=value;setRegistration(value);check();
      value.addEventListener('updatefound',()=>{
        installing=value?.installing??null;
        onInstallingState=()=>{
          if(installing?.state==='installed'&&navigator.serviceWorker.controller){setRegistration(value);setAvailable(true);}
        };
        if(onInstallingState)installing?.addEventListener('statechange',onInstallingState);
      });
    }).catch(()=>{});
    return()=>{navigator.serviceWorker.removeEventListener('controllerchange',reload);if(onInstallingState)installing?.removeEventListener('statechange',onInstallingState);};
  },[]);
  async function apply(){
    if(!registration?.waiting)return;
    setUpdating(true);setError('');
    try{await saveProgress(progress);registration.waiting.postMessage({type:'SKIP_WAITING'});}
    catch(reason){setUpdating(false);setError(reason instanceof Error?reason.message:'Progress could not be saved.');}
  }
  if(!available)return null;
  return <aside className="pwa-update-toast" role="status"><div><strong>A new Forge version is ready.</strong><span>{error||'Your local progress will be saved before updating.'}</span></div><button className="button primary" onClick={()=>void apply()} disabled={updating}>{updating?<><RefreshCw size={15} className="spin"/>Saving…</>:<>Update now <RefreshCw size={15}/></>}</button><button className="icon-button" aria-label="Dismiss update notice" onClick={()=>setAvailable(false)}><X size={17}/></button></aside>;
}
