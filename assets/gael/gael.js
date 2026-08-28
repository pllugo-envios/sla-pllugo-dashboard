/* ==================================================================
   GAEL DIGITAL — motor v2
   Pllugo Envios · personagem assistente para ferramentas web

   Este arquivo é o MOTOR. Ele não sabe nada sobre nenhuma ferramenta
   específica: personagem, animação, física, fala, balão e interação.
   Tudo que é do seu produto — de onde vêm os dados, quais perguntas
   ele responde, para onde ele aponta — mora no gael.config.js.

   Uso:
     <script src="assets/gael/gael.config.js"></script>
     <script src="assets/gael/gael.js" defer></script>

   Não edite este arquivo para adaptar a uma ferramenta nova.
   Edite o config.
   ================================================================== */
(() => {
'use strict';
if (window.Gael) return;

/* ------------------------------------------------------------------
   1. CONFIGURAÇÃO — padrões + merge com window.GAEL_CONFIG
   ------------------------------------------------------------------ */
const SELF = (document.currentScript && document.currentScript.src) ||
             (document.querySelector('script[src*="gael.js"]') || {}).src || '';
const BASE = SELF ? SELF.replace(/[^/]+$/, '') : 'assets/gael/';

const DEFAULTS = {
  assets:{
    path: BASE,
    ext: '.webp',
    model: BASE + '../models/gael.glb',
    poses:{
      idle:'gael-idle', thinking:'gael-thinking', analyzing:'gael-analyzing',
      greeting:'gael-greeting', pointing:'gael-pointing', success:'gael-success',
      celebrating:'gael-celebrating', alert:'gael-alert'
    },
    eyeLine:{ _default:0.792 }
  },
  character:{
    heightVh:0.24, heightMin:130, heightMax:260,
    entry:'right',        // 'right' | 'left' | número (px do eixo x)
    mirror:'moving',      // 'moving' | 'always' | 'never' — espelhar o sprite
    ground:14,            // distância dos pés até a base da janela
    zIndex:45
  },
  behavior:{ chatter:false, wander:true, minTalkGap:25000 },
  sound:{ enabled:true, volume:1 },
  dock:{ enabled:true, label:'Pergunte ao Gael', placeholder:'Digite sua pergunta…',
         submitLabel:'Enviar', position:'right' },
  toggle:{ container:'.topbar-actions', className:'', label:'🦊 Gael', remember:true },
  speech:{ typingSpeed:52, minDuration:3200, maxDuration:11000 },
  data:{ fields:{}, ready:null, emptyMessage:'Ainda não tenho dado carregado nesta tela.' },
  sections:{},          // seletor -> { click:[seletores de aba], scroll:true }
  intents:[],           // base de perguntas
  fallback:'Não entendi. Pode perguntar de outro jeito?',
  greeting:null,        // string, template ou função(dados)
  greetingWaitMs:12000, // quanto esperar o dado aparecer antes de falar
  watchers:[],          // reações automáticas a mudanças na tela
  ask:null,             // async (pergunta, dados) => {text,type,point} — sobrepõe intents
  debug:false
};

function merge(base, over){
  const out=Array.isArray(base)?base.slice():Object.assign({},base);
  for(const k in over){
    const v=over[k];
    if(v && typeof v==='object' && !Array.isArray(v) && typeof v!=='function' &&
       base[k] && typeof base[k]==='object' && !Array.isArray(base[k])) out[k]=merge(base[k],v);
    else out[k]=v;
  }
  return out;
}
const CFG = merge(DEFAULTS, window.GAEL_CONFIG || {});

const STATE_POSE = {
  IDLE:'idle', THINKING:'thinking', ANALYZING:'analyzing', LISTENING:'idle',
  TALKING:'analyzing', WALKING:'idle', RUNNING:'idle', HAPPY:'success',
  CELEBRATING:'celebrating', ALERT:'alert', WARNING:'alert', POINTING:'pointing',
  GREETING:'greeting', WORKING:'idle', CONFUSED:'thinking', SUCCESS:'success',
  DRAGGING:'greeting', DROPPED:'idle', SLEEPY:'thinking', CURIOUS:'thinking'
};
const STATE_PRIORITY = {
  IDLE:0, SLEEPY:0, WORKING:1, CURIOUS:1, WALKING:1, RUNNING:1, POINTING:2,
  ANALYZING:2, HAPPY:2, SUCCESS:2, GREETING:2, CONFUSED:2, DROPPED:2,
  THINKING:3, LISTENING:3, TALKING:4, DRAGGING:5, WARNING:5, ALERT:6, CELEBRATING:6
};

const SPRITE_AR = 600/816;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEV = /[?&]gael=dev/.test(location.search) || CFG.debug;

/* ------------------------------------------------------------------
   2. UTILITÁRIOS — math, tween e spring próprios (sem GSAP)
   ------------------------------------------------------------------ */
const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const lerp  = (a,b,t)=> a+(b-a)*t;
const rand  = (a,b)=> a+Math.random()*(b-a);
const pick  = a => a[(Math.random()*a.length)|0];
const damp  = (c,t,l,dt)=> lerp(c,t,1-Math.exp(-l*dt));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const norm  = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

const pctBR = v => (v==null||!isFinite(v)) ? '—' : v.toFixed(1).replace('.',',')+'%';
const numBR = v => (v==null||!isFinite(v)) ? '—' : Number(v).toLocaleString('pt-BR');

class Spring {
  constructor(v=0,{stiffness=170,damping=18}={}){ this.v=v; this.target=v; this.vel=0; this.k=stiffness; this.d=damping; }
  step(dt){ const a=(this.target-this.v)*this.k-this.vel*this.d; this.vel+=a*dt; this.v+=this.vel*dt; return this.v; }
}

/* ------------------------------------------------------------------
   3. CSS E DOM
   ------------------------------------------------------------------ */
const CSS = `
#gael-layer{position:fixed;inset:0;z-index:${CFG.character.zIndex};pointer-events:none;
  --gael-orange:#FF7A29;--gael-red:#F04A4F;--gael-ink:#18181B;--gael-line:#E8E8EC;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
#gael-root{position:absolute;top:0;left:0;will-change:transform;transform:translate3d(-9999px,-9999px,0)}
#gael-canvas{display:block;pointer-events:none}
#gael-shadow{position:absolute;left:50%;border-radius:50%;pointer-events:none;will-change:transform,opacity;
  background:radial-gradient(ellipse at center,rgba(24,24,27,.30) 0%,rgba(24,24,27,.14) 45%,rgba(24,24,27,0) 72%)}
#gael-hit{position:absolute;cursor:grab;pointer-events:auto;touch-action:none;border-radius:40% 40% 34% 34%}
#gael-hit.dragging{cursor:grabbing}
#gael-layer .gael-dust{position:absolute;width:7px;height:7px;border-radius:50%;background:rgba(24,24,27,.15);opacity:0;pointer-events:none}

#gael-bubble{position:absolute;top:0;left:0;max-width:min(330px,72vw);pointer-events:auto;
  background:#fff;color:var(--gael-ink);border:1px solid var(--gael-line);border-radius:16px;
  padding:12px 15px;box-shadow:0 12px 32px rgba(15,15,17,.13);font-size:13.5px;line-height:1.45;
  opacity:0;transform:translate3d(-9999px,-9999px,0) scale(.92);transform-origin:bottom left;
  will-change:transform,opacity;transition:opacity .18s ease}
#gael-bubble .gael-tip{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;
  display:block;margin-bottom:4px;color:var(--gael-orange)}
#gael-bubble .gael-caret{position:absolute;width:12px;height:12px;background:#fff;border:1px solid var(--gael-line);
  border-top:0;border-left:0;transform:rotate(45deg);bottom:-7px;left:26px}
#gael-bubble[data-side="below"] .gael-caret{bottom:auto;top:-7px;transform:rotate(225deg)}
#gael-bubble[data-type="warning"]{border-color:#FBE2B5;background:#FEF9F0}
#gael-bubble[data-type="warning"] .gael-caret{border-color:#FBE2B5;background:#FEF9F0}
#gael-bubble[data-type="warning"] .gael-tip{color:#D98309}
#gael-bubble[data-type="critical"]{border-color:#F5B0B2;background:#FFF6F6}
#gael-bubble[data-type="critical"] .gael-caret{border-color:#F5B0B2;background:#FFF6F6}
#gael-bubble[data-type="critical"] .gael-tip{color:var(--gael-red)}
#gael-bubble[data-type="success"]{border-color:#C7EFDB;background:#F4FCF8}
#gael-bubble[data-type="success"] .gael-caret{border-color:#C7EFDB;background:#F4FCF8}
#gael-bubble[data-type="success"] .gael-tip{color:#16A66D}
#gael-bubble[data-type="info"] .gael-tip{color:#717179}
#gael-bubble b{font-weight:700}
#gael-bubble .gael-cursor{display:inline-block;width:2px;height:1em;background:var(--gael-orange);
  vertical-align:-2px;margin-left:1px;animation:gael-cb .9s steps(1) infinite}
@keyframes gael-cb{50%{opacity:0}}

#gael-dock{position:fixed;bottom:18px;z-index:${CFG.character.zIndex+1};display:flex;align-items:center;gap:6px;
  background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border:1px solid #E8E8EC;
  border-radius:12px;padding:6px;box-shadow:0 8px 24px rgba(15,15,17,.10);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
#gael-dock[data-pos="right"]{right:18px}
#gael-dock[data-pos="left"]{left:18px}
#gael-dock[data-pos="center"]{left:50%;transform:translateX(-50%)}
#gael-dock button{font:inherit;font-size:13px;font-weight:600;border:0;background:transparent;
  color:#3F3F46;padding:7px 12px;border-radius:8px;cursor:pointer;white-space:nowrap}
#gael-dock button:hover{background:#F4F4F6}
#gael-dock #gael-send{background:#F04A4F;color:#fff;padding:7px 14px}
#gael-dock #gael-ask{border:0;background:transparent;font:inherit;font-size:13.5px;color:#18181B;
  width:232px;padding:0 8px;outline:none}
#gael-dock[data-open="false"] #gael-ask,#gael-dock[data-open="false"] #gael-send{display:none}
#gael-dock[data-open="true"] #gael-open{display:none}

.gael-focus{outline:2px solid var(--gael-orange,#FF7A29) !important;outline-offset:3px;border-radius:12px;
  animation:gael-glow 1.6s ease-out infinite}
@keyframes gael-glow{0%{box-shadow:0 0 0 0 rgba(255,122,41,.30)}100%{box-shadow:0 0 0 12px rgba(255,122,41,0)}}

#gael-dev{position:fixed;right:18px;bottom:70px;z-index:${CFG.character.zIndex+1};display:grid;
  grid-template-columns:1fr 1fr;gap:5px;width:230px;background:rgba(255,255,255,.96);
  border:1px solid #E8E8EC;border-radius:12px;padding:10px;box-shadow:0 8px 24px rgba(15,15,17,.10)}
#gael-dev button{font-size:12px;padding:6px;border-radius:7px;border:1px solid #E8E8EC;background:#fff;cursor:pointer}
#gael-dev h4{grid-column:1/-1;margin:0 0 2px;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#A4A4AB}
@media (max-width:640px){
  #gael-dock{bottom:10px}
  #gael-dock[data-pos="right"]{right:10px}
  #gael-dock #gael-ask{width:150px}
}
@media (prefers-reduced-motion:reduce){
  .gael-focus{animation:none}
  #gael-bubble .gael-cursor{animation:none}
}`;

function injectDOM(){
  const style=document.createElement('style');
  style.id='gael-styles'; style.textContent=CSS;
  document.head.appendChild(style);

  const layer=document.createElement('div');
  layer.id='gael-layer';
  layer.innerHTML=
    '<div id="gael-root">'+
      '<div id="gael-shadow"></div><canvas id="gael-canvas"></canvas>'+
      '<div id="gael-hit" role="button" tabindex="0" aria-label="Gael, assistente. Ative para conversar."></div>'+
    '</div>'+
    '<div id="gael-bubble" role="status" aria-live="polite">'+
      '<span class="gael-caret"></span><span id="gael-text"></span></div>';
  document.body.appendChild(layer);

  let dock=null;
  if(CFG.dock.enabled){
    dock=document.createElement('div');
    dock.id='gael-dock'; dock.dataset.open='false'; dock.dataset.pos=CFG.dock.position;
    dock.innerHTML=
      `<button id="gael-open">${CFG.dock.label}</button>`+
      `<input id="gael-ask" type="text" autocomplete="off" placeholder="${CFG.dock.placeholder}" aria-label="${CFG.dock.label}">`+
      `<button id="gael-send">${CFG.dock.submitLabel}</button>`;
    document.body.appendChild(dock);
  }
  return {layer,dock};
}

/* ------------------------------------------------------------------
   4. ASSET MANAGER
   ------------------------------------------------------------------ */
class GaelAssetManager {
  constructor(cfg){ this.cfg=cfg; this.images={}; this.keys=Object.keys(cfg.poses); }
  url(k){ return this.cfg.path + this.cfg.poses[k] + this.cfg.ext; }
  eyeLine(k){ return this.cfg.eyeLine[k] ?? this.cfg.eyeLine._default; }
  load(){
    return Promise.all(this.keys.map(k=>new Promise(res=>{
      const img=new Image(); img.decoding='async';
      img.onload=img.onerror=()=>{ this.images[k]=img; res(); };
      img.src=this.url(k);
    }))).then(()=>this);
  }
  ok(){ return this.keys.every(k=>this.images[k]&&this.images[k].naturalWidth>0); }
}

/* ------------------------------------------------------------------
   5. RENDERER WEBGL
   Malha 20x28 deformada no vertex shader. É o que separa
   "PNG animada" de "personagem com corpo": respiração no torso,
   piscada real, cauda com massa, squash & stretch com volume.
   ------------------------------------------------------------------ */
const VERT = `
attribute vec2 aPos;                     /* x,y em 0..1 — y=0 são os pés */
uniform float uFlip, uBreath, uBlink, uEyeY, uLean, uHeadX, uHeadY;
uniform float uStretch, uTail, uBob, uWalk;
uniform vec4  uQuad;
varying vec2 vUv;
float gauss(float d, float s){ float t=d/s; return exp(-t*t); }
void main(){
  float ux = mix(aPos.x, 1.0 - aPos.x, uFlip);
  vUv = vec2(ux, 1.0 - aPos.y);
  float x = aPos.x - 0.5;
  float y = aPos.y;
  float torso = gauss(y-0.42, 0.20);
  x *= 1.0 + uBreath*0.016*torso;
  y += uBreath*0.005*smoothstep(0.30,1.0,y);
  float tailMask = (1.0 - smoothstep(0.08,0.44,ux)) * gauss(y-0.33, 0.17);
  x += uTail*0.055*tailMask*mix(1.0,-1.0,uFlip);
  y += abs(uTail)*0.010*tailMask;
  y *= uStretch;
  x /= max(uStretch, 0.40);
  x += uLean * y * y;
  float head = smoothstep(0.62,0.96,y);
  x += uHeadX * head;
  y += uHeadY * head;
  x += uWalk * 0.012 * smoothstep(0.22,1.0,y);
  float eb = gauss(y-uEyeY, 0.030);
  y -= (y-uEyeY) * uBlink * eb;
  y += uBob;
  vec2 q = vec2(uQuad.x + (x+0.5)*uQuad.z, uQuad.y + y*uQuad.w);
  gl_Position = vec4(q*2.0-1.0, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexA, uTexB;
uniform float uFade, uOpacity, uTintAmt;
uniform vec3 uTint;
void main(){
  vec4 a = texture2D(uTexA, vUv);
  vec4 b = texture2D(uTexB, vUv);
  vec4 c = mix(a, b, uFade);
  c.rgb = mix(c.rgb, uTint*c.a, uTintAmt);
  gl_FragColor = c * uOpacity;
}`;

class GaelWebGLRenderer {
  constructor(canvas,assets){ this.canvas=canvas; this.assets=assets; this.tex={}; this.lost=false; }
  init(){
    const o={alpha:true,premultipliedAlpha:true,antialias:true,depth:false,stencil:false};
    let gl=null;
    try{ gl=this.canvas.getContext('webgl',o)||this.canvas.getContext('experimental-webgl',o); }catch(_){}
    if(!gl) return false;
    this.gl=gl;
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;},false);
    const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn('[Gael]',gl.getShaderInfoLog(s));return null;}return s;};
    const vs=sh(gl.VERTEX_SHADER,VERT), fs=sh(gl.FRAGMENT_SHADER,FRAG);
    if(!vs||!fs) return false;
    const p=this.prog=gl.createProgram();
    gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.warn('[Gael]',gl.getProgramInfoLog(p));return false;}
    gl.useProgram(p);
    const NX=20,NY=28,pos=[],idx=[];
    for(let j=0;j<=NY;j++) for(let i=0;i<=NX;i++) pos.push(i/NX,j/NY);
    for(let j=0;j<NY;j++) for(let i=0;i<NX;i++){ const a=j*(NX+1)+i,b=a+1,c=a+NX+1,d=c+1; idx.push(a,b,c,b,d,c); }
    this.count=idx.length;
    const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(p,'aPos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const ib=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    this.u={};
    ['uFlip','uBreath','uBlink','uEyeY','uLean','uHeadX','uHeadY','uStretch','uTail','uBob',
     'uWalk','uQuad','uFade','uOpacity','uTintAmt','uTint','uTexA','uTexB']
      .forEach(n=>this.u[n]=gl.getUniformLocation(p,n));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.clearColor(0,0,0,0);
    try{ for(const k of this.assets.keys) this.tex[k]=this.makeTexture(this.assets.images[k]); }
    catch(e){ console.warn('[Gael] textura bloqueada (sirva por http, não file://):',e.message||e); return false; }
    gl.uniform1i(this.u.uTexA,0); gl.uniform1i(this.u.uTexB,1);
    gl.uniform3f(this.u.uTint,1.0,0.30,0.20);
    return true;
  }
  makeTexture(img){
    const gl=this.gl,t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    return t;
  }
  resize(cw,ch,dpr){
    const w=Math.round(cw*dpr),h=Math.round(ch*dpr);
    if(this.canvas.width!==w||this.canvas.height!==h){
      this.canvas.width=w; this.canvas.height=h;
      this.canvas.style.width=cw+'px'; this.canvas.style.height=ch+'px';
      this.gl.viewport(0,0,w,h);
    }
  }
  draw(p){
    if(this.lost) return;
    const gl=this.gl,u=this.u;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.tex[p.poseA]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,this.tex[p.poseB]||this.tex[p.poseA]);
    gl.uniform1f(u.uFlip,p.flip);     gl.uniform1f(u.uBreath,p.breath);
    gl.uniform1f(u.uBlink,p.blink);   gl.uniform1f(u.uEyeY,p.eyeY);
    gl.uniform1f(u.uLean,p.lean);     gl.uniform1f(u.uHeadX,p.headX);
    gl.uniform1f(u.uHeadY,p.headY);   gl.uniform1f(u.uStretch,p.stretch);
    gl.uniform1f(u.uTail,p.tail);     gl.uniform1f(u.uBob,p.bob);
    gl.uniform1f(u.uWalk,p.walk);     gl.uniform1f(u.uFade,p.fade);
    gl.uniform1f(u.uTintAmt,p.tint);
    if(p.blur>0.01){
      gl.uniform1f(u.uOpacity,0.22*p.blur);
      gl.uniform4f(u.uQuad,p.quad[0]-p.blurDir*0.035,p.quad[1],p.quad[2],p.quad[3]);
      gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
    }
    gl.uniform4f(u.uQuad,p.quad[0],p.quad[1],p.quad[2],p.quad[3]);
    gl.uniform1f(u.uOpacity,p.opacity);
    gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
  }
}

