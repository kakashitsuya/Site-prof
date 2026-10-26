/* Photo parlante : anime un portrait au rythme d’une voix, entièrement dans le navigateur.
   Le visage est repéré par MediaPipe Face Landmarker. La bouche s’ouvre en étirant, colonne par colonne,
   le bas du visage vers le bas (l’intérieur de la bouche est dessiné dans l’espace libéré) ; paupières et
   sourcils se déforment de la même façon. La tête seule bouge ensuite grâce à une grille déformée en WebGL,
   avec des gestes pilotés par la voix : hochements sur les syllabes accentuées, changement de pose entre les phrases. */
(function(){
"use strict";
var MP="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
var MODEL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
var FPS=60,MAXSIDE=960,GRID=48;
var BROWS=[[70,63,105,66,107,46,53,52,65,55],[300,293,334,296,336,276,283,282,295,285]];

function $(id){return document.getElementById(id)}
var cv=$("stage"),bc=document.createElement("canvas"),bx=bc.getContext("2d"),G=null,c2=null;
var img=null;      // canvas : la photo redimensionnée
var P=null;        // zone du visage redressée : {c, w (canvas de travail), cx, cy, ang, R, g (géométrie dans la zone)}
var H=null;        // modèle de la tête pour les gestes : {c, ux, uy, L, a, b}
var buf=null,an=null,actx=null,src=null,t0=0,playing=false,rec=null,open=0,pick=null,last=-1;
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
    URL.revokeObjectURL(u);cv.width=bc.width=w;cv.height=bc.height=h;P=null;H=null;pick=null;
    initGL();
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
    setGeo({cl:p(61),cr:p(291),up:p(13),lo:p(14),chin:p(152),side:[p(234),p(454)],
      eyes:[[p(33),p(133),p(159),p(145)],[p(362),p(263),p(386),p(374)]],
      brows:BROWS.map(function(b){return b.map(p)})});
    st("s-img","Visage trouvé ✓");upd();
  }).catch(function(){if(mine!==img)return;st("s-img","Détecteur de visage indisponible (connexion ?). Touche « Placer la bouche à la main ».",true)});
}

/* Géométrie à partir des deux coins de la bouche seulement (placement à la main). */
function manualGeo(a,b){
  var mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,w=Math.hypot(dx,dy),nx=-dy/w,ny=dx/w;
  if(ny<0){nx=-nx;ny=-ny}
  setGeo({cl:a,cr:b,up:{x:mx,y:my},lo:{x:mx,y:my},chin:{x:mx+nx*w*0.95,y:my+ny*w*0.95},
    top:{x:mx-nx*w*1.3,y:my-ny*w*1.3},eyes:null,brows:null});
}

