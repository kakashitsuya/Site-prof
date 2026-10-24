/* Mon espace de classe : progression + notes et classement */
(function(){

var DAY=86400000,WK=7*DAY;
function U(y,m,d){return Date.UTC(y,m-1,d)}
var START=U(2026,9,14),END=U(2027,6,7);
var HOL=[[U(2026,10,23),U(2026,11,1),"Congé de Toussaint"],[U(2026,12,18),U(2027,1,3),"Vacances de Noël"],[U(2027,2,5),U(2027,2,14),"Congé de février"],[U(2027,3,19),U(2027,4,4),"Vacances de Pâques"]];
var DN=["lundi","mardi","mercredi","jeudi","vendredi"];
var CAL=[],cnt=0;
for(var m=START;m<=END;m+=WK){
  var off=0,first=-1,name="";
  for(var k=0;k<5;k++){var tt=m+k*DAY;HOL.forEach(function(h){if(tt>=h[0]&&tt<=h[1]){off++;name=h[2];if(first<0)first=k}})}
  if(off===5)CAL.push({m:m,off:true,name:name});
  else{cnt++;CAL.push({m:m,n:cnt,note:off?name+" dès le "+DN[first]:""})}
}
[U(2026,11,30),U(2027,3,8),U(2027,6,7)].forEach(function(x){CAL.forEach(function(c){if(c.m===x)c.dn=true})});
var LV={
"6":[["1. Nombres entiers naturels",9],["2. Droites et points",11],["3. Nombres décimaux relatifs",15],["4. Segments",5],["5. Pavés droits et cylindres droits",7],["6. Fractions",7],["7. Cercles et disques",7],["8. Angles",7],["9. Triangles",7],["10. Proportionnalité",7],["11. Figures symétriques par rapport à un point",11],["12. Statistique",5],["13. Parallélogramme",9]],
"5":[["1. Nombres premiers",13],["2. Segments",7],["3. Angles",7],["4. Nombres décimaux relatifs",11],["5. Figures symétriques par rapport à une droite",13],["6. Fractions",9],["7. Prismes droits",7],["8. Triangles",11],["9. Proportionnalité",9],["10. Cercles",5],["11. Statistique",7],["12. Parallélogrammes particuliers",9]],
"4":[["1. Nombres décimaux relatifs",7],["2. Angles",9],["3. Nombres rationnels",15],["4. Distances",7],["5. Perspective cavalière",9],["6. Calcul littéral",9],["7. Cercles et triangles",11],["8. Équations et inéquations dans ℚ",7],["9. Vecteurs",13],["10. Statistique",7],["11. Symétries et translations",15]]};
/* Chaque semaine : [titres, régulation ?, % en fin de semaine, heures cumulées, détail des leçons] */
function build(ls){
  var bl=[["Séances de révisions",8]];ls.forEach(function(l){bl.push(l);bl.push(["R",1])});
  var W=[],pos=0,st=[];bl.forEach(function(b){st.push(pos);pos+=b[1]});
  for(var k=1;k<=32;k++){
    var a=4*(k-1),z=4*k,nm=[],lh=[],reg=false;
    bl.forEach(function(b,i){var s0=st[i],e0=s0+b[1];if(e0>a&&s0<z){if(b[0]==="R")reg=true;else if(nm.indexOf(b[0])<0){nm.push(b[0]);var r=(b[0]==="Séances de révisions")?0:1;lh.push({n:b[0],h:b[1],r:r,t:b[1]+r})}}});
    W.push([nm.join(" → "),reg,z/128*100,z,lh]);
  }
  return W;
}
var LVL="6";try{LVL=localStorage.getItem("espace-niveau")||"6"}catch(e){}
if(!LV[LVL])LVL="6";
var W=build(LV[LVL]);

var M=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function fmt(t){var x=new Date(t);return x.getUTCDate()+" "+M[x.getUTCMonth()]}
function pct(v){return String(Math.round(v*100)/100).replace(".",",")}
function hh(x){return String(Math.round(x*100)/100).replace(".",",")}
function today(){var n=new Date();return Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())}
function rng(m){return fmt(m)+" – "+fmt(m+4*DAY)}
function render(t){
  var h=document.getElementById("hero"),dw=new Date(t).getUTCDay(),we=(dw===0||dw===6);
  var m=t-((dw+6)%7)*DAY;if(we)m+=WK;
  var cur=-1;CAL.forEach(function(c,i){if(c.m===m)cur=i});
  var wn=we?'<span class="tag">Week-end : semaine suivante</span>':'';
  if(m<START){h.innerHTML='<p class="eyebrow">Rentrée</p><p class="big word">Bientôt</p><p class="dates">La semaine 1 commence le lundi '+fmt(START)+' 2026.</p>';}
  else if(cur<0){h.innerHTML='<p class="eyebrow">Année scolaire</p><p class="big word">Terminé</p><p class="dates">L’année scolaire s’est terminée le vendredi 11 juin 2027.</p>';}
  else{
    var c=CAL[cur];
    if(c.off){
      var nx=CAL[cur+1];
      h.innerHTML='<div class="hero-h"><div><p class="eyebrow">Pas de cours</p><p class="big word">Congé</p></div>'+wn+'</div>'+
      '<p class="dates">du lundi '+fmt(c.m)+' au vendredi '+fmt(c.m+4*DAY)+'</p><p class="lesson">'+c.name+'</p>'+
      (nx?'<p class="note">Reprise le lundi '+fmt(nx.m)+' avec la semaine '+nx.n+'.</p>':'');
    }else{
      var w=W[c.n-1],tg='';
      if(w&&w[1])tg+='<span class="tag red">Régulation</span>';
      if(c.dn)tg+='<span class="tag red">Devoir de niveau</span>';
      if(c.note)tg+='<span class="tag">'+c.note+'</span>';
      tg+=wn;
      h.innerHTML='<div class="hero-h"><div><p class="eyebrow">Semaine</p><p class="big">'+c.n+'<small>/ 32</small></p></div></div>'+
      '<p class="dates">du lundi '+fmt(c.m)+' au vendredi '+fmt(c.m+4*DAY)+'</p>'+
      (w?'<p class="lesson">'+w[0]+'</p>'+(tg?'<div class="tags">'+tg+'</div>':'')+
        (w[1]?'<p class="note">Régulation : remédiation et évaluation des acquis, 1 h cumulée sur la leçon, peut se faire en TD.</p>':'')+
        (c.dn?'<p class="note">Fin de trimestre : devoir de niveau.</p>':'')+
        '<div><p class="label">Les 4 h de la semaine</p><div class="split"><i></i><i></i></div><p class="legend"><span>3 h cours, exercices et TD</span><span>1 h IE, DS et comptes rendus</span></p></div>'+
        '<div class="scroll"><table class="hrs"><tr><th>Leçon</th><th>Total</th><th>Cours, TD</th><th>IE, DS</th></tr>'+
        w[4].map(function(l){return'<tr><td>'+l.n+'<small>'+hh(l.h)+' h'+(l.r?' + 1 h de régulation':'')+'</small></td><td>'+hh(l.t)+' h</td><td>'+hh(l.t*0.75)+' h</td><td>'+hh(l.t*0.25)+' h</td></tr>'}).join("")+'</table></div>'+
        '<div class="prog"><div class="prog-l"><span>Exécution en fin de semaine</span><b>'+pct(w[2])+' %</b></div><div class="bar"><i style="width:'+w[2]+'%"></i></div><p class="m" style="margin:0">'+w[3]+' h sur 128 h</p></div>'
      :'<p class="lesson">Hors progression</p>'+(tg?'<div class="tags">'+tg+'</div>':'')+'<p class="note">Les 32 semaines sont faites : marge ou évaluations avant la fin de l’année.</p>');
    }
  }
  var l="";
  CAL.forEach(function(c,i){
    var cl=i<cur?' past':i===cur?' now':'';
    if(c.off){l+='<li class="wk off'+cl+'"><span class="n">–</span><div><p class="t">'+c.name+'</p><p class="d">'+rng(c.m)+'</p></div></li>';return}
    var w=W[c.n-1],fl=[];
    if(w&&w[1])fl.push('régulation');if(c.dn)fl.push('devoir de niveau');
    l+='<li class="wk'+cl+'"><span class="n">'+c.n+'</span><div><p class="t">'+(w?w[0]:'Hors progression')+'</p><p class="d">'+rng(c.m)+(fl.length?' · <span class="flag">'+fl.join(', ')+'</span>':'')+(c.note?' · '+c.note:'')+'</p></div>'+
      (w?'<span class="p">'+pct(w[2])+' %<span class="mini"><i style="width:'+w[2]+'%"></i></span></span>':'<span></span>')+'</li>';
  });
  document.getElementById("list").innerHTML=l;svOut(cur);
}
var d=document.getElementById("d");
var t0=today();
d.value=new Date(t0).toISOString().slice(0,10);
d.addEventListener("change",function(){var p=d.value.split("-");if(p.length===3)curT=Date.UTC(+p[0],+p[1]-1,+p[2]);render(curT)});
var curT=t0;
function fillSv(){var cum=8,o=[["0","Rien encore (début d’année)"],["8","Séances de révisions terminées"]];
  LV[LVL].forEach(function(l){cum+=l[1]+1;o.push([cum,l[0]+" terminée"])});
  var sv="0";try{sv=localStorage.getItem("espace-fait-"+LVL)||"0"}catch(e){}
  document.getElementById("sv").innerHTML=o.map(function(x){return'<option value="'+x[0]+'"'+(String(x[0])===sv?' selected':'')+'>'+x[1]+'</option>'}).join("")}
function svOut(cur){var o=document.getElementById("sv-out");
  if(cur<0||!CAL[cur]||CAL[cur].m<START){o.textContent="";return}
  var c=CAL[cur],pn=c.off?(CAL[cur+1]?CAL[cur+1].n:33):c.n,pl=Math.min(128,4*(pn-1)),done=+document.getElementById("sv").value,d=done-pl;
  o.innerHTML='Prévu avant cette semaine : <b class="num">'+pl+' h</b> ('+pct(pl/128*100)+' %) · Fait : <b class="num">'+done+' h</b><br><b class="'+(d<0?'late':'ok')+'">'+(d===0?'Dans les temps':d>0?'En avance de '+d+' h ('+hh(d/4)+' sem.)':'En retard de '+(-d)+' h ('+hh(-d/4)+' sem.)')+'</b>'}
function chips(){document.getElementById("lv").innerHTML=["6","5","4"].map(function(l){return'<button class="'+(l===LVL?'on':'')+'" data-l="'+l+'" aria-pressed="'+(l===LVL)+'">'+l+'e</button>'}).join("")}
document.getElementById("lv").addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button"),l=b&&b.getAttribute("data-l");if(!l)return;LVL=l;W=build(LV[l]);try{localStorage.setItem("espace-niveau",l)}catch(x){}chips();fillSv();render(curT)});
document.getElementById("sv").addEventListener("change",function(){try{localStorage.setItem("espace-fait-"+LVL,this.value)}catch(x){}render(curT)});
fillSv();chips();render(t0);

})();

