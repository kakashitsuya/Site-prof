/* Photo parlante : anime la bouche d’un portrait au rythme d’une voix, entièrement dans le navigateur.
   Le visage est repéré par MediaPipe Face Landmarker ; la bouche s’ouvre en étirant, colonne par colonne,
   le bas du visage vers le bas, et l’intérieur de la bouche est dessiné dans l’espace libéré. */
(function(){
"use strict";
var MP="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
var MODEL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
var FPS=60,MAXSIDE=960;

function $(id){return document.getElementById(id)}
var cv=$("stage"),cx=cv.getContext("2d");
var img=null;      // canvas : la photo redimensionnée
var P=null;        // zone du visage redressée : {c, w (canvas de travail), cx, cy, ang, R, g (géométrie dans la zone)}
var buf=null,env=null,actx=null,src=null,t0=0,playing=false,rec=null,open=0,pick=null;
var blinkAt=2,opts={mouth:1,head:1,blink:true};

function st(id,t,bad){var e=$(id);e.textContent=t;e.className="pp-st"+(bad?" bad":"")}
function ac(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();return actx}
function upd(){var ok=!!(img&&P&&buf);$("b-play").disabled=!ok||!!rec;$("b-rec").disabled=!ok||!!rec;$("b-play").textContent=playing&&!rec?"■ Arrêter":"▶ Écouter"}

/* ---------- Photo ---------- */
function loadImage(file){
  if(!file||!/^image\//.test(file.type)){st("s-img","Ce fichier n’est pas une image.",true);return}
  var u=URL.createObjectURL(file),im=new Image();
  im.onload=function(){
    var k=Math.min(1,MAXSIDE/Math.max(im.naturalWidth,im.naturalHeight));
    var w=Math.round(im.naturalWidth*k/2)*2,h=Math.round(im.naturalHeight*k/2)*2;
    img=document.createElement("canvas");img.width=w;img.height=h;img.getContext("2d").drawImage(im,0,0,w,h);
    URL.revokeObjectURL(u);cv.width=w;cv.height=h;P=null;pick=null;
    $("ph").hidden=true;$("stage-box").classList.add("has");$("b-pick").hidden=false;
    stop();detect();upd();
  };
  im.onerror=function(){st("s-img","Impossible de lire cette image.",true)};
  im.src=u;
}

var lmk=null;
function landmarker(){
  if(!lmk)lmk=import(MP+"/vision_bundle.mjs").then(function(v){
    return v.FilesetResolver.forVisionTasks(MP+"/wasm").then(function(fs){
      return v.FaceLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:MODEL},runningMode:"IMAGE",numFaces:1});
    });
  });
  lmk.catch(function(){lmk=null});
  return lmk;
}
function detect(){
  st("s-img","Recherche du visage…");
  var mine=img;
  landmarker().then(function(fl){
    if(mine!==img)return;
    var r=fl.detect(img),l=r&&r.faceLandmarks&&r.faceLandmarks[0];
    if(!l){st("s-img","Aucun visage trouvé. Touche « Placer la bouche à la main ».",true);return}
    var p=function(i){return{x:l[i].x*img.width,y:l[i].y*img.height}};
    setGeo({cl:p(61),cr:p(291),up:p(13),lo:p(14),chin:p(152),
      eyes:[[p(33),p(133),p(159),p(145)],[p(362),p(263),p(386),p(374)]]});
    st("s-img","Visage trouvé ✓");upd();
  }).catch(function(){if(mine!==img)return;st("s-img","Détecteur de visage indisponible (connexion ?). Touche « Placer la bouche à la main ».",true)});
}

/* Géométrie à partir des deux coins de la bouche seulement (placement à la main). */
function manualGeo(a,b){
  var mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,w=Math.hypot(dx,dy),nx=-dy/w,ny=dx/w;
  if(ny<0){nx=-nx;ny=-ny}
  setGeo({cl:a,cr:b,up:{x:mx,y:my},lo:{x:mx,y:my},chin:{x:mx+nx*w*0.95,y:my+ny*w*0.95},eyes:null});
}