/* Redresse la zone du visage (roulis) pour que les déformations se fassent en colonnes verticales. */
function setGeo(f){
  if(f.cr.x<f.cl.x){var t=f.cl;f.cl=f.cr;f.cr=t}
  var em=f.eyes?mid(mid(f.eyes[0][0],f.eyes[0][1]),mid(f.eyes[1][0],f.eyes[1][1])):f.top;
  var ang=f.eyes?Math.atan2(mid(f.eyes[1][0],f.eyes[1][1]).y-mid(f.eyes[0][0],f.eyes[0][1]).y,mid(f.eyes[1][0],f.eyes[1][1]).x-mid(f.eyes[0][0],f.eyes[0][1]).x)
                :Math.atan2(f.cr.y-f.cl.y,f.cr.x-f.cl.x);
  var m=mid(f.up,f.lo),mw=Math.hypot(f.cr.x-f.cl.x,f.cr.y-f.cl.y);
  var c=f.eyes?mid(m,em):m;
  var R=Math.max(dist(c,f.chin),dist(c,f.cl));
  if(f.eyes)R=Math.max(R,dist(c,f.eyes[0][0]));
  if(f.brows)f.brows.forEach(function(b){b.forEach(function(p){R=Math.max(R,dist(c,p)+mw*0.5)})});
  R=Math.ceil(R+mw*1.3);
  var co=Math.cos(-ang),si=Math.sin(-ang);
  function q(p){var x=p.x-c.x,y=p.y-c.y;return{x:x*co-y*si+R,y:x*si+y*co+R}}
  var cl=q(f.cl),cr=q(f.cr),um=q(m),ch=q(f.chin),y0=um.y,w=cr.x-cl.x;
  var g={mx:um.x,y0:y0,mw:w,yb:Math.min(2*R-2,ch.y+(ch.y-y0)*0.6),ya:y0-w*0.3,eyes:[],brows:[]};
  if(f.eyes)f.eyes.forEach(function(e,i){var a=q(e[0]),b=q(e[1]),t=q(e[2]),d=q(e[3]);
    g.eyes.push({x:(a.x+b.x)/2,hw:Math.abs(b.x-a.x)/2,top:t.y,bot:d.y});
    if(f.brows){var bq=f.brows[i].map(q),xs=bq.map(function(p){return p.x}),mn=Math.min.apply(0,xs),mxx=Math.max.apply(0,xs);
      var by=bq.reduce(function(s,p){return s+p.y},0)/bq.length;
      if(t.y-by>2)g.brows.push({x:(mn+mxx)/2,hw:(mxx-mn)/2*1.15,y:by,lid:t.y})}
  });
  var pc=document.createElement("canvas");pc.width=pc.height=2*R;
  var k=pc.getContext("2d");k.translate(R,R);k.rotate(-ang);k.translate(-c.x,-c.y);k.drawImage(img,0,0);
  var wc=document.createElement("canvas");wc.width=wc.height=2*R;
  P={c:pc,w:wc,cx:c.x,cy:c.y,ang:ang,R:R,g:g};
  // tête : axe menton → yeux, ellipse qui englobe visage et cheveux
  var L=dist(f.chin,em),ux=(em.x-f.chin.x)/L,uy=(em.y-f.chin.y)/L;
  var fw=f.side?dist(f.side[0],f.side[1])/2:mw*1.5;
  H={c:em,ux:ux,uy:uy,L:L,a:L*1.2,b:Math.max(fw*1.3,L*0.85)};
}
function mid(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function fall(t){return t>=1?0:Math.pow(Math.cos(t*Math.PI/2),1.5)}

/* Dessine la zone du visage : bouche ouverte de « o », paupières fermées de « b », sourcils levés de « br » (0 à 1). */
function warp(o,b,br){
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
  // sourcils : le front se tasse vers le haut, la peau entre sourcil et paupière s’étire
  if(br>0.02)g.brows.forEach(function(e){
    var gap=e.lid-e.y,yT=e.y-gap*1.3,yS=e.y+gap*0.25,D=br*gap*0.4;
    for(var x=Math.floor(e.x-e.hw);x<=Math.ceil(e.x+e.hw);x++){var d=D*fall(Math.abs(x+0.5-e.x)/e.hw);if(d<0.05)continue;
      k.drawImage(s,x,yT,1,yS-yT,x,yT,1,yS-yT-d);
      k.drawImage(s,x,yS,1,e.lid-yS,x,yS-d,1,e.lid-yS+d)}
  });
  if(b>0.02)g.eyes.forEach(function(e){
    var hw=e.hw*1.2,Hh=Math.max(2,e.bot-e.top)*1.15,hh=Math.min(e.hw*0.9,Hh*2.5);
    for(var x=Math.floor(e.x-hw);x<=Math.ceil(e.x+hw);x++){var d=b*fall(Math.abs(x+0.5-e.x)/hw)*Hh;if(d<0.05)continue;
      k.drawImage(s,x,e.top-hh,1,hh,x,e.top-hh,1,hh+d)}
  });
  // bords fondus pour raccorder la zone à la photo
  k.globalCompositeOperation="destination-in";
  var m=k.createRadialGradient(R,R,R*0.82,R,R,R);m.addColorStop(0,"#000");m.addColorStop(1,"rgba(0,0,0,0)");
  k.fillStyle=m;k.fillRect(0,0,2*R,2*R);
}

/* ---------- Grille WebGL : seule la tête bouge, le décor reste en place ---------- */
function initGL(){
  if(G||c2)return resizeGL();
  var gl=cv.getContext("webgl",{preserveDrawingBuffer:true,alpha:false,antialias:true});
  if(!gl){c2=cv.getContext("2d");return}
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}
  var pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,"attribute vec2 p;attribute vec2 t;uniform vec2 z;varying vec2 v;void main(){v=t;gl_Position=vec4(p.x/z.x*2.-1.,1.-p.y/z.y*2.,0.,1.);}"));
  gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,"precision mediump float;varying vec2 v;uniform sampler2D s;void main(){gl_FragColor=texture2D(s,v);}"));
  gl.linkProgram(pr);gl.useProgram(pr);
  G={gl:gl,pr:pr,pb:gl.createBuffer(),tb:gl.createBuffer(),ib:gl.createBuffer(),tx:gl.createTexture(),z:gl.getUniformLocation(pr,"z")};
  gl.bindTexture(gl.TEXTURE_2D,G.tx);
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(function(p){gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE)});
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  resizeGL();
}
function resizeGL(){
  if(!G)return;
  var gl=G.gl,W=cv.width,Hh=cv.height,nx=GRID,ny=Math.max(8,Math.round(GRID*Hh/W)),i,j;
  var p0=new Float32Array((nx+1)*(ny+1)*2),uv=new Float32Array(p0.length),ix=new Uint16Array(nx*ny*6),n=0;
  for(j=0;j<=ny;j++)for(i=0;i<=nx;i++){var k=(j*(nx+1)+i)*2;uv[k]=i/nx;uv[k+1]=j/ny;p0[k]=uv[k]*W;p0[k+1]=uv[k+1]*Hh}
  for(j=0;j<ny;j++)for(i=0;i<nx;i++){var a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;ix.set([a,b,c,b,d,c],n);n+=6}
  G.p0=p0;G.p=new Float32Array(p0.length);G.n=n;
  gl.bindBuffer(gl.ARRAY_BUFFER,G.tb);gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);
  var lt=gl.getAttribLocation(G.pr,"t");gl.enableVertexAttribArray(lt);gl.vertexAttribPointer(lt,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,G.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ix,gl.STATIC_DRAW);
  gl.viewport(0,0,W,Hh);gl.uniform2f(G.z,W,Hh);
}
/* Déplace les points de la grille : rotation de la tête autour du cou, tournée (le nez bouge plus que les bords), hochement. */
function deform(roll,yaw,nod){
  var p0=G.p0,p=G.p,W=cv.width,Hh=cv.height,M=H;
  if(!M){p.set(p0);return}
  var ux=M.ux,uy=M.uy,sx=-uy,sy=ux,pvx=M.c.x-ux*M.L*1.25,pvy=M.c.y-uy*M.L*1.25,co=Math.cos(roll),si=Math.sin(roll),eg=Math.max(W,Hh)*0.04;
  var nr=M.L*0.6,ncx=M.c.x-ux*M.L*0.35,ncy=M.c.y-uy*M.L*0.35;
  for(var k=0;k<p0.length;k+=2){
    var x=p0[k],y=p0[k+1],dx=x-M.c.x,dy=y-M.c.y,al=dx*ux+dy*uy,ab=dx*sx+dy*sy,e=Math.sqrt(al*al/(M.a*M.a)+ab*ab/(M.b*M.b));
    var w=e<1?1:e>1.8?0:0.5+0.5*Math.cos((e-1)/0.8*Math.PI);
    w*=Math.min(1,Math.min(x,W-x,y,Hh-y)/eg);
    if(w<=0){p[k]=x;p[k+1]=y;continue}
    var rx=x-pvx,ry=y-pvy,nx2=pvx+rx*co-ry*si,ny2=pvy+rx*si+ry*co;
    var gn=Math.exp(-((x-ncx)*(x-ncx)+(y-ncy)*(y-ncy))/(nr*nr));
    nx2+=sx*yaw*(0.45+0.55*gn)-ux*nod*(0.6+0.4*gn);ny2+=sy*yaw*(0.45+0.55*gn)-uy*nod*(0.6+0.4*gn);
    p[k]=x+(nx2-x)*w;p[k+1]=y+(ny2-y)*w;
  }
}
function drawGL(){
  var gl=G.gl;
  gl.bindTexture(gl.TEXTURE_2D,G.tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bc);
  gl.bindBuffer(gl.ARRAY_BUFFER,G.pb);gl.bufferData(gl.ARRAY_BUFFER,G.p,gl.DYNAMIC_DRAW);
  var lp=gl.getAttribLocation(G.pr,"p");gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
  gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,G.n,gl.UNSIGNED_SHORT,0);
}