/* ------------------------------------------------------------------
   6. RENDERER DOM — fallback com a mesma API
   ------------------------------------------------------------------ */
class GaelDOMRenderer {
  constructor(canvas,assets){
    this.assets=assets;
    const host=document.createElement('div');
    host.style.cssText='position:absolute;left:0;top:0;pointer-events:none';
    this.a=document.createElement('img'); this.b=document.createElement('img');
    for(const el of [this.a,this.b]){
      el.style.cssText='position:absolute;will-change:transform,opacity';
      el.draggable=false; host.appendChild(el);
    }
    canvas.replaceWith(host); this.host=host;
  }
  init(){ return true; }
  resize(cw,ch){ this.cw=cw; this.ch=ch; this.host.style.width=cw+'px'; this.host.style.height=ch+'px'; this._geo=''; }
  draw(p){
    const A=this.assets.images[p.poseA],B=this.assets.images[p.poseB];
    const geo=p.quad.join(',');
    if(geo!==this._geo){
      this._geo=geo;
      const w=p.quad[2]*this.cw,h=p.quad[3]*this.ch;
      const left=p.quad[0]*this.cw,top=this.ch-p.quad[1]*this.ch-h;
      for(const el of [this.a,this.b]){
        el.style.width=w+'px'; el.style.height=h+'px';
        el.style.left=left+'px'; el.style.top=top+'px';
      }
    }
    if(A&&this.a.src!==A.src) this.a.src=A.src;
    if(B&&this.b.src!==B.src) this.b.src=B.src;
    const t=`translate3d(${p.headX*90}px,${-p.bob*260}px,0) `+
            `scale(${(1/Math.max(p.stretch,.4)).toFixed(3)},${p.stretch.toFixed(3)}) `+
            `rotate(${(p.lean*26).toFixed(2)}deg) scaleX(${p.flip>.5?-1:1})`;
    this.a.style.transformOrigin=this.b.style.transformOrigin='50% 99%';
    this.a.style.transform=t; this.b.style.transform=t;
    this.a.style.opacity=String((1-p.fade)*p.opacity);
    this.b.style.opacity=String(p.fade*p.opacity);
  }
}