/* Redresse la zone du visage (roulis) pour que les déformations se fassent en colonnes verticales. */
function setGeo(f){
  var ang=f.eyes?Math.atan2(mid(f.eyes[1][0],f.eyes[1][1]).y-mid(f.eyes[0][0],f.eyes[0][1]).y,mid(f.eyes[1][0],f.eyes[1][1]).x-mid(f.eyes[0][0],f.eyes[0][1]).x)
                :Math.atan2(f.cr.y-f.cl.y,f.cr.x-f.cl.x);
  if(f.cr.x<f.cl.x){var t=f.cl;f.cl=f.cr;f.cr=t}
  var m=mid(f.up,f.lo),mw=Math.hypot(f.cr.x-f.cl.x,f.cr.y-f.cl.y);
  var c=f.eyes?mid(m,mid(mid(f.eyes[0][0],f.eyes[0][1]),mid(f.eyes[1][0],f.eyes[1][1]))):m;
  var R=Math.ceil(Math.max(dist(c,f.chin),f.eyes?dist(c,f.eyes[0][0]):0,dist(c,f.cl))+mw*1.3);
  var co=Math.cos(-ang),si=Math.sin(-ang);
  function q(p){var x=p.x-c.x,y=p.y-c.y;return{x:x*co-y*si+R,y:x*si+y*co+R}}
  var cl=q(f.cl),cr=q(f.cr),um=q(m),ch=q(f.chin),y0=um.y,w=cr.x-cl.x;
  var g={mx:um.x,y0:y0,mw:w,yb:Math.min(2*R-2,ch.y+(ch.y-y0)*0.6),ya:y0-w*0.3,eyes:[]};
  if(f.eyes)f.eyes.forEach(function(e){var a=q(e[0]),b=q(e[1]),t=q(e[2]),d=q(e[3]);
    g.eyes.push({x:(a.x+b.x)/2,hw:Math.abs(b.x-a.x)/2,top:t.y,bot:d.y})});
  var pc=document.createElement("canvas");pc.width=pc.height=2*R;
  var k=pc.getContext("2d");k.translate(R,R);k.rotate(-ang);k.translate(-c.x,-c.y);k.drawImage(img,0,0);
  var wc=document.createElement("canvas");wc.width=wc.height=2*R;
  P={c:pc,w:wc,cx:c.x,cy:c.y,ang:ang,R:R,g:g};
}
function mid(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function fall(t){return t>=1?0:Math.pow(Math.cos(t*Math.PI/2),1.5)}

/* Dessine la zone du visage avec la bouche ouverte de « o » (0 à 1) et les paupières fermées de « b ». */
function warp(o,b){
  var g=P.g,s=P.c,k=P.w.getContext("2d"),R=P.R;
  k.globalCompositeOperation="source-over";k.clearRect(0,0,2*R,2*R);k.drawImage(s,0,0);
  if(o>0.01){
    var S=o*g.mw*0.3*opts.mouth,jw=g.mw*0.62,x0=Math.floor(g.mx-jw),x1=Math.ceil(g.mx+jw),x,wt,top=[],bot=[];
    for(x=x0;x<=x1;x++){wt=fall(Math.abs(x+0.5-g.mx)/jw)*S;top.push(g.y0-0.22*wt);bot.push(g.y0+0.78*wt)}
    // intérieur de la bouche
    k.save();k.beginPath();
    for(x=x0;x<=x1;x++)k.lineTo(x+0.5,top[x-x0]);
    for(x=x1;x>=x0;x--)k.lineTo(x+0.5,bot[x-x0]);
    k.closePath();
    var gr=k.createRadialGradient(g.mx,g.y0+S*0.3,0,g.mx,g.y0+S*0.3,g.mw*0.5);
    gr.addColorStop(0,"#2b0b0d");gr.addColorStop(1,"#4a1c1c");k.fillStyle=gr;k.fill();k.clip();
    // langue, puis dents du haut
    k.fillStyle="rgba(150,60,62,.55)";k.beginPath();k.ellipse(g.mx,g.y0+S*0.85,g.mw*0.26,S*0.32,0,0,7);k.fill();
    k.beginPath();var tw=g.mw*0.34;
    for(x=x0;x<=x1;x++)if(Math.abs(x+0.5-g.mx)<tw)k.lineTo(x+0.5,top[x-x0]-1);
    for(x=x1;x>=x0;x--)if(Math.abs(x+0.5-g.mx)<tw)k.lineTo(x+0.5,top[x-x0]+Math.min((bot[x-x0]-top[x-x0])*0.3,g.mw*0.09));
    k.closePath();var tg=k.createLinearGradient(g.mx-tw,0,g.mx+tw,0);
    tg.addColorStop(0,"rgba(200,188,175,.5)");tg.addColorStop(0.5,"rgba(238,232,222,.95)");tg.addColorStop(1,"rgba(200,188,175,.5)");
    k.fillStyle=tg;k.fill();k.restore();
    // lèvre et menton descendent, lèvre du haut remonte un peu
    for(x=x0;x<=x1;x++){var d=bot[x-x0]-g.y0,u=g.y0-top[x-x0];if(d<0.05)continue;
      k.drawImage(s,x,g.y0,1,g.yb-g.y0,x,g.y0+d,1,g.yb-g.y0-d);
      k.drawImage(s,x,g.ya,1,g.y0-g.ya,x,g.ya,1,g.y0-g.ya-u)}
  }
  if(b>0.02)g.eyes.forEach(function(e){
    var hw=e.hw*1.2,hh=e.hw*0.9,H=Math.max(2,e.bot-e.top)*1.15;
    for(var x=Math.floor(e.x-hw);x<=Math.ceil(e.x+hw);x++){var d=b*fall(Math.abs(x+0.5-e.x)/hw)*H;if(d<0.05)continue;
      k.drawImage(s,x,e.top-hh,1,hh,x,e.top-hh,1,hh+d)}
  });
  // bords fondus pour raccorder la zone à la photo
  k.globalCompositeOperation="destination-in";
  var m=k.createRadialGradient(R,R,R*0.82,R,R,R);m.addColorStop(0,"#000");m.addColorStop(1,"rgba(0,0,0,0)");
  k.fillStyle=m;k.fillRect(0,0,2*R,2*R);
}

/* ---------- Rendu ---------- */
function frame(){
  requestAnimationFrame(frame);
  if(!img)return;
  var now=performance.now()/1000,target=0;
  if(playing&&env&&actx){var i=Math.floor((actx.currentTime-t0)*FPS);target=i>=0&&i<env.length?env[i]:0}
  open=playing?target:open*0.8;
  var bl=0;
  if(opts.blink&&P&&P.g.eyes.length){
    if(now>blinkAt+0.2)blinkAt=now+2+Math.random()*3.5;
    var u=(now-blinkAt)/0.2;if(u>=0&&u<=1)bl=u<0.4?u/0.4:1-(u-0.4)/0.6;
  }
  var W=cv.width,H=cv.height,h=pick?0:opts.head;
  cx.setTransform(1,0,0,1,0,0);cx.fillStyle="#000";cx.fillRect(0,0,W,H);
  if(h>0){
    var pv=P?{x:P.cx,y:P.cy+P.R*0.6}:{x:W/2,y:H*0.8},sc=1+0.03*h;
    var rot=h*(0.012*Math.sin(now*0.7)+0.007*Math.sin(now*1.9+1)+0.01*open);
    var tx=h*W*0.003*Math.sin(now*0.5+2),ty=h*(H*0.003*Math.sin(now*1.1)+(P?P.g.mw:W*0.1)*0.04*open);
    cx.translate(W/2,H/2);cx.scale(sc,sc);cx.translate(-W/2,-H/2);
    cx.translate(pv.x+tx,pv.y+ty);cx.rotate(rot);cx.translate(-pv.x,-pv.y);
  }
  cx.drawImage(img,0,0);
  if(P&&(open>0.01||bl>0.02)){warp(open,bl);cx.translate(P.cx,P.cy);cx.rotate(P.ang);cx.drawImage(P.w,-P.R,-P.R)}
  if(pick){cx.setTransform(1,0,0,1,0,0);var r=Math.max(4,W/120);
    pick.forEach(function(p){cx.beginPath();cx.arc(p.x,p.y,r,0,7);cx.fillStyle="#c42f28";cx.fill();cx.lineWidth=r/2;cx.strokeStyle="#fff";cx.stroke()})}
}
requestAnimationFrame(frame);

/* ---------- Voix ---------- */
function loadAudio(blob,label){
  st("s-aud","Lecture du son…");
  blob.arrayBuffer().then(function(ab){
    return new Promise(function(ok,ko){var p=ac().decodeAudioData(ab,ok,ko);if(p&&p.then)p.then(ok,ko)});
  }).then(function(b){
    stop();buf=b;env=envelope(b);
    st("s-aud",label+" · "+fmtD(b.duration));upd();
  }).catch(function(){st("s-aud","Impossible de lire ce son. Essaie un mp3 ou un wav.",true)});
}
function fmtD(s){s=Math.round(s);return Math.floor(s/60)+" min "+String(s%60).padStart(2,"0")+" s"}

/* Ouverture de la bouche image par image : volume (RMS) un peu en avance sur le son, normalisé puis lissé. */
function envelope(b){
  var n=b.length,ch=b.numberOfChannels,d=new Float32Array(n),c,i;
  for(c=0;c<ch;c++){var x=b.getChannelData(c);for(i=0;i<n;i++)d[i]+=x[i]/ch}
  var sr=b.sampleRate,N=Math.ceil(b.duration*FPS),win=Math.round(sr*0.03),r=new Float32Array(N);
  for(i=0;i<N;i++){var a=Math.max(0,Math.round((i/FPS+0.03)*sr)-win),e=Math.min(n,a+win),s=0;
    for(var j=a;j<e;j++)s+=d[j]*d[j];r[i]=e>a?Math.sqrt(s/(e-a)):0}
  var so=Array.prototype.slice.call(r).sort(function(p,q){return p-q}),ref=so[Math.floor(N*0.95)]||0,out=new Float32Array(N),cur=0;
  if(ref<1e-4)return out;
  var gate=ref*0.12;
  for(i=0;i<N;i++){var v=Math.min(1,Math.max(0,(r[i]-gate)/(ref-gate)));v=Math.pow(v,0.8);cur+=(v-cur)*(v>cur?0.55:0.3);out[i]=cur}
  return out;
}

var mic=null;
function toggleMic(){
  if(mic){mic.stop();return}
  if(!navigator.mediaDevices||!window.MediaRecorder){st("s-aud","Le micro n’est pas disponible dans ce navigateur.",true);return}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(sm){
    var ch=[],t=Date.now(),tm;
    mic=new MediaRecorder(sm);
    mic.ondataavailable=function(e){if(e.data.size)ch.push(e.data)};
    mic.onstop=function(){clearInterval(tm);sm.getTracks().forEach(function(k){k.stop()});mic=null;
      $("b-mic").textContent="● Enregistrer au micro";$("b-mic").classList.remove("live");
      loadAudio(new Blob(ch,{type:ch[0]?ch[0].type:"audio/webm"}),"Enregistrement")};
    mic.start();$("b-mic").textContent="■ Arrêter";$("b-mic").classList.add("live");
    tm=setInterval(function(){var s=(Date.now()-t)/1000;st("s-aud","Enregistrement… "+fmtD(s));if(s>=120)mic.stop()},250);
    st("s-aud","Enregistrement… 0 min 00 s");
  }).catch(function(){st("s-aud","Accès au micro refusé.",true)});
}