/* ---------- Gestes : ressorts amortis vers des poses choisies selon la voix ---------- */
function sp(k,z){return{x:0,v:0,t:0,k:k,z:z}}
var mo={roll:sp(10,0.9),yaw:sp(9,0.9),pitch:sp(45,0.45),brow:sp(70,1)},nextPose=0,browUntil=0,lastNow=0;
function step(s,dt){s.v+=(s.k*(s.t-s.x)-2*Math.sqrt(s.k)*s.z*s.v)*dt;s.x+=s.v*dt}
function rnd(a){return(Math.random()*2-1)*a}
function newPose(talk){mo.roll.t=rnd(talk?0.9:0.5);mo.yaw.t=rnd(talk?1:0.5);mo.pitch.t=rnd(0.25);nextPose=lastNow+(talk?1.4+Math.random()*2.2:3+Math.random()*3)}
function gestures(now,dt,i0,i1){
  var talk=false;
  if(an)for(var i=Math.max(0,i0);i<=i1&&i<an.ev.length;i++){
    var e=an.ev[i];talk=talk||an.talk[i]===1;
    if(e===2){newPose(true);if(Math.random()<0.35)blinkAt=now}              // début de phrase
    else if(e===1){var s=an.str[i];mo.pitch.v+=(2+3*s)*(Math.random()<0.8?1:-0.6);mo.yaw.v+=rnd(1.2*s);
      if(s>0.55&&Math.random()<0.5)browUntil=now+0.25+0.2*s}              // syllabe accentuée : hochement, parfois sourcils
    else if(e===3&&Math.random()<0.6)blinkAt=now+0.1;                      // fin de phrase
  }
  if(now>nextPose)newPose(talk);
  mo.brow.t=now<browUntil?1:0;
  for(var k in mo)step(mo[k],dt);
}