/* ------------------------------------------------------------------
   7. RENDERER GLTF — futuro gael.glb, mesma assinatura
   ------------------------------------------------------------------ */
class GaelGLTFRenderer {
  static async available(url){ if(!url) return false;
    try{ const r=await fetch(url,{method:'HEAD'}); return r.ok; }catch(_){ return false; } }
  constructor(canvas,url){ this.canvas=canvas; this.url=url; }
  async init(){
    const THREE=await import('https://unpkg.com/three@0.163.0/build/three.module.js');
    const {GLTFLoader}=await import('https://unpkg.com/three@0.163.0/examples/jsm/loaders/GLTFLoader.js');
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true});
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(28,SPRITE_AR,0.1,50);
    this.camera.position.set(0,1.1,4.4);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x9aa4b2,2.1));
    const key=new THREE.DirectionalLight(0xffffff,1.6); key.position.set(2,4,3); this.scene.add(key);
    const gltf=await new GLTFLoader().loadAsync(this.url);
    this.root=gltf.scene; this.scene.add(this.root);
    this.mixer=new THREE.AnimationMixer(this.root);
    this.clips={}; gltf.animations.forEach(c=>this.clips[c.name]=this.mixer.clipAction(c));
    this.play('Idle'); return true;
  }
  play(n){ const c=this.clips[n]||this.clips.Idle; if(!c||c===this.current)return;
    if(this.current) this.current.fadeOut(0.25); c.reset().fadeIn(0.25).play(); this.current=c; }
  resize(cw,ch,dpr){ this.renderer.setPixelRatio(dpr); this.renderer.setSize(cw,ch,false);
    this.camera.aspect=cw/ch; this.camera.updateProjectionMatrix(); }
  draw(p){ this.mixer.update(p.dt||0.016); this.play(p.clip||'Idle');
    if(this.root) this.root.rotation.y=(p.flip>.5?Math.PI:0)+p.headX*2.2;
    this.renderer.render(this.scene,this.camera); }
}

/* ------------------------------------------------------------------
   8. FÍSICA
   ------------------------------------------------------------------ */
class GaelPhysics {
  constructor(){ this.x=0;this.y=0;this.vx=0;this.vy=0;this.gravity=2600;this.friction=0.90;this.grounded=true;this.groundY=0; }
  step(dt){
    if(this.grounded) return;
    this.vy+=this.gravity*dt; this.y+=this.vy*dt; this.x+=this.vx*dt;
    this.vx*=Math.pow(this.friction,dt*60);
    if(this.y>=this.groundY){
      this.y=this.groundY;
      if(Math.abs(this.vy)>340){ this.vy*=-0.30; this.onBounce?.(); }
      else { this.vy=0; this.vx=0; this.grounded=true; this.onLand?.(); }
    }
  }
  jump(f=1000){ if(this.grounded){ this.grounded=false; this.vy=-f; this.onTakeoff?.(); } }
  drop(vx=0,vy=0){ this.grounded=false; this.vx=vx; this.vy=vy; }
}

/* ------------------------------------------------------------------
   9. STATE MACHINE
   ------------------------------------------------------------------ */
class GaelStateMachine {
  constructor(onEnter){ this.state='IDLE'; this.since=0; this.onEnter=onEnter; this.lockUntil=0; }
  set(next,{force=false}={}){
    if(!STATE_POSE[next]) return false;
    if(next===this.state){ this.since=0; return true; }
    if(!force && performance.now()<this.lockUntil &&
       (STATE_PRIORITY[next]??0)<(STATE_PRIORITY[this.state]??0)) return false;
    const prev=this.state; this.state=next; this.since=0; this.onEnter?.(next,prev); return true;
  }
  lock(ms){ this.lockUntil=performance.now()+ms; }
}

/* ------------------------------------------------------------------
   10. ANIMATOR
   ------------------------------------------------------------------ */