var KEY="notes-eleves-v1",S={classes:[],cur:null,tab:"saisie",ev:null,per:"1",cd:false,msg:""};
try{var raw=localStorage.getItem(KEY);if(raw){var p=JSON.parse(raw);S.classes=p.classes||[];S.cur=p.cur||null}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify({classes:S.classes,cur:S.cur}))}catch(e){}}
function id(){return Math.random().toString(36).slice(2,9)}
function esc(x){return String(x).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function C(){return S.classes.filter(function(c){return c.id===S.cur})[0]||S.classes[0]}
function E(c){return c.evals.filter(function(e){return e.id===S.ev})[0]}
function val(c,e,s){var g=(c.grades[e.id]||{})[s.id];if(g===undefined||g===""||g==="A")return null;var v=parseFloat(String(g).replace(",","."));return(isNaN(v)||v<0||v>e.max)?null:v}
function avgTri(c,s,t){var n=0,d=0;c.evals.forEach(function(e){if(e.tri!=t)return;var v=val(c,e,s);if(v===null)return;n+=v/e.max*20*e.coef;d+=e.coef});return d?n/d:null}
function avgPer(c,s,p){if(p!=="A")return avgTri(c,s,p);var a=[1,2,3].map(function(t){return avgTri(c,s,t)}).filter(function(x){return x!==null});return a.length?a.reduce(function(x,y){return x+y},0)/a.length:null}
function rank(rows){rows.forEach(function(o){o.r=o.v===null?null:1+rows.filter(function(q){return q.v!==null&&q.v>o.v+1e-9}).length});return rows}
function rl(r){return r===null?"–":r===1?"1er":r+"e"}
function f(v){return v===null?"—":(Math.round(v*100)/100).toString().replace(".",",")}
function appr(v){return v===null?"":v>=16?"Très bien":v>=14?"Bien":v>=12?"Assez bien":v>=10?"Passable":"Insuffisant"}
function apLv(v){return v===null?"":v>=16?4:v>=14?3:v>=12?2:v>=10?1:0}
function stats(vs){vs=vs.filter(function(v){return v!==null}).sort(function(a,b){return a-b});var n=vs.length;if(!n)return{n:0};var m=vs.reduce(function(a,b){return a+b},0)/n;return{n:n,m:m,min:vs[0],max:vs[n-1],med:n%2?vs[(n-1)/2]:(vs[n/2-1]+vs[n/2])/2,p:vs.filter(function(v){return v>=10}).length/n*100}}
function sb(st,lab){return'<div class="stats"><div>Moyenne'+lab+'<b>'+f(st.n?st.m:null)+'</b></div><div>Min / Max<b>'+(st.n?f(st.min)+' / '+f(st.max):'—')+'</b></div><div>Notes ≥ 10<b>'+(st.n?Math.round(st.p)+' %':'—')+'</b></div></div>'}
function byName(c){return c.students.slice().sort(function(a,b){return a.name.localeCompare(b.name,"fr")})}

function render(){
  var c=C(),h="";
  if(c&&!S.cur)S.cur=c.id;
  if(c)h+='<div><label class="label" for="cls">Classe</label><select id="cls" class="full" onchange="S.cur=this.value;S.ev=null;S.cd=false;S.msg=\'\';render()" style="font-weight:700">'+S.classes.map(function(k){return'<option value="'+k.id+'"'+(k.id===c.id?' selected':'')+'>'+esc(k.name)+' · '+k.students.length+' élèves</option>'}).join("")+'</select></div>';
  if(!c)S.tab="classes";
  h+='<div class="seg" role="tablist">'+[["saisie","Saisie"],["rang","Classement"],["classes","Classes"]].map(function(t){return'<button class="'+(S.tab===t[0]?'on':'')+'" onclick="S.tab=\''+t[0]+'\';S.msg=\'\';render()">'+t[1]+'</button>'}).join("")+'</div>';
  h+=S.tab==="saisie"?vSaisie(c):S.tab==="rang"?vRang(c):vClasses(c);
  document.getElementById("app").innerHTML='<div class="notes">'+h+'</div>';
  if(S.tab==="saisie"&&c&&E(c))upd();
}
function vSaisie(c){
  if(!c.students.length)return'<div class="card empty"><b>Aucun élève dans cette classe</b><p class="m">Ajoute d’abord tes élèves dans l’onglet Classes.</p></div>';
  var h='<details class="card fold"'+(c.evals.length?'':' open')+'><summary>Nouvelle évaluation</summary><div class="fold-b"><div class="form">'+
    '<label class="wide">Nom<input type="text" id="en" placeholder="ex. Devoir 1"></label>'+
    '<label>Trimestre<select id="et"><option value="1">T1</option><option value="2">T2</option><option value="3">T3</option></select></label>'+
    '<label>Coef<input type="number" id="ec" value="1" min="0.5" step="0.5" inputmode="decimal"></label>'+
    '<label>Noté sur<input type="number" id="em" value="20" min="1" inputmode="decimal"></label>'+
    '<button class="pri wide" onclick="addEv()">Créer l’évaluation</button></div></div></details>';
  if(!c.evals.length)return h;
  if(!E(c))S.ev=c.evals[c.evals.length-1].id;
  h+='<div><label class="label" for="evs">Évaluation</label><select id="evs" class="full" onchange="S.ev=this.value;render()">'+c.evals.map(function(e){return'<option value="'+e.id+'"'+(e.id===S.ev?' selected':'')+'>T'+e.tri+' · '+esc(e.name)+' (coef '+e.coef+', sur '+e.max+')</option>'}).join("")+'</select></div><div id="est"></div><div class="card list">';
  var e=E(c),g=c.grades[e.id]||{};
  h+='<div class="st h"><span>Élève</span><span>Note /'+e.max+'</span><span>Abs.</span><span>Rang</span></div>';
  byName(c).forEach(function(s){var a=g[s.id]==="A";
    h+='<div class="st"><span>'+esc(s.name)+'</span><input type="number" inputmode="decimal" step="0.25" min="0" max="'+e.max+'" id="g'+s.id+'" aria-label="Note de '+esc(s.name)+'" value="'+(a||g[s.id]===undefined?'':esc(g[s.id]))+'"'+(a?' disabled':'')+' oninput="setG(\''+s.id+'\',this.value)"><input type="checkbox" aria-label="Absent"'+(a?' checked':'')+' onchange="setA(\''+s.id+'\',this.checked)"><span class="rk" id="r'+s.id+'"></span></div>'});
  return h+'</div>';
}
function upd(){
  var c=C(),e=E(c),rows=rank(c.students.map(function(s){return{s:s,v:val(c,e,s)}}));
  rows.forEach(function(o){var r=document.getElementById("r"+o.s.id),i=document.getElementById("g"+o.s.id);if(r)r.textContent=o.v===null?"":rl(o.r);if(i){var raw=i.value;i.className=(raw!==""&&!i.disabled&&o.v===null)?"bad":""}});
  document.getElementById("est").innerHTML=sb(stats(rows.map(function(o){return o.v})),"")+'<p class="m" style="margin:8px 0 0">'+rows.filter(function(o){return o.v!==null}).length+' notes sur '+rows.length+' élèves'+(rows.some(function(o){return(c.grades[e.id]||{})[o.s.id]==="A"})?' (absents exclus)':'')+'</p>';
}
function setG(sid,v){var c=C(),e=E(c);(c.grades[e.id]=c.grades[e.id]||{})[sid]=v;save();upd()}
function setA(sid,a){var c=C(),e=E(c);(c.grades[e.id]=c.grades[e.id]||{})[sid]=a?"A":"";save();render()}
function addEv(){var c=C(),n=document.getElementById("en").value.trim();if(!n){document.getElementById("en").focus();return}var e={id:id(),name:n,tri:document.getElementById("et").value,coef:parseFloat(document.getElementById("ec").value)||1,max:parseFloat(document.getElementById("em").value)||20};c.evals.push(e);c.grades[e.id]={};S.ev=e.id;save();render()}

function vRang(c){
  if(!c.students.length)return'<div class="card empty"><b>Aucun élève dans cette classe</b><p class="m">Ajoute tes élèves dans l’onglet Classes pour voir le classement.</p></div>';
  var P=[["1","T1"],["2","T2"],["3","T3"],["A","Année"]];
  var h='<div class="seg">'+P.map(function(p){return'<button class="'+(S.per===p[0]?'on':'')+'" onclick="S.per=\''+p[0]+'\';S.msg=\'\';render()">'+p[1]+'</button>'}).join("")+'</div>';
  var rows=rank(c.students.map(function(s){return{s:s,v:avgPer(c,s,S.per)}}));
  rows.sort(function(a,b){return(a.r===null)-(b.r===null)||(a.r-b.r)||a.s.name.localeCompare(b.s.name,"fr")});
  S.txt=rows.map(function(o){return rl(o.r)+"\t"+o.s.name+"\t"+f(o.v)+"\t"+appr(o.v)}).join("\n");
  var st=stats(rows.map(function(o){return o.v}));
  h+='<div>'+sb(st,' de classe');
  if(st.n)h+='<p class="m" style="margin:8px 0 0">Médiane : '+f(st.med)+' · '+st.n+' élèves classés sur '+rows.length+(S.per==="A"?' · moyenne annuelle = moyenne des trimestres':'')+'</p>';
  h+='</div><div class="card scroll"><table class="rank"><tr><th>Rang</th><th>Élève</th><th class="n">Moy./20</th><th>Appréciation</th></tr>'+rows.map(function(o){return'<tr><td class="rk'+(o.r===null?' none':'')+'" style="text-align:left">'+rl(o.r)+'</td><td>'+esc(o.s.name)+'</td><td class="n">'+f(o.v)+'</td><td>'+(o.v===null?'':'<span class="ap a'+apLv(o.v)+'">'+appr(o.v)+'</span>')+'</td></tr>'}).join("")+'</table></div>';
  return h+'<div class="row"><button onclick="cp(S.txt)">Copier le classement</button><span class="msg">'+esc(S.msg)+'</span></div>';
}
function cp(t){S.msg="";try{navigator.clipboard.writeText(t).then(function(){S.msg="Copié.";render()},function(){S.msg="Copie impossible sur cet appareil.";render()})}catch(e){S.msg="Copie impossible sur cet appareil.";render()}}

function vClasses(c){
  var h=c?'':'<div class="card empty"><b>Bienvenue</b><p class="m">Crée ta première classe, ajoute tes élèves, puis saisis les notes dans l’onglet Saisie.</p></div>';
  h+='<div class="card"><b>Nouvelle classe</b><div class="row"><input type="text" id="nc" placeholder="ex. 6e A" aria-label="Nom de la classe"><button class="pri" onclick="addC()">Ajouter</button></div></div>';
  if(c){
    h+='<div class="card"><b>Élèves de '+esc(c.name)+'</b><p class="m">Un élève par ligne (Nom Prénom). Tu peux coller une liste entière.</p><textarea id="ns" aria-label="Liste des élèves"></textarea><div class="row" style="margin-top:8px"><button class="pri" onclick="addS()">Ajouter les élèves</button></div>'+
    (c.students.length?'<div class="list" style="margin-top:10px">'+byName(c).map(function(s){return'<div class="st two"><span>'+esc(s.name)+'</span><button class="x" aria-label="Retirer '+esc(s.name)+'" onclick="delS(\''+s.id+'\')">✕</button></div>'}).join("")+'</div>':'')+'</div>';
    if(c.evals.length)h+='<div class="card"><b>Évaluations</b><div class="list">'+c.evals.map(function(e){return'<div class="st two"><span>T'+e.tri+' · '+esc(e.name)+' <small>coef '+e.coef+', sur '+e.max+'</small></span><button class="x" aria-label="Supprimer '+esc(e.name)+'" onclick="delE(\''+e.id+'\')">✕</button></div>'}).join("")+'</div></div>';
    h+='<div class="row"><button class="dng'+(S.cd?' sure':'')+'" onclick="delC()">'+(S.cd?'Confirmer : supprimer '+esc(c.name)+' et ses notes':'Supprimer la classe '+esc(c.name))+'</button>'+(S.cd?'<button onclick="S.cd=false;render()">Annuler</button>':'')+'</div>';
  }
  h+='<h2>Sauvegarde</h2><div class="card"><p class="m">Les données restent dans ce navigateur, sur cet appareil. Exporte-les pour les garder ailleurs, puis colle le texte et touche Restaurer pour les récupérer.</p><textarea id="bk" aria-label="Texte de sauvegarde"></textarea><div class="row" style="margin-top:8px"><button onclick="ex()">Exporter</button><button onclick="im()">Restaurer</button><span class="msg" id="bkmsg">'+esc(S.msg)+'</span></div></div>';
  return h;
}
function addC(){var n=document.getElementById("nc").value.trim();if(!n){document.getElementById("nc").focus();return}var c={id:id(),name:n,students:[],evals:[],grades:{}};S.classes.push(c);S.cur=c.id;S.ev=null;S.cd=false;save();render()}
function addS(){var c=C();document.getElementById("ns").value.split("\n").forEach(function(l){l=l.trim();if(l)c.students.push({id:id(),name:l})});save();render()}
function delS(i){var c=C();c.students=c.students.filter(function(s){return s.id!==i});for(var k in c.grades)delete c.grades[k][i];save();render()}
function delE(i){var c=C();c.evals=c.evals.filter(function(e){return e.id!==i});delete c.grades[i];if(S.ev===i)S.ev=null;save();render()}
function delC(){if(!S.cd){S.cd=true;render();return}S.classes=S.classes.filter(function(k){return k.id!==C().id});S.cur=null;S.ev=null;S.cd=false;save();render()}
function ex(){var t=JSON.stringify({classes:S.classes}),b=document.getElementById("bk"),m=document.getElementById("bkmsg");b.value=t;b.select();m.textContent="Texte prêt : copie-le.";try{navigator.clipboard.writeText(t).then(function(){m.textContent="Copié dans le presse-papiers."},function(){})}catch(e){}}
function im(){try{var d=JSON.parse(document.getElementById("bk").value);if(!d.classes)throw 0;S.classes=d.classes;S.cur=null;S.ev=null;save();S.msg="Restauré.";render()}catch(e){S.msg="";document.getElementById("bkmsg").textContent="Texte illisible : colle la sauvegarde complète."}}
render();

function showV(v){
  document.getElementById("v-sem").hidden=(v!=="sem");
  document.getElementById("v-notes").hidden=(v!=="notes");
  document.getElementById("b-sem").className=(v==="sem"?"on":"");
  document.getElementById("b-notes").className=(v==="notes"?"on":"");
  try{localStorage.setItem("espace-vue",v)}catch(e){}
}
var v0="sem";try{v0=localStorage.getItem("espace-vue")||"sem"}catch(e){}
showV(v0);