/* ---------- Rendu ---------- */
function frame(){
  requestAnimationFrame(frame);
  if(!img)return;
  var now=performance.now()/1000,dt=Math.min(0.05,Math.max(0.001,now-(lastNow||now))),target=0,i=-1;lastNow=now;
  if(playing&&an&&actx){i=Math.floor((actx.currentTime-t0)*FPS);target=i>=0&&i<an.open.length?an.open[i]:0}
  gestures(now,dt,last+1,i);if(i>=0)last=i;
  open=playing?target:open*0.8;
  var bl=0;
  if(opts.blink&&P&&P.g.eyes.length){
    if(now>blinkAt+0.2)blinkAt=now+2+Math.random()*3.5;
    var u=(now-blinkAt)/0.2;if(u>=0&&u<=1)bl=u<0.4?u/0.4:1-(u-0.4)/0.6;
  }
  var h=pick?0:opts.head,br=Math.max(0,mo.brow.x)*h;
  bx.setTransform(1,0,0,1,0,0);bx.drawImage(img,0,0);
  if(P&&(open>0.01||bl>0.02||br>0.02)){warp(open,bl,br);bx.translate(P.cx,P.cy);bx.rotate(P.ang);bx.drawImage(P.w,-P.R,-P.R);bx.setTransform(1,0,0,1,0,0)}
  if(pick){var r=Math.max(4,cv.width/120);
    pick.forEach(function(p){bx.beginPath();bx.arc(p.x,p.y,r,0,7);bx.fillStyle="#c42f28";bx.fill();bx.lineWidth=r/2;bx.strokeStyle="#fff";bx.stroke()})}
  if(G){
    var L=H?H.L:cv.height*0.3,breathe=Math.sin(now*1.6)*0.04+Math.sin(now*0.37)*0.05;
    deform(h*(0.05*mo.roll.x+0.006*Math.sin(now*0.8)),h*L*(0.07*mo.yaw.x+0.008*Math.sin(now*0.53)),h*L*(0.045*mo.pitch.x+0.006*breathe+0.012*open));
    drawGL();
  }else c2.drawImage(bc,0,0);
}
requestAnimationFrame(frame);