class GaelAnimator {
  constructor(assets){
    this.assets=assets;
    this.poseA='idle'; this.poseB='idle'; this.fade=1; this.fadeSpeed=1/0.36;
    this.t=0; this.blink=0; this.nextBlink=rand(1.5,4); this.blinkT=null;
    this.headX=new Spring(0,{stiffness:120,damping:15});
    this.headY=new Spring(0,{stiffness:120,damping:15});
    this.stretch=new Spring(1,{stiffness:300,damping:16});
    this.leanS=new Spring(0,{stiffness:150,damping:17});
    this.tint=0; this.opacity=1; this.walkPhase=0; this.lastStep=0;
  }
  setPose(k,{instant=false}={}){
    if(!k||k===this.poseB) return;
    this.poseA=this.fade>=1?this.poseB:this.poseA;
    this.poseB=k; this.fade=instant?1:0;
    if(instant) this.poseA=k; else this.stretch.target=1.04;
  }
  pop(a=0.09){ this.stretch.v=1+a; this.stretch.vel=0; this.stretch.target=1; }
  update(dt,ctx){
    this.t+=dt;
    if(this.fade<1){ this.fade=Math.min(1,this.fade+dt*this.fadeSpeed);
      if(this.fade>=1){ this.poseA=this.poseB; this.stretch.target=1; } }
    this.nextBlink-=dt;
    if(this.nextBlink<=0&&this.blinkT===null){ this.blinkT=0; this.nextBlink=rand(2.4,6.2); this.double=Math.random()<0.25; }
    if(this.blinkT!==null){
      this.blinkT+=dt;
      const dur=this.double?0.34:0.17,k=clamp(this.blinkT/dur,0,1);
      this.blink=Math.abs(Math.sin(k*Math.PI*(this.double?2:1)))*0.62;
      if(k>=1){ this.blink=0; this.blinkT=null; }
    }
    const rate=ctx.speed>40?1.35:0.48;
    this.breath=Math.sin(this.t*Math.PI*2*rate);
    this.headX.step(dt); this.headY.step(dt); this.leanS.step(dt); this.stretch.step(dt);
    let bob=0,walk=0;
    if(ctx.speed>18&&ctx.grounded){
      const cyc=ctx.speed/(ctx.height*0.62);
      this.walkPhase+=dt*cyc*Math.PI*2;
      bob=Math.abs(Math.sin(this.walkPhase))*0.020*(ctx.running?1.7:1);
      walk=Math.sin(this.walkPhase)*(ctx.running?1.3:0.8);
      const s=Math.sin(this.walkPhase);
      if(this.lastStep<0&&s>=0) ctx.onStep?.();
      this.lastStep=s;
    } else this.walkPhase=damp(this.walkPhase,0,6,dt);
    const air=ctx.grounded?0:clamp(-ctx.vy/900,-1,1);
    return {
      poseA:this.poseA, poseB:this.poseB, fade:this.fade,
      flip:ctx.flip?1:0,
      breath:this.breath*(REDUCED?0.4:1),
      blink:this.blink, eyeY:this.assets.eyeLine(this.poseB),
      lean:clamp(this.leanS.v,-0.16,0.16),
      headX:this.headX.v, headY:this.headY.v,
      stretch:clamp(this.stretch.v+air*0.06,0.74,1.20),
      tail:Math.sin(this.t*1.7)*0.35+walk*0.5+clamp(ctx.vx/900,-1,1),
      bob, walk, tint:this.tint, opacity:this.opacity,
      blur:ctx.running?clamp((ctx.speed-320)/500,0,1):0,
      blurDir:ctx.facing, dt
    };
  }
}

/* ------------------------------------------------------------------
   11. SPEECH
   ------------------------------------------------------------------ */