/* ---------- Lecture et vidéo ---------- */
function play(dest){
  stop();var a=ac();a.resume();
  src=a.createBufferSource();src.buffer=buf;src.connect(a.destination);if(dest)src.connect(dest);
  t0=a.currentTime+0.15;src.start(t0);playing=true;
  var me=src;src.onended=function(){if(src===me){playing=false;src=null;if(rec)setTimeout(function(){rec&&rec.stop()},250);upd()}};
  upd();
}
function stop(){if(src){var s=src;src=null;try{s.stop()}catch(e){}}playing=false;upd()}

function pickType(){
  var l=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
  for(var i=0;i<l.length;i++)if(MediaRecorder.isTypeSupported(l[i]))return l[i];
  return "";
}
function makeVideo(){
  if(!cv.captureStream||!window.MediaRecorder){st("s-out","Ce navigateur ne sait pas créer de vidéo. Essaie Chrome, Edge ou Firefox.",true);return}
  var a=ac(),dest=a.createMediaStreamDestination(),vs=cv.captureStream(30),ty=pickType(),ch=[];
  var sm=new MediaStream([vs.getVideoTracks()[0],dest.stream.getAudioTracks()[0]]);
  try{rec=new MediaRecorder(sm,ty?{mimeType:ty,videoBitsPerSecond:5e6}:{})}catch(e){rec=null;st("s-out","Création de la vidéo impossible ici.",true);return}
  rec.ondataavailable=function(e){if(e.data.size)ch.push(e.data)};
  rec.onstop=function(){vs.getTracks().forEach(function(k){k.stop()});rec=null;
    var t=(ch[0]&&ch[0].type)||ty||"video/webm",bl=new Blob(ch,{type:t}),u=URL.createObjectURL(bl),old=$("vid").src;
    if(old)URL.revokeObjectURL(old);
    $("vid").src=u;$("dl").href=u;$("dl").download="photo-parlante."+(/mp4/.test(t)?"mp4":"webm");
    $("out").hidden=false;st("s-out","Vidéo prête ✓");upd()};
  rec.start(200);play(dest);
  st("s-out","Création de la vidéo en cours ("+fmtD(buf.duration)+")… laisse cet onglet ouvert.");
}