/* ---------- Voix ---------- */
function loadAudio(blob,label){
  st("s-aud","Lecture du son…");
  blob.arrayBuffer().then(function(ab){
    return new Promise(function(ok,ko){var p=ac().decodeAudioData(ab,ok,ko);if(p&&p.then)p.then(ok,ko)});
  }).then(function(b){
    stop();buf=b;an=analyse(b);
    st("s-aud",label+" · "+fmtD(b.duration));upd();
  }).catch(function(){st("s-aud","Impossible de lire ce son. Essaie un mp3 ou un wav.",true)});
}
function fmtD(s){s=Math.round(s);return Math.floor(s/60)+" min "+String(s%60).padStart(2,"0")+" s"}

/* Analyse image par image : ouverture de la bouche (volume un peu en avance sur le son, normalisé puis lissé),
   moments de parole, syllabes accentuées (pics du volume lissé) et débuts/fins de phrase (après un silence). */
function analyse(b){
  var n=b.length,ch=b.numberOfChannels,d=new Float32Array(n),c,i;
  for(c=0;c<ch;c++){var x=b.getChannelData(c);for(i=0;i<n;i++)d[i]+=x[i]/ch}
  var sr=b.sampleRate,N=Math.ceil(b.duration*FPS),win=Math.round(sr*0.03),r=new Float32Array(N);
  for(i=0;i<N;i++){var a=Math.max(0,Math.round((i/FPS+0.03)*sr)-win),e=Math.min(n,a+win),s=0;
    for(var j=a;j<e;j++)s+=d[j]*d[j];r[i]=e>a?Math.sqrt(s/(e-a)):0}
  var so=Array.prototype.slice.call(r).sort(function(p,q){return p-q}),ref=so[Math.floor(N*0.95)]||0;
  var o={open:new Float32Array(N),talk:new Uint8Array(N),ev:new Uint8Array(N),str:new Float32Array(N)};
  if(ref<1e-4)return o;
  var gate=ref*0.12,cur=0,sl=new Float32Array(N),sv=0;
  for(i=0;i<N;i++){var v=Math.min(1,Math.max(0,(r[i]-gate)/(ref-gate)));v=Math.pow(v,0.8);cur+=(v-cur)*(v>cur?0.55:0.3);o.open[i]=cur;
    sv+=(v-sv)*0.12;sl[i]=sv;o.talk[i]=sv>0.08?1:0}
  var quiet=99;
  for(i=0;i<N;i++){
    if(o.talk[i]){if(quiet>=15)o.ev[i]=2;quiet=0}
    else{quiet++;if(quiet===12)o.ev[i]=3}
    if(!o.ev[i]&&sl[i]>0.4){var pk=true,lo=sl[i];
      for(j=Math.max(0,i-9);j<=Math.min(N-1,i+9);j++){if(sl[j]>sl[i]||(sl[j]===sl[i]&&j<i))pk=false;lo=Math.min(lo,sl[j])}
      if(pk&&sl[i]-lo>0.15){o.ev[i]=1;o.str[i]=Math.min(1,sl[i])}}
  }
  return o;
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
  t0=a.currentTime+0.15;src.start(t0);playing=true;last=-1;
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
function startPick(){stop();pick=[];P=null;H=null;st("s-img","Touche le coin GAUCHE de la bouche sur la photo.");upd()}
cv.addEventListener("click",function(e){
  if(!pick)return;
  var r=cv.getBoundingClientRect(),p={x:(e.clientX-r.left)*cv.width/r.width,y:(e.clientY-r.top)*cv.height/r.height};
  pick.push(p);
  if(pick.length===1){st("s-img","Touche maintenant le coin DROIT de la bouche.");return}
  manualGeo(pick[0],pick[1]);pick=null;st("s-img","Bouche placée ✓ (sans clignement des yeux ni sourcils)");upd();
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