class GaelSpeech {
  constructor(el,textEl){
    this.el=el; this.textEl=textEl; this.visible=false;
    this.full=''; this.shown=0; this.charT=0; this.holdT=0; this.holdFor=3000;
    this.scale=new Spring(0.92,{stiffness:260,damping:20});
    el.addEventListener('pointerdown',()=>this.skip());
  }
  say(text,{type='normal',tip=null,duration=null,typing=true}={}){
    this.el.dataset.type=type;
    this.full=String(text); this.shown=typing?0:this.full.length; this.charT=0; this.holdT=0;
    this.tip=tip ?? ({warning:'Atenção',critical:'Crítico',success:'Boa',info:'Leitura'}[type] ?? null);
    this.visible=true; this.el.style.opacity='1';
    this.scale.target=1; this.scale.v=Math.min(this.scale.v,0.94);
    this.holdFor=duration ?? clamp(2600+this.full.length*52,CFG.speech.minDuration,CFG.speech.maxDuration);
    this.render();
  }
  skip(){ if(this.visible){ this.shown=this.full.length; this.render(); } }
  hide(){ this.visible=false; this.scale.target=0.92; this.el.style.opacity='0'; }
  get isTyping(){ return this.visible&&this.shown<this.full.length; }
  render(){
    const raw=this.full.slice(0,this.shown);
    const safe=raw.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))
                  .replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>');
    this.textEl.innerHTML=(this.tip?`<span class="gael-tip">${this.tip}</span>`:'')+
      safe+(this.isTyping?'<span class="gael-cursor"></span>':'');
    this._dirty=true;
  }
  update(dt,head,vw,vh){
    this.scale.step(dt);
    if(!this.visible&&this.scale.v<0.935){ this.el.style.transform='translate3d(-9999px,-9999px,0)'; return; }
    if(this.isTyping){
      this.charT+=dt;
      const n=Math.floor(this.charT*CFG.speech.typingSpeed);
      if(n>this.shown){ this.shown=Math.min(this.full.length,n); this.render(); }
    } else if(this.visible){
      this.holdT+=dt*1000;
      if(this.holdT>this.holdFor) this.hide();
    }
    if(this._dirty||this._w===undefined){
      const r=this.el.getBoundingClientRect();
      this._w=r.width||240; this._h=r.height||60; this._dirty=false;
    }
    const w=this._w,h=this._h;
    let side='right',x=head.x+24;
    if(x+w>vw-12){ side='left'; x=head.x-24-w; }
    x=clamp(x,10,Math.max(10,vw-w-10));
    let y=head.y-h-16;
    if(y<10){ side='below'; y=head.y+22; }
    y=clamp(y,10,Math.max(10,vh-h-10));
    this.el.dataset.side=side;
    this.el.querySelector('.gael-caret').style.left=clamp(head.x-x-6,14,Math.max(14,w-26))+'px';
    this.el.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(${this.scale.v.toFixed(3)})`;
  }
}

/* ------------------------------------------------------------------
   12. SOM — sintetizado, sem arquivos
   ------------------------------------------------------------------ */
class GaelSound {
  constructor(){ this.muted=!CFG.sound.enabled; this.vol=CFG.sound.volume; }
  ctx(){ if(!this._c) this._c=new (window.AudioContext||window.webkitAudioContext)(); return this._c; }
  unlock(){ try{ const c=this.ctx(); if(c.state==='suspended') c.resume(); }catch(_){} }
  tone(f,dur,type='sine',gain=0.05,slide=0){
    if(this.muted) return;
    try{
      const c=this.ctx(); if(c.state==='suspended') c.resume();
      const o=c.createOscillator(),g=c.createGain();
      o.type=type; o.frequency.setValueAtTime(f,c.currentTime);
      if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,f+slide),c.currentTime+dur);
      g.gain.setValueAtTime(gain*this.vol,c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+dur);
    }catch(_){}
  }
  step(){ this.tone(rand(150,190),0.055,'triangle',0.016); }
  click(){ this.tone(620,0.06,'square',0.022,-180); }
  notify(){ this.tone(660,0.10,'sine',0.036); setTimeout(()=>this.tone(880,0.12,'sine',0.032),90); }
  success(){ [523,659,784].forEach((f,i)=>setTimeout(()=>this.tone(f,0.16,'sine',0.038),i*90)); }
  alert(){ [440,392].forEach((f,i)=>setTimeout(()=>this.tone(f,0.16,'sawtooth',0.028),i*150)); }
  land(){ this.tone(110,0.10,'sine',0.036,-40); }
}

/* ------------------------------------------------------------------
   13. FONTE DE DADOS + BASE DE PERGUNTAS
   Tudo aqui é dirigido pelo config: campos, intents, seções e
   observadores. O motor não conhece nenhuma ferramenta.
   ------------------------------------------------------------------ */
class GaelData {
  constructor(g){ this.g=g; this.lastTalk=0; this.prev=null; }

  static field(f){
    if(typeof f==='function'){ try{ return f(); }catch(_){ return null; } }
    if(typeof f==='string') f={sel:f,type:'text'};
    if(f.type==='list'){
      const a=Array.from(document.querySelectorAll(f.sel)).map(e=>e.textContent.trim()).filter(Boolean);
      return f.limit?a.slice(0,f.limit):a;
    }
    const el=document.querySelector(f.sel);
    const raw=el?(el.textContent||'').trim():'';
    if(f.type==='percent'||f.type==='float'){
      const v=parseFloat(raw.replace('%','').replace(/\./g,f.type==='percent'?'.':'').replace(',','.'));
      return isFinite(v)?v:(f.default??null);
    }
    if(f.type==='int'||f.type==='number'){
      const d=raw.replace(/[^\d-]/g,'');
      return d?parseInt(d,10):(f.default??null);
    }
    if(f.type==='exists') return !!el;
    return raw||(f.default??'');
  }

  read(){
    if(typeof CFG.data.source==='function'){ try{ return CFG.data.source()||{}; }catch(_){ return {}; } }
    const out={};
    for(const k in CFG.data.fields) out[k]=GaelData.field(CFG.data.fields[k]);
    return out;
  }

  ready(d){
    d=d||this.read();
    if(typeof CFG.data.ready==='function'){ try{ return !!CFG.data.ready(d); }catch(_){ return false; } }
    return true;
  }

  /* {campo} vira o valor formatado pelo tipo declarado no config */
  fill(tpl,d){
    return String(tpl).replace(/\{(\w+)\}/g,(_,k)=>{
      const v=d[k], f=CFG.data.fields[k];
      const type=(f&&typeof f==='object')?f.type:null;
      if(Array.isArray(v)) return v.join(', ');
      if(type==='percent') return pctBR(v);
      if(type==='int'||type==='number') return numBR(v);
      return (v==null||v==='')?'—':String(v);
    });
  }
  render(v,d){ return typeof v==='function'?v(d,this):this.fill(v,d); }

  /* leva a seção certa para a tela antes de apontar */
  async reveal(sel){
    const cfgSec=CFG.sections[sel];
    if(cfgSec){
      for(const c of (cfgSec.click||[])){
        const el=document.querySelector(c);
        if(el&&!el.classList.contains(cfgSec.activeClass||'active')){ el.click(); await sleep(cfgSec.wait||180); }
      }
    }
    const el=document.querySelector(sel);
    if(el&&(!cfgSec||cfgSec.scroll!==false)){
      try{ el.scrollIntoView({behavior:REDUCED?'auto':'smooth',block:'center'}); }catch(_){}
      await sleep(REDUCED?60:520);
    }
    return el;
  }

  /* base de perguntas: primeiro intent cujo match bate e cujo when passa */
  async answer(question){
    const d=this.read();
    if(typeof CFG.ask==='function'){
      try{ const r=await CFG.ask(question,d,this); if(r) return r; }catch(e){ console.warn('[Gael] ask falhou',e); }
    }
    if(!this.ready(d)) return {text:this.render(CFG.data.emptyMessage,d),type:'warning'};
    const q=norm(question);
    for(const it of CFG.intents){
      const hit=(it.match||[]).some(m=>q.includes(norm(m)));
      if(!hit) continue;
      if(typeof it.when==='function' && !it.when(d,this)) continue;
      return {
        text: this.render(it.text,d),
        type: typeof it.type==='function'?it.type(d,this):(it.type||'info'),
        point: typeof it.point==='function'?it.point(d,this):it.point
      };
    }
    return {text:this.render(CFG.fallback,d),type:'normal'};
  }

  /* observadores declarados no config reagem a mudanças na tela */
  watch(){
    if(!CFG.watchers.length) return;
    this.prev=this.read();
    const run=()=>{
      const cur=this.read(), prev=this.prev||cur;
      for(const w of CFG.watchers){
        try{
          if(typeof w.when!=='function'||!w.when(cur,prev,this)) continue;
          if(!w.ignoreGap && Date.now()-this.lastTalk<CFG.behavior.minTalkGap) continue;
          if(w.cooldown && Date.now()-(w._last||0)<w.cooldown) continue;
          w._last=Date.now(); this.lastTalk=Date.now();
          w.do(window.Gael,cur,prev,this);
        }catch(e){ console.warn('[Gael] watcher',w.id||'',e); }
      }
      this.prev=cur;
    };
    let t=null;
    const debounced=()=>{ clearTimeout(t); t=setTimeout(run,260); };
    const alvos=new Set();
    CFG.watchers.forEach(w=>(Array.isArray(w.watch)?w.watch:[w.watch]).filter(Boolean).forEach(s=>alvos.add(s)));
    alvos.forEach(sel=>{
      const el=document.querySelector(sel);
      if(el) new MutationObserver(debounced).observe(el,{childList:true,characterData:true,subtree:true,attributes:true});
      else if(DEV) console.warn('[Gael] watcher sem alvo:',sel);
    });
  }
}

/* ------------------------------------------------------------------
   14. COMPORTAMENTO AUTÔNOMO
   ------------------------------------------------------------------ */
class GaelBehaviorController {
  constructor(g){ this.g=g; this.lastLines=[]; this.reset(); }
  reset(){ this.idleT=0; this.nextMicro=rand(7,14); this.nextBig=rand(26,48); this.nextWalk=rand(60,110); this.nextTalk=rand(150,260); }
  freshLine(lines){
    const opts=lines.filter(l=>!this.lastLines.includes(l));
    const l=pick(opts.length?opts:lines);
    this.lastLines.push(l); if(this.lastLines.length>3) this.lastLines.shift();
    return l;
  }
  update(dt){
    const g=this.g,st=g.sm.state;
    if(['ALERT','WARNING','TALKING','LISTENING','THINKING','DRAGGING','CELEBRATING','POINTING'].includes(st)){ this.idleT=0; return; }
    if(g.moving||!g.physics.grounded) return;
    this.idleT+=dt;
    if(this.idleT>this.nextMicro&&this.idleT<this.nextBig){
      this.nextMicro=this.idleT+rand(8,16);
      g.setState(pick(['WORKING','IDLE','CURIOUS']));
      g.animator.pop(0.035);
      g.gazeAt(g.pos.x+rand(-200,200),g.pos.y-g.height*0.9,1500);
    }
    if(this.idleT>this.nextBig){
      this.nextBig=this.idleT+rand(28,52);
      const act=pick(['analyze','work','think','stretch']);
      if(act==='analyze'){ g.setState('ANALYZING'); g.sm.lock(2200); }
      else if(act==='think'){ g.setState('THINKING'); g.sm.lock(2400); }
      else if(act==='work'){ g.setState('WORKING'); g.animator.pop(0.05); }
      else { g.animator.stretch.target=1.05; setTimeout(()=>{g.animator.stretch.target=1;},420); }
      setTimeout(()=>{ if(!g.moving&&!['TALKING','ALERT'].includes(g.sm.state)) g.setState('IDLE'); },2600);
    }
    if(CFG.behavior.wander&&!REDUCED&&this.idleT>this.nextWalk){
      this.nextWalk=this.idleT+rand(70,130);
      const b=g.bounds();
      g.walkTo(clamp(g.pos.x+rand(-200,200),b.min,b.max));
    }
    if(CFG.behavior.chatter&&this.idleT>this.nextTalk){
      this.nextTalk=this.idleT+rand(180,320);
      g.setState('GREETING'); g.sm.lock(1600);
      g.say(this.freshLine(CFG.behavior.chatterLines||['Posso te ajudar com alguma análise?']));
      setTimeout(()=>{ if(g.sm.state==='GREETING') g.setState('IDLE'); },1800);
    }
  }
}

/* ------------------------------------------------------------------
   15. INTERAÇÃO
   ------------------------------------------------------------------ */
class GaelInteractionController {
  constructor(g,hit){
    this.g=g; this.hit=hit; this.drag=null; this.hover=false;
    window.addEventListener('pointermove',e=>{
      g.pointer.x=e.clientX; g.pointer.y=e.clientY; g.pointer.active=true;
      if(this.drag) this.onDragMove(e);
    },{passive:true});
    hit.addEventListener('pointerenter',()=>{
      if(this.hover)return; this.hover=true;
      if(g.sm.state==='IDLE'||g.sm.state==='WORKING'){ g.setState('CURIOUS'); g.animator.pop(0.045); }
    });
    hit.addEventListener('pointerleave',()=>{ this.hover=false; if(g.sm.state==='CURIOUS') g.setState('IDLE'); });
    hit.addEventListener('pointerdown',e=>{
      e.preventDefault(); hit.setPointerCapture(e.pointerId);
      this.drag={id:e.pointerId,dx:e.clientX-g.pos.x,dy:e.clientY-g.pos.y,
                 lx:e.clientX,ly:e.clientY,vx:0,vy:0,moved:0,t:performance.now()};
      hit.classList.add('dragging');
      g.stopMoving(); g.setState('DRAGGING',{force:true}); g.sm.lock(400);
      g.physics.grounded=false; g.physics.vx=0; g.physics.vy=0;
    });
    const end=e=>{
      if(!this.drag||e.pointerId!==this.drag.id) return;
      const d=this.drag; this.drag=null; hit.classList.remove('dragging');
      if(d.moved<8){ g.physics.grounded=true; g.physics.y=g.groundY; g.pos.y=g.groundY; g.onTapped(); }
      else { g.physics.drop(clamp(d.vx,-1400,1400),clamp(d.vy,-900,900)); g.setState('DROPPED',{force:true}); }
      g.behavior.reset();
    };
    hit.addEventListener('pointerup',end);
    hit.addEventListener('pointercancel',end);
    hit.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); g.onTapped(); } });
    let rt; const onResize=()=>{ clearTimeout(rt); rt=setTimeout(()=>g.layout(),120); };
    window.addEventListener('resize',onResize);
    window.addEventListener('orientationchange',onResize);
  }
  onDragMove(e){
    const d=this.drag,g=this.g,now=performance.now();
    const dt=Math.max(0.008,(now-d.t)/1000);
    d.vx=(e.clientX-d.lx)/dt; d.vy=(e.clientY-d.ly)/dt;
    d.moved+=Math.abs(e.clientX-d.lx)+Math.abs(e.clientY-d.ly);
    d.lx=e.clientX; d.ly=e.clientY; d.t=now;
    const b=g.bounds();
    g.pos.x=clamp(e.clientX-d.dx,b.min,b.max);
    g.pos.y=clamp(e.clientY-d.dy,g.height*0.45,g.groundY);
    g.physics.x=g.pos.x; g.physics.y=g.pos.y;
    g.animator.leanS.target=clamp(-d.vx/2600,-0.14,0.14);
    g.animator.stretch.target=clamp(1+Math.abs(d.vy)/9000,1,1.10);
  }
}

/* ------------------------------------------------------------------
   16. PERSONAGEM
   ------------------------------------------------------------------ */
class GaelCharacter {
  constructor(root,{assets,renderer,speech,sound}){
    this.root=root; this.assets=assets; this.renderer=renderer; this.speech=speech; this.sound=sound;
    this.animator=new GaelAnimator(assets);
    this.physics=new GaelPhysics();
    this.sm=new GaelStateMachine(s=>this.onState(s));
    this.pos={x:120,y:0}; this.facing=1; this.speed=0; this.velX=0;
    this.moving=false; this.running=false; this.target=null;
    this.pointer={x:innerWidth/2,y:innerHeight/2,active:false};
    this.gaze=null;
    this.memory={lastInteractionTime:0,lastMessage:'',lastState:'IDLE',interactionCount:0};
    this.shadowEl=document.getElementById('gael-shadow');
    this.hitEl=document.getElementById('gael-hit');
    this.dust=[]; for(let i=0;i<6;i++){ const d=document.createElement('div'); d.className='gael-dust'; root.appendChild(d); this.dust.push(d); }
    this.dustI=0;
    this.physics.onLand=()=>this.onLand();
    this.physics.onTakeoff=()=>{ this.animator.stretch.v=1.16; this.animator.stretch.target=1; };
    this.physics.onBounce=()=>{ this.animator.pop(0.07); this.sound.land(); };
    this.behavior=new GaelBehaviorController(this);
    this.interaction=new GaelInteractionController(this,this.hitEl);
    this.layout();
  }

  layout(){
    const vw=innerWidth,vh=innerHeight,c=CFG.character;
    let h=clamp(vh*c.heightVh,c.heightMin,c.heightMax);
    h=Math.min(h,vw*0.42,vh*0.46);
    this.height=h; this.width=h*SPRITE_AR;
    this.canvasW=this.width*1.50; this.canvasH=h*1.30;
    this.feetMargin=h*0.07;
    this.dpr=Math.min(devicePixelRatio||1,2);
    this.renderer.resize(this.canvasW,this.canvasH,this.dpr);
    this.groundY=vh-c.ground;
    this.physics.groundY=this.groundY;
    if(this.physics.grounded){ this.pos.y=this.groundY; this.physics.y=this.groundY; }
    const b=this.bounds(); this.pos.x=clamp(this.pos.x,b.min,b.max);
    const hw=this.width*0.52,hh=h*0.94;
    Object.assign(this.hitEl.style,{width:hw+'px',height:hh+'px',
      left:((this.canvasW-hw)/2)+'px',top:(this.canvasH-this.feetMargin-hh)+'px'});
    const sw=this.width*0.82;
    Object.assign(this.shadowEl.style,{width:sw+'px',height:(sw*0.20)+'px',
      marginLeft:(-sw/2)+'px',top:(this.canvasH-this.feetMargin-sw*0.09)+'px'});
    this.viewport={vw,vh};
  }
  bounds(){ const m=this.width*0.5+6; return {min:m,max:Math.max(m,innerWidth-m)}; }
  head(){ return {x:this.pos.x+this.facing*this.width*0.10,y:this.pos.y-this.height*0.80}; }

  /* espelhar só enquanto anda: o tablet tem a marca, e logo invertido fica ruim */
  get flip(){
    const m=CFG.character.mirror;
    if(m==='never') return false;
    if(m==='always') return this.facing<0;
    return this.moving && this.facing<0;
  }

  setState(s,opt){ if(this.sm.set(s,opt)){ this.memory.lastState=s; return true; } return false; }
  onState(s){
    this.animator.setPose(STATE_POSE[s]||'idle');
    if(s==='ALERT'||s==='WARNING'){
      this.animator.tint=0.10; this.sound.alert();
      clearTimeout(this._tintT); this._tintT=setTimeout(()=>{this.animator.tint=0;},900);
    }
    if(s==='CELEBRATING'||s==='SUCCESS') this.sound.success();
  }

  moveTo(x,y,{run=false}={}){
    const b=this.bounds();
    this.target={x:clamp(x,b.min,b.max)};
    this.running=run&&!REDUCED; this.moving=true;
    this.facing=this.target.x>this.pos.x?1:-1;
    this.setState(this.running?'RUNNING':'WALKING');
    return new Promise(res=>{ const prev=this.arriveCb; this.arriveCb=res; prev?.(); });
  }
  walkTo(x){ return this.moveTo(x,null,{run:false}); }
  runTo(x){ return this.moveTo(x,null,{run:true}); }
  stopMoving(){ this.moving=false; this.target=null; this.speed=0; this.velX=0;
    const cb=this.arriveCb; this.arriveCb=null; cb?.(); }
  turnLeft(){ this.facing=-1; } turnRight(){ this.facing=1; }
  faceTowards(x){ this.facing=x>=this.pos.x?1:-1; }
  jump(f=1000){ this.physics.x=this.pos.x; this.physics.y=this.pos.y; this.physics.jump(f); }
  lookAt(x,y,hold=1600){ this.gazeAt(x,y,hold); }
  gazeAt(x,y,hold=1600){ this.gaze={x,y,until:performance.now()+hold}; }

  onStep(){ this.sound.step(); this.puff(); }
  puff(){
    if(REDUCED) return;
    const d=this.dust[this.dustI=(this.dustI+1)%this.dust.length];
    d.style.left=(this.canvasW/2-this.facing*this.width*0.16+rand(-6,6))+'px';
    d.style.top=(this.canvasH-this.feetMargin-4)+'px';
    d.animate([{opacity:.28,transform:'translate(0,0) scale(.6)'},
               {opacity:0,transform:`translate(${-this.facing*rand(16,34)}px,${rand(-14,-4)}px) scale(1.5)`}],
              {duration:rand(420,620),easing:'ease-out'});
  }
  onLand(){
    this.animator.stretch.v=0.86; this.animator.stretch.target=1; this.animator.leanS.target=0;
    this.sound.land();
    for(let i=0;i<3;i++) setTimeout(()=>this.puff(),i*40);
    if(this.sm.state==='DROPPED'||this.sm.state==='DRAGGING'){
      this.setState('CONFUSED',{force:true}); this.sm.lock(600);
      setTimeout(()=>{ if(this.sm.state==='CONFUSED') this.setState('IDLE',{force:true}); },900);
    }
  }

  say(text,opt={}){
    this.memory.lastMessage=text;
    this.speech.say(text,opt);
    if(!['ALERT','WARNING','CELEBRATING','DRAGGING','POINTING'].includes(this.sm.state)) this.setState('TALKING');
    this.sound.notify();
    const ms=(opt.duration ?? clamp(2600+String(text).length*52,CFG.speech.minDuration,CFG.speech.maxDuration))+String(text).length*22;
    clearTimeout(this._sayT);
    this._sayT=setTimeout(()=>{ if(this.sm.state==='TALKING') this.setState('IDLE',{force:true}); },ms);
    return this;
  }

  onTapped(){
    this.memory.interactionCount++;
    this.memory.lastInteractionTime=performance.now();
    this.sound.click(); this.behavior.reset();
    this.gazeAt(this.pointer.x,this.pointer.y,2600);
    this.setState('GREETING',{force:true}); this.sm.lock(1200);
    this.animator.pop(0.10);
    const onTap=CFG.onTap;
    if(typeof onTap==='function'){ try{ onTap(window.Gael,this.data?this.data.read():null); }catch(_){} }
    else if(this.data&&this.data.ready()&&CFG.summary&&this.memory.interactionCount>1){
      this.say(this.data.render(CFG.summary,this.data.read()),{type:'info'});
    } else {
      this.say(this.behavior.freshLine(CFG.tapLines||['Pode falar, estou aqui.','O que você quer ver?',
        'Manda a pergunta na barra ali embaixo.']));
    }
    setTimeout(()=>{ if(this.sm.state==='GREETING') this.setState('IDLE'); },1400);
  }

  focusElement(el,ms=5200){
    if(!el) return;
    el.classList.add('gael-focus');
    clearTimeout(el._gaelT);
    el._gaelT=setTimeout(()=>el.classList.remove('gael-focus'),ms);
  }

  async pointToElement(sel,message,type='info'){
    const el = typeof sel==='string'
      ? (this.data ? await this.data.reveal(sel) : document.querySelector(sel))
      : sel;
    if(!el){ if(message) this.say(message,{type}); return; }
    const r=el.getBoundingClientRect();
    const cx=clamp(r.left+r.width/2,0,innerWidth);
    const b=this.bounds();
    const stand=clamp(cx-Math.min(this.width*0.60,140),b.min,b.max);
    await this.walkTo(stand);
    this.faceTowards(cx);
    this.setState('POINTING',{force:true}); this.sm.lock(3600);
    this.gazeAt(cx,r.top+r.height/2,4600);
    this.focusElement(el,5400);
    if(message) this.say(message,{type});
    clearTimeout(this._pointT);
    this._pointT=setTimeout(()=>{ if(this.sm.state==='POINTING') this.setState('IDLE',{force:true}); },4600);
  }

  async warn(message,sel){
    this.setState('WARNING',{force:true}); this.sm.lock(4000);
    if(sel) await this.pointToElement(sel,message,'warning');
    else this.say(message,{type:'warning'});
    setTimeout(()=>{ if(this.sm.state==='WARNING') this.setState('IDLE',{force:true}); },5000);
  }

  async alert(message,sel){
    this.setState('ALERT',{force:true}); this.sm.lock(7000);
    const el = sel ? (this.data ? await this.data.reveal(sel) : document.querySelector(sel)) : null;
    if(el){
      const r=el.getBoundingClientRect();
      const cx=clamp(r.left+r.width/2,0,innerWidth);
      const b=this.bounds();
      await this.runTo(clamp(cx-Math.min(this.width*0.60,140),b.min,b.max));
      this.faceTowards(cx);
      this.gazeAt(cx,r.top+r.height/2,5200);
      this.setState('ALERT',{force:true});
      this.focusElement(el,6400);
    }
    this.say(message,{type:'critical'});
    clearTimeout(this._alertT);
    this._alertT=setTimeout(()=>{ if(this.sm.state==='ALERT') this.setState('IDLE',{force:true}); },6000);
  }

  celebrate(msg='Meta atingida! Excelente trabalho.'){
    this.stopMoving();
    this.setState('CELEBRATING',{force:true}); this.sm.lock(2600);
    this.jump(1000);
    setTimeout(()=>this.say(msg,{type:'success',tip:'Meta'}),260);
    setTimeout(()=>{ if(this.sm.state==='CELEBRATING') this.setState('SUCCESS',{force:true}); },2500);
    setTimeout(()=>{ if(this.sm.state==='SUCCESS') this.setState('IDLE',{force:true}); },4600);
  }

  async think(text='Analisando os números…'){
    this.setState('THINKING',{force:true}); this.sm.lock(1800);
    this.say(text,{duration:1900});
    await sleep(1400);
    this.setState('ANALYZING',{force:true});
  }

  async ask(message){
    this.behavior.reset();
    this.setState('THINKING',{force:true}); this.sm.lock(2200);
    this.say('Analisando…',{duration:1400,typing:false});
    await sleep(rand(600,1100));
    const res = this.data ? await this.data.answer(message)
                          : {text:'Ainda não estou ligado a nenhuma fonte de dados aqui.',type:'normal'};
    this.setState('ANALYZING',{force:true});
    if(res.point) await this.pointToElement(res.point,res.text,res.type);
    else this.say(res.text,{type:res.type});
    if(this.data) this.data.lastTalk=Date.now();
    return res;
  }

  wave(){ this.setState('GREETING',{force:true}); this.sm.lock(1300); this.animator.pop(0.08);
    setTimeout(()=>{ if(this.sm.state==='GREETING') this.setState('IDLE'); },1400); }
  setMood(m){ this.setState({feliz:'HAPPY',serio:'ALERT',curioso:'CURIOUS',focado:'WORKING'}[m]||'IDLE',{force:true}); }

  update(dt){
    const {vw,vh}=this.viewport;
    if(this.moving&&this.target){
      const maxV=(this.running?1.35:0.58)*this.height*1.6;
      const dx=this.target.x-this.pos.x,dist=Math.abs(dx);
      const brake=clamp(dist/(this.height*0.55),0,1);
      const want=Math.sign(dx)*maxV*Math.max(brake,0.12);
      this.velX=damp(this.velX,want,this.running?7:5.5,dt);
      this.pos.x+=this.velX*dt;
      this.speed=Math.abs(this.velX);
      if(this.velX>2) this.facing=1; else if(this.velX<-2) this.facing=-1;
      this.animator.leanS.target=clamp(this.velX/(this.height*9),-0.10,0.10);
      if(dist<6&&this.speed<28){
        this.pos.x=this.target.x; this.velX=0; this.speed=0;
        this.moving=false; this.target=null;
        this.animator.leanS.target=0; this.animator.pop(0.045);
        if(this.sm.state==='WALKING'||this.sm.state==='RUNNING') this.setState('IDLE');
        const cb=this.arriveCb; this.arriveCb=null; cb?.();
      }
    } else {
      this.velX=damp(this.velX,0,8,dt);
      this.speed=Math.abs(this.velX)<2?0:Math.abs(this.velX);
      if(this.sm.state!=='DRAGGING') this.animator.leanS.target=damp(this.animator.leanS.target,0,6,dt);
    }

    if(!this.physics.grounded&&this.sm.state!=='DRAGGING'){
      this.physics.step(dt);
      const b=this.bounds();
      this.pos.x=clamp(this.physics.x,b.min,b.max); this.physics.x=this.pos.x;
      this.pos.y=this.physics.y;
    } else if(this.physics.grounded&&this.pos.y!==this.groundY){
      this.pos.y=damp(this.pos.y,this.groundY,12,dt);
      if(Math.abs(this.pos.y-this.groundY)<0.5) this.pos.y=this.groundY;
    }

    let gx=null,gy=null;
    if(this.gaze&&performance.now()<this.gaze.until){ gx=this.gaze.x; gy=this.gaze.y; }
    else if(this.pointer.active){
      const h=this.head();
      if(Math.hypot(this.pointer.x-h.x,this.pointer.y-h.y)<Math.max(320,this.height*1.4)){ gx=this.pointer.x; gy=this.pointer.y; }
    }
    if(gx!==null){
      const h=this.head();
      this.animator.headX.target=clamp((gx-h.x)/(this.width*2.6),-1,1)*0.055*(REDUCED?0.4:1);
      this.animator.headY.target=-clamp((gy-h.y)/(this.height*2.2),-1,1)*0.016*(REDUCED?0.4:1);
      if(CFG.character.mirror==='always'&&!this.moving&&this.sm.state!=='POINTING'&&
         Math.abs(gx-this.pos.x)>this.width*0.6) this.faceTowards(gx);
    } else {
      const t=performance.now()/1000;
      this.animator.headX.target=REDUCED?0:Math.sin(t*0.31)*0.014;
      this.animator.headY.target=0;
    }

    const ctx={speed:this.speed,running:this.running,height:this.height,
      grounded:this.physics.grounded,facing:this.facing,flip:this.flip,
      vx:this.velX,vy:this.physics.vy,onStep:()=>this.onStep()};
    const p=this.animator.update(dt,ctx);
    p.quad=[((this.canvasW-this.width)/2)/this.canvasW,this.feetMargin/this.canvasH,
            this.width/this.canvasW,this.height/this.canvasH];
    p.clip=this.running?'Run':(this.moving?'Walk':
      ({THINKING:'Think',TALKING:'Talk',POINTING:'Point',ALERT:'Alert',
        CELEBRATING:'Celebrate',GREETING:'Wave',WORKING:'UseTablet'}[this.sm.state]||'Idle'));
    this.renderer.draw(p);

    this.root.style.transform=
      `translate3d(${Math.round(this.pos.x-this.canvasW/2)}px,${Math.round(this.pos.y-(this.canvasH-this.feetMargin))}px,0)`;

    const air=clamp((this.groundY-this.pos.y)/(this.height*0.8),0,1);
    this.shadowEl.style.transform=
      `translate3d(0,${(air*this.height*0.03).toFixed(1)}px,0) scale(${(1-air*0.42).toFixed(3)},${(1-air*0.5).toFixed(3)})`;
    this.shadowEl.style.opacity=(0.95-air*0.55).toFixed(2);

    this.speech.update(dt,this.head(),vw,vh);
    this.behavior.update(dt);
    this.sm.since+=dt;
  }

  /* Entrada em cena. Por padrão vem pela direita, parando ao lado
     da barra de comandos — é de lá que a conversa começa. */
  homeX(){
    const b=this.bounds();
    const dock=document.getElementById('gael-dock');
    const e=CFG.character.entry;
    if(typeof e==='number') return clamp(e,b.min,b.max);
    if(e==='left') return clamp(innerWidth*0.13,b.min+20,b.max);
    const r=dock?dock.getBoundingClientRect():null;
    let alvo = (r && r.left>innerWidth*0.4) ? r.left-this.width*0.30 : innerWidth-190;
    /* garantia: entrando pela direita, ele para na metade direita da tela */
    alvo=Math.max(alvo, innerWidth*0.60);
    return clamp(alvo,b.min,b.max);
  }
  async enter(){
    const vindoDaDireita = CFG.character.entry!=='left' && typeof CFG.character.entry!=='number';
    this.pos.x = vindoDaDireita ? innerWidth+this.width : -this.width;
    this.pos.y = this.groundY;
    this.animator.setPose('idle',{instant:true});
    await sleep(200);
    await this.runTo(this.homeX());
    this.animator.stretch.v=0.90; this.animator.stretch.target=1;   /* derrapagem */
    this.puff(); this.puff();
    this.facing=1;                                                  /* volta sem espelho */
    await sleep(200);
    this.gazeAt(innerWidth*0.5,innerHeight*0.45,3200);
    this.wave();
  }
}

/* ------------------------------------------------------------------
   17. BOOT
   ------------------------------------------------------------------ */
async function boot(){
  const {dock}=injectDOM();

  const assets=new GaelAssetManager(CFG.assets);
  await assets.load();
  if(!assets.ok()){
    console.warn('[Gael] imagens não encontradas em '+CFG.assets.path+
      ' — confira se a pasta com os .webp subiu junto.');
    document.getElementById('gael-layer')?.remove();
    dock?.remove(); return;
  }

  const canvas=document.getElementById('gael-canvas');
  const root=document.getElementById('gael-root');
  let renderer=null;
  if(await GaelGLTFRenderer.available(CFG.assets.model)){
    try{ renderer=new GaelGLTFRenderer(canvas,CFG.assets.model); await renderer.init(); }
    catch(e){ console.warn('[Gael] gael.glb falhou, seguindo em 2.5D',e); renderer=null; }
  }
  if(!renderer){
    const gl=new GaelWebGLRenderer(canvas,assets);
    if(gl.init()) renderer=gl;
    else { renderer=new GaelDOMRenderer(canvas,assets); renderer.init(); }
  }

  const speech=new GaelSpeech(document.getElementById('gael-bubble'),document.getElementById('gael-text'));
  const sound=new GaelSound();
  const gael=new GaelCharacter(root,{assets,renderer,speech,sound});

  const data = (Object.keys(CFG.data.fields).length||typeof CFG.data.source==='function'||CFG.intents.length)
    ? new GaelData(gael) : null;
  gael.data=data;

  /* o navegador só libera áudio depois do primeiro gesto do usuário */
  document.addEventListener('pointerdown',()=>sound.unlock(),{once:true});

  window.Gael={
    version:2, config:CFG, character:gael, data,
    get position(){ return gael.pos; },
    get state(){ return gael.sm.state; },
    say:(t,o)=>gael.say(t,o),
    walkTo:x=>gael.walkTo(x), runTo:x=>gael.runTo(x), moveTo:(x,y,o)=>gael.moveTo(x,y,o),
    jump:f=>gael.jump(f), wave:()=>gael.wave(),
    turnLeft:()=>gael.turnLeft(), turnRight:()=>gael.turnRight(),
    lookAt:(x,y)=>gael.lookAt(x,y),
    pointAt:(x,y)=>{ gael.faceTowards(x); gael.setState('POINTING',{force:true}); gael.gazeAt(x,y,3000); },
    pointToElement:(el,msg,type)=>gael.pointToElement(el,msg,type),
    warn:(msg,sel)=>gael.warn(msg,sel),
    alert:(msg,sel)=>gael.alert(msg,sel),
    celebrate:msg=>gael.celebrate(msg),
    think:t=>gael.think(t),
    ask:m=>gael.ask(m),
    setMood:m=>gael.setMood(m),
    setState:s=>gael.setState(s,{force:true}),
    mute:v=>{ sound.muted=(v!==false); },
    show:()=>setVisible(true), hide:()=>setVisible(false),
    home:()=>gael.walkTo(gael.homeX()),
    read:()=>data?data.read():null
  };

  document.addEventListener('gael:alert',e=>Gael.alert(e.detail.message,e.detail.target));
  document.addEventListener('gael:warn',e=>Gael.warn(e.detail.message,e.detail.target));
  document.addEventListener('gael:success',e=>Gael.celebrate(e.detail?.message));
  document.addEventListener('gael:say',e=>Gael.say(e.detail.message,e.detail));
  document.addEventListener('gael:point',e=>Gael.pointToElement(e.detail.target,e.detail.message,e.detail.type));

  let last=performance.now(),raf=null,visible=true;
  function frame(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    if(!document.hidden) gael.update(dt);
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);

  function setVisible(v){
    visible=v;
    if(CFG.toggle.remember) localStorage.setItem('gael:hidden',v?'0':'1');
    document.getElementById('gael-layer').style.display=v?'':'none';
    if(dock) dock.style.display=v?'':'none';
    const btn=document.getElementById('gael-toggle');
    if(btn) btn.textContent=(v?'🦊':'🐾')+' Gael';
    if(v&&!raf){ last=performance.now(); raf=requestAnimationFrame(frame); }
    if(!v&&raf){ cancelAnimationFrame(raf); raf=null; speech.hide(); }
  }

  if(CFG.toggle.container){
    const host=document.querySelector(CFG.toggle.container);
    if(host){
      const btn=document.createElement('button');
      btn.id='gael-toggle';
      if(CFG.toggle.className) btn.className=CFG.toggle.className;
      btn.title='Mostrar ou ocultar o Gael';
      btn.textContent=CFG.toggle.label;
      btn.addEventListener('click',()=>setVisible(!visible));
      host.insertBefore(btn,host.firstChild);
    }
  }

  if(dock){
    const ask=document.getElementById('gael-ask');
    document.getElementById('gael-open').addEventListener('click',()=>{ dock.dataset.open='true'; ask.focus(); });
    const olharDock=()=>{ const r=ask.getBoundingClientRect(); gael.gazeAt(r.left+r.width/2,r.top+r.height/2,2800); };
    ask.addEventListener('focus',()=>{ gael.behavior.reset(); olharDock(); gael.setState('LISTENING',{force:true}); });
    ask.addEventListener('input',()=>{ olharDock(); gael.setState('LISTENING'); });
    ask.addEventListener('blur',()=>{
      if(gael.sm.state==='LISTENING') gael.setState('IDLE',{force:true});
      if(!ask.value.trim()) setTimeout(()=>{ if(document.activeElement!==ask) dock.dataset.open='false'; },200);
    });
    const submit=()=>{ const v=ask.value.trim(); if(!v)return; ask.value=''; sound.click(); gael.ask(v); };
    document.getElementById('gael-send').addEventListener('click',submit);
    ask.addEventListener('keydown',e=>{ if(e.key==='Enter') submit(); });
  }

  if(DEV){
    const panel=document.createElement('div');
    panel.id='gael-dev';
    panel.innerHTML='<h4>Estados</h4>'+
      [['idle','Idle'],['walk','Andar'],['run','Correr'],['think','Pensar'],
       ['analyze','Analisar'],['wave','Acenar'],['point','Apontar'],['alert','Alerta'],
       ['success','Sucesso'],['celebrate','Comemorar'],['jump','Pular'],['home','Voltar']]
      .map(([k,l])=>`<button data-do="${k}">${l}</button>`).join('');
    document.body.appendChild(panel);
    panel.addEventListener('click',e=>{
      const d=e.target.dataset.do; if(!d)return;
      const b=gael.bounds();
      ({
        idle:()=>gael.setState('IDLE',{force:true}),
        walk:()=>gael.walkTo(rand(b.min,b.max)),
        run:()=>gael.runTo(rand(b.min,b.max)),
        think:()=>gael.think(),
        analyze:()=>{ gael.setState('ANALYZING',{force:true}); gael.say('Cruzando os números…',{type:'info'}); },
        wave:()=>gael.wave(),
        point:()=>gael.pointToElement(Object.keys(CFG.sections)[0]||'body','Apontando aqui.'),
        alert:()=>gael.alert('Teste de alerta crítico.'),
        success:()=>{ gael.setState('SUCCESS',{force:true}); gael.say('Tudo dentro do previsto.',{type:'success'}); },
        celebrate:()=>gael.celebrate(),
        jump:()=>gael.jump(),
        home:()=>gael.walkTo(gael.homeX())
      })[d]?.();
    });
  }

  if(CFG.toggle.remember && localStorage.getItem('gael:hidden')==='1'){ setVisible(false); return; }

  await gael.enter();

  /* saudação: espera o dado aparecer antes de falar */
  if(CFG.greeting){
    if(data){
      const limite=Date.now()+CFG.greetingWaitMs;
      while(!data.ready()&&Date.now()<limite) await sleep(500);
      const d=data.read();
      const g=typeof CFG.greeting==='function'?CFG.greeting(d,data):{text:data.fill(CFG.greeting,d)};
      const txt=typeof g==='string'?g:g.text;
      if(txt) gael.say(txt,{type:(typeof g==='object'&&g.type)||'info',duration:(typeof g==='object'&&g.duration)||8000});
      data.lastTalk=Date.now();
    } else {
      gael.say(typeof CFG.greeting==='function'?CFG.greeting({}):CFG.greeting,{duration:5000});
    }
  }
  if(data) data.watch();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();

})();
