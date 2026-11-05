(() => {
'use strict';
const API='https://pllugo-robo-production.up.railway.app/api/mobile-jms';
let closeCurrent=()=>{};
window.PllugoMobileLogin={close:()=>closeCurrent(),open};
async function open({client,flow,isAllowed=()=>true,onClose=()=>{},getRunStatus=async()=>null}) {
  closeCurrent();
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:5000;background:#fff;display:flex;flex-direction:column;font:14px system-ui;color:#18181b;padding:12px;box-sizing:border-box';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Validação J&T pelo celular');
  modal.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px"><strong>Validar J&T — <span class="unit"></span></strong><button class="close" type="button">Fechar</button></div><p class="status" role="status">Preparando controle seguro…</p><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="mode" type="button">Modo: controlar</button><label>Zoom <input class="zoom" type="range" min="1" max="3" step="0.25" value="1" style="width:100px"></label></div><p style="font-size:12px">No modo controlar, arraste com o dedo. Para ampliar e posicionar a tela, use o zoom e o modo mover tela.</p><div class="viewport" style="flex:1;overflow:auto;min-height:100px;background:#eee;border:1px solid #ddd"><img class="screen" alt="Sessão J&T aguardando validação manual" draggable="false" style="display:block;width:100%;max-width:none;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none"></div><form style="display:flex;gap:6px;margin-top:10px"><input class="code" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="Código do e-mail" aria-label="Código do e-mail" style="min-width:0;flex:1"><button type="submit">Inserir código</button></form><small>Se pedir e-mail, toque primeiro no campo da sessão. Depois insira o código aqui e confirme na tela.</small>';
  modal.querySelector('.unit').textContent=flow==='jms-sla-motorista-rbp'?'Ribeirão Pires':'Mauá';
  document.body.append(modal);
  const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const img=modal.querySelector('.screen'),status=modal.querySelector('.status');
  const device=crypto.randomUUID();let id,closed=false,stopped=false,pointer=null,events=[],sending=false,pan=false,objectUrl=null,gesture=false;
  let frameTimer,inputTimer;
  const headers=async()=>{
    if(!isAllowed())throw new Error('Acesso encerrado. Entre novamente.');
    const result=await client.auth.getSession();
    if(!result.data?.session?.access_token)throw new Error('Entre novamente no dashboard.');
    return {'Authorization':'Bearer '+result.data.session.access_token,'X-Control-ID':device,'Content-Type':'application/json'};
  };
  async function request(path,body){
    const r=await fetch(API+path,{method:body===undefined?'GET':'POST',headers:await headers(),body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!r.ok){const data=await r.json().catch(()=>({}));throw Object.assign(new Error(data.error||'Conexão interrompida. Feche e abra novamente.'),{status:r.status});}
    return r;
  }
  async function leave(){if(id)try{await request('/'+id+'/leave',{});}catch{}}
  function finish(){
    if(closed)return;closed=true;clearTimeout(frameTimer);clearInterval(inputTimer);events=[];
    void leave();modal.remove();document.body.style.overflow=previousOverflow;
    if(objectUrl)URL.revokeObjectURL(objectUrl);window.removeEventListener('pagehide',finish);document.removeEventListener('visibilitychange',visibility);
    onClose();
  }
  closeCurrent=finish;
  function stop(message){stopped=true;status.textContent=message;img.style.pointerEvents='none';clearTimeout(frameTimer);clearInterval(inputTimer);events=[];void leave();}
  async function flush(){
    if(sending||!events.length||closed||!id)return;
    sending=true;const batch=events.splice(0,24);
    try{await request('/'+id+'/input',{events:batch});}
    catch(error){stop(error.message);}
    finally{sending=false;if(events.length&&!closed)void flush();}
  }
  function enqueue(e){
    if(closed||stopped||!id)return;
    if(events.length>=40){stop('Conexão lenta. Feche e abra novamente para continuar.');return;}
    events.push(e);if(e.type!=='move')void flush();
  }
  function point(event,type){const r=img.getBoundingClientRect();return {type,x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};}
  img.addEventListener('pointerdown',event=>{
    if(pan||pointer!==null||!id||!img.naturalWidth)return;
    event.preventDefault();pointer=event.pointerId;gesture=true;img.setPointerCapture(pointer);enqueue(point(event,'down'));
  });
  img.addEventListener('pointermove',event=>{if(event.pointerId===pointer&&!pan){event.preventDefault();enqueue(point(event,'move'));}});
  function release(event){if(event.pointerId!==pointer)return;event.preventDefault();enqueue(event.type==='pointerup'?point(event,'up'):{type:'cancel'});pointer=null;gesture=false;}
  img.addEventListener('pointerup',release);img.addEventListener('pointercancel',release);
  img.addEventListener('lostpointercapture',()=>{if(pointer!==null){pointer=null;gesture=false;enqueue({type:'cancel'});}});
  const visibility=()=>{if(document.hidden){pointer=null;gesture=false;enqueue({type:'cancel'});void flush();}};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',finish);
  modal.querySelector('.close').onclick=finish;
  modal.querySelector('.mode').onclick=event=>{enqueue({type:'cancel'});pointer=null;gesture=false;pan=!pan;img.style.touchAction=pan?'auto':'none';event.target.textContent=pan?'Modo: mover tela':'Modo: controlar';};
  modal.querySelector('.zoom').oninput=event=>{if(!gesture)img.style.width=(100*Number(event.target.value))+'%';};
  modal.querySelector('form').onsubmit=event=>{event.preventDefault();const input=modal.querySelector('.code'),value=input.value.trim();input.value='';if(!/^\d{4,10}$/.test(value)){status.textContent='Informe o código numérico recebido por e-mail.';return;}enqueue({type:'code',value});};
  async function frame(){
    if(closed||stopped)return;
    if(!isAllowed()){finish();return;}
    if(!document.hidden)try{
      const response=await request('/'+id+'/frame');const blob=await response.blob();
      if(closed||stopped||!isAllowed())return;
      const old=objectUrl;objectUrl=URL.createObjectURL(blob);img.src=objectUrl;if(old)URL.revokeObjectURL(old);
      status.textContent='Sessão conectada. Resolva a validação na imagem abaixo.';
    }catch(error){stop(error.status===410?'A validação terminou. O robô pode continuar; confira o painel.':error.message);return;}
    frameTimer=setTimeout(frame,600);
  }
  try{
    const deadline=Date.now()+120000;
    while(!closed&&Date.now()<deadline){
      try{const response=await request('/claim',{flow});id=(await response.json()).id;break;}
      catch(error){
        if(error.status!==425)throw error;
        const run=await getRunStatus();
        if(closed)return;
        if(run==='completed'){stop('Acesso liberado sem intervenção. O robô seguiu o fluxo; confira o painel.');return;}
        if(run==='error'||run==='needs_attention')throw new Error('A execução terminou. Feche esta tela e consulte o painel para tentar novamente.');
        status.textContent='Aguardando o robô abrir a validação…';await new Promise(r=>setTimeout(r,1500));
      }
    }
    if(closed){void leave();return;}
    if(!id)throw new Error('A validação não apareceu. Consulte o painel; o acesso pode ter sido liberado automaticamente.');
    inputTimer=setInterval(()=>void flush(),100);void frame();
  }catch(error){if(!closed)stop(error.message);}
}
})();