/* ---------- Placement à la main ---------- */
function startPick(){stop();pick=[];P=null;st("s-img","Touche le coin GAUCHE de la bouche sur la photo.");upd()}
cv.addEventListener("click",function(e){
  if(!pick)return;
  var r=cv.getBoundingClientRect(),p={x:(e.clientX-r.left)*cv.width/r.width,y:(e.clientY-r.top)*cv.height/r.height};
  pick.push(p);
  if(pick.length===1){st("s-img","Touche maintenant le coin DROIT de la bouche.");return}
  manualGeo(pick[0],pick[1]);pick=null;st("s-img","Bouche placée ✓ (sans clignement des yeux)");upd();
});

/* ---------- Branchements ---------- */
$("f-img").onchange=function(){loadImage(this.files[0]);this.value=""};
$("f-aud").onchange=function(){var f=this.files[0];if(f)loadAudio(f,f.name);this.value=""};
$("b-mic").onclick=toggleMic;
$("b-pick").onclick=startPick;
$("b-play").onclick=function(){if(playing)stop();else play(null)};
$("b-rec").onclick=makeVideo;
$("o-mouth").oninput=function(){opts.mouth=+this.value};
$("o-head").oninput=function(){opts.head=+this.value};
$("o-blink").onchange=function(){opts.blink=this.checked};
var box=$("stage-box");
box.addEventListener("dragover",function(e){e.preventDefault();box.classList.add("over")});
box.addEventListener("dragleave",function(){box.classList.remove("over")});
box.addEventListener("drop",function(e){e.preventDefault();box.classList.remove("over");var f=e.dataTransfer.files[0];if(!f)return;
  if(/^audio\//.test(f.type))loadAudio(f,f.name);else loadImage(f)});
$("ph").onclick=function(){$("f-img").click()};
upd();
})();
