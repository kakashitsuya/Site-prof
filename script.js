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
function build(ls){
  var bl=[["Séances de révisions",8]];ls.forEach(function(l){bl.push(l);bl.push(["R",1])});
  var W=[],pos=0,st=[];bl.forEach(function(b){st.push(pos);pos+=b[1]});
  for(var k=1;k<=32;k++){
    var a=4*(k-1),z=4*k,nm=[],lh=[],reg=false;
    bl.forEach(function(b,i){var s0=st[i],e0=s0+b[1];if(e0>a&&s0<z){if(b[0]==="R")reg=true;else if(nm.indexOf(b[0])<0){nm.push(b[0]);var r=(b[0]==="Séances de révisions")?0:1,t=b[1]+r;lh.push(b[0]+" : "+hh(b[1])+" h"+(r?" + 1 h de régulation":"")+" = "+hh(t)+" h → "+hh(t*0.75)+" h cours, exercices et TD + "+hh(t*0.25)+" h IE, DS et comptes rendus")}}});
    W.push([nm.join(" → "),reg?"Régulation":"",z/128*100,z,lh]);
  }
  return W;
}
var LVL="6";try{LVL=localStorage.getItem("espace-niveau")||"6"}catch(e){}
if(!LV[LVL])LVL="6";
var W=build(LV[LVL]);

var M=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function fmt(t){var x=new Date(t);return x.getUTCDate()+" "+M[x.getUTCMonth()]}
function pct(v){return String(v).replace(".",",")}
function today(){var n=new Date();return Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())}
function rng(m){return fmt(m)+" – "+fmt(m+4*DAY)}
function render(t){
  var h=document.getElementById("hero"),dw=new Date(t).getUTCDay(),we=(dw===0||dw===6);
  var m=t-((dw+6)%7)*DAY;if(we)m+=WK;
  var cur=-1;CAL.forEach(function(c,i){if(c.m===m)cur=i});
  var wn=we?' (week-end : semaine suivante)':'';
  if(m<START){h.innerHTML='<p class="big">Bientôt</p><p class="dates">La semaine 1 commence le lundi '+fmt(START)+' 2026.</p>';}
  else if(cur<0){h.innerHTML='<p class="big">Terminé</p><p class="dates">L\u2019année scolaire se termine le 11 juin 2027.</p>';}
  else{
    var c=CAL[cur];
    if(c.off){
      var nx=CAL[cur+1];
      h.innerHTML='<p class="big">Congé</p><p class="dates">du lundi '+fmt(c.m)+' au vendredi '+fmt(c.m+4*DAY)+wn+'</p><p class="lesson">'+c.name+'</p>'+
      (nx?'<p class="taux">Reprise le lundi '+fmt(nx.m)+' : semaine '+nx.n+'.</p>':'');
    }else{
      var w=W[c.n-1];
      h.innerHTML='<p class="big">Semaine '+c.n+'</p><p class="dates">du lundi '+fmt(c.m)+' au vendredi '+fmt(c.m+4*DAY)+wn+'</p>'+
      (w?'<p class="lesson">'+w[0]+'</p>'+'<p class="taux" style="margin:0 0 6px">'+w[4].join("<br>")+'</p>'+(w[1]?'<p class="reg">Régulation : remédiation et évaluation des acquis (1 h cumulée sur la leçon, peut se faire en TD)</p>':'')+(c.note?'<p class="reg">'+c.note+'</p>':'')+(c.dn?'<p class="reg">Fin de trimestre : devoir de niveau</p>':'')+
      '<p class="taux" style="margin:0 0 8px">Sur les 4 h de la semaine : 3 h cours, exercices et TD + 1 h IE, DS et comptes rendus</p><div class="bar"><i style="width:'+w[2]+'%"></i></div><p class="taux">Taux d\u2019exécution en fin de semaine : '+pct(w[2])+' % ('+w[3]+'/128)</p>'
      :'<p class="lesson">Hors progression</p><p class="taux">Les 32 semaines sont faites : marge ou évaluations avant la fin de l\u2019année.</p>');
    }
  }
  var l="";
  CAL.forEach(function(c,i){
    var cl=i<cur?'past':i===cur?'now':'';
    if(c.off){l+='<li class="off '+cl+'"><b>–</b><span>'+c.name+'<small>'+rng(c.m)+'</small></span></li>';return}
    var w=W[c.n-1];
    l+='<li class="'+cl+'"><b>'+c.n+'</b><span>'+(w?w[0]+(w[1]?' + régulation':''):'Hors progression')+'<small>'+rng(c.m)+(w?' · '+pct(w[2])+' %':'')+(c.note?' · '+c.note:'')+(c.dn?' · devoir de niveau':'')+'</small></span></li>';
  });
  document.getElementById("list").innerHTML=l;svOut(cur);
}
var d=document.getElementById("d");
var t0=today();
d.value=new Date(t0).toISOString().slice(0,10);
d.addEventListener("change",function(){var p=d.value.split("-");if(p.length===3)curT=Date.UTC(+p[0],+p[1]-1,+p[2]);render(curT)});
var curT=t0;
function hh(x){return String(Math.round(x*100)/100).replace(".",",")}
function fillSv(){var cum=8,o=[["0","Rien encore (début d\u2019année)"],["8","Séances de révisions terminées"]];
  LV[LVL].forEach(function(l){cum+=l[1]+1;o.push([cum,l[0]+" terminée"])});
  var sv="0";try{sv=localStorage.getItem("espace-fait-"+LVL)||"0"}catch(e){}
  document.getElementById("sv").innerHTML=o.map(function(x){return'<option value="'+x[0]+'"'+(String(x[0])===sv?' selected':'')+'>'+x[1]+'</option>'}).join("")}
function svOut(cur){var o=document.getElementById("sv-out");
  if(cur<0||!CAL[cur]||CAL[cur].m<START){o.textContent="";return}
  var c=CAL[cur],pn=c.off?(CAL[cur+1]?CAL[cur+1].n:33):c.n,pl=Math.min(128,4*(pn-1)),done=+document.getElementById("sv").value,d=done-pl;
  o.innerHTML='Prévu avant cette semaine : <b>'+pl+' h</b> ('+pct(pl/128*100)+' %) · Fait : <b>'+done+' h</b><br><b style="color:'+(d<0?'var(--accent)':'var(--ok)')+'">'+(d===0?'Dans les temps':d>0?'En avance de '+d+' h ('+hh(d/4)+' sem.)':'En retard de '+(-d)+' h ('+hh(-d/4)+' sem.)')+'</b>'}
function chips(){document.getElementById("lv").innerHTML=["6","5","4"].map(function(l){return'<button class="'+(l===LVL?'on':'')+'" data-l="'+l+'">'+l+'e</button>'}).join("")}
document.getElementById("lv").addEventListener("click",function(e){var l=e.target.getAttribute&&e.target.getAttribute("data-l");if(!l)return;LVL=l;W=build(LV[l]);try{localStorage.setItem("espace-niveau",l)}catch(x){}chips();fillSv();render(curT)});
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
function stats(vs){vs=vs.filter(function(v){return v!==null}).sort(function(a,b){return a-b});var n=vs.length;if(!n)return{n:0};var m=vs.reduce(function(a,b){return a+b},0)/n;return{n:n,m:m,min:vs[0],max:vs[n-1],med:n%2?vs[(n-1)/2]:(vs[n/2-1]+vs[n/2])/2,p:vs.filter(function(v){return v>=10}).length/n*100}}
function sb(st,lab){return'<div class="s"><div>Moyenne'+lab+'<b>'+f(st.n?st.m:null)+'</b></div><div>Min / Max<b>'+(st.n?f(st.min)+' / '+f(st.max):'—')+'</b></div><div>≥ 10<b>'+(st.n?Math.round(st.p)+' %':'—')+'</b></div></div>'}
function byName(c){return c.students.slice().sort(function(a,b){return a.name.localeCompare(b.name,"fr")})}

function render(){
  var c=C(),h="";
  if(c&&!S.cur)S.cur=c.id;
  if(c)h+='<select onchange="S.cur=this.value;S.ev=null;S.cd=false;render()" style="width:100%;font-weight:700">'+S.classes.map(function(k){return'<option value="'+k.id+'"'+(k.id===c.id?' selected':'')+'>'+esc(k.name)+' ('+k.students.length+' élèves)</option>'}).join("")+'</select>';
  if(!c)S.tab="classes";
  h+='<div class="tabs">'+[["saisie","Saisie"],["rang","Classement"],["classes","Classes"]].map(function(t){return'<button class="'+(S.tab===t[0]?'on':'')+'" onclick="S.tab=\''+t[0]+'\';render()">'+t[1]+'</button>'}).join("")+'</div>';
  h+=S.tab==="saisie"?vSaisie(c):S.tab==="rang"?vRang(c):vClasses(c);
  document.getElementById("app").innerHTML=h;
  if(S.tab==="saisie"&&c&&E(c))upd();
}
function vSaisie(c){
  if(!c.students.length)return'<p class="m">Ajoute d’abord des élèves dans l’onglet Classes.</p>';
  var h='<details class="card"'+(c.evals.length?'':' open')+'><summary><b>Nouvelle évaluation</b></summary><div class="row" style="margin-top:8px"><input type="text" id="en" placeholder="Nom (ex. Devoir 1)"><select id="et"><option value="1">T1</option><option value="2">T2</option><option value="3">T3</option></select></div><div class="row"><label>Coef <input type="number" id="ec" value="1" min="0.5" step="0.5" style="width:70px"></label><label>Sur <input type="number" id="em" value="20" min="1" style="width:70px"></label><button class="pri" onclick="addEv()">Créer</button></div></details>';
  if(!c.evals.length)return h;
  if(!E(c))S.ev=c.evals[c.evals.length-1].id;
  h+='<select style="width:100%;margin-bottom:10px" onchange="S.ev=this.value;render()">'+c.evals.map(function(e){return'<option value="'+e.id+'"'+(e.id===S.ev?' selected':'')+'>T'+e.tri+' · '+esc(e.name)+' (coef '+e.coef+', /'+e.max+')</option>'}).join("")+'</select><div id="est"></div><div class="card">';
  var e=E(c),g=c.grades[e.id]||{};
  h+='<div class="st"><small>Élève</small><small style="text-align:right">Note</small><small>Abs.</small><small>Rang</small></div>';
  byName(c).forEach(function(s){var a=g[s.id]==="A";
    h+='<div class="st"><span>'+esc(s.name)+'</span><input type="number" inputmode="decimal" step="0.25" id="g'+s.id+'" value="'+(a||g[s.id]===undefined?'':g[s.id])+'"'+(a?' disabled':'')+' oninput="setG(\''+s.id+'\',this.value)"><input type="checkbox"'+(a?' checked':'')+' onchange="setA(\''+s.id+'\',this.checked)"><span class="rk" id="r'+s.id+'"></span></div>'});
  return h+'</div>';
}
function upd(){
  var c=C(),e=E(c),rows=rank(c.students.map(function(s){return{s:s,v:val(c,e,s)}}));
  rows.forEach(function(o){var r=document.getElementById("r"+o.s.id),i=document.getElementById("g"+o.s.id);if(r)r.textContent=o.v===null?"":rl(o.r);if(i){var raw=i.value;i.className=(raw!==""&&!i.disabled&&o.v===null)?"bad":""}});
  document.getElementById("est").innerHTML=sb(stats(rows.map(function(o){return o.v})),"")+'<p class="m" style="margin:-4px 0 8px">'+rows.filter(function(o){return o.v!==null}).length+' notes sur '+rows.length+' élèves'+(rows.some(function(o){return(c.grades[e.id]||{})[o.s.id]==="A"})?' (absents exclus)':'')+'</p>';
}
function setG(sid,v){var c=C(),e=E(c);(c.grades[e.id]=c.grades[e.id]||{})[sid]=v;save();upd()}
function setA(sid,a){var c=C(),e=E(c);(c.grades[e.id]=c.grades[e.id]||{})[sid]=a?"A":"";save();render()}
function addEv(){var c=C(),n=document.getElementById("en").value.trim();if(!n)return;var e={id:id(),name:n,tri:document.getElementById("et").value,coef:parseFloat(document.getElementById("ec").value)||1,max:parseFloat(document.getElementById("em").value)||20};c.evals.push(e);c.grades[e.id]={};S.ev=e.id;save();render()}

function vRang(c){
  if(!c.students.length)return'<p class="m">Aucun élève dans cette classe.</p>';
  var P=[["1","T1"],["2","T2"],["3","T3"],["A","Année"]];
  var h='<div class="chips">'+P.map(function(p){return'<button class="'+(S.per===p[0]?'on':'')+'" onclick="S.per=\''+p[0]+'\';render()">'+p[1]+'</button>'}).join("")+'</div>';
  var rows=rank(c.students.map(function(s){return{s:s,v:avgPer(c,s,S.per)}}));
  rows.sort(function(a,b){return(a.r===null)-(b.r===null)||(a.r-b.r)||a.s.name.localeCompare(b.s.name,"fr")});
  S.txt=rows.map(function(o){return rl(o.r)+"\t"+o.s.name+"\t"+f(o.v)+"\t"+appr(o.v)}).join("\n");
  h+=sb(stats(rows.map(function(o){return o.v})),' de classe');
  var st=stats(rows.map(function(o){return o.v}));
  if(st.n)h+='<p class="m" style="margin:-4px 0 8px">Médiane : '+f(st.med)+' · '+st.n+' élèves classés sur '+rows.length+(S.per==="A"?' · moyenne annuelle = moyenne des trimestres'+'':'')+'</p>';
  h+='<div class="card sc"><table><tr><th>Rang</th><th>Élève</th><th style="text-align:right">Moy./20</th><th>Appréciation</th></tr>'+rows.map(function(o){return'<tr><td class="rk">'+rl(o.r)+'</td><td>'+esc(o.s.name)+'</td><td class="n">'+f(o.v)+'</td><td class="m">'+appr(o.v)+'</td></tr>'}).join("")+'</table></div>';
  return h+'<button onclick="cp(S.txt)">Copier le classement</button> <small>'+esc(S.msg)+'</small>';
}
function cp(t){S.msg="";try{navigator.clipboard.writeText(t).then(function(){S.msg="Copié.";render()},function(){S.msg="Copie impossible."; render()})}catch(e){S.msg="Copie impossible.";render()}}

function vClasses(c){
  var h='<div class="card"><b>Nouvelle classe</b><div class="row" style="margin-top:8px"><input type="text" id="nc" placeholder="ex. 6e A"><button class="pri" onclick="addC()">Ajouter</button></div></div>';
  if(c){
    h+='<div class="card"><b>Élèves de '+esc(c.name)+'</b><p class="m" style="margin:4px 0 6px">Un élève par ligne (Nom Prénom). Tu peux coller une liste entière.</p><textarea id="ns"></textarea><div class="row" style="margin-top:8px"><button class="pri" onclick="addS()">Ajouter les élèves</button></div>'+
    byName(c).map(function(s){return'<div class="st" style="grid-template-columns:1fr 40px"><span>'+esc(s.name)+'</span><button class="dng" onclick="delS(\''+s.id+'\')">✕</button></div>'}).join("")+'</div>';
    if(c.evals.length)h+='<div class="card"><b>Évaluations</b>'+c.evals.map(function(e){return'<div class="st" style="grid-template-columns:1fr 40px"><span>T'+e.tri+' · '+esc(e.name)+' <small>coef '+e.coef+', /'+e.max+'</small></span><button class="dng" onclick="delE(\''+e.id+'\')">✕</button></div>'}).join("")+'</div>';
    h+='<button class="dng" onclick="delC()">'+(S.cd?'Confirmer : supprimer la classe et ses notes':'Supprimer la classe')+'</button>';
  }
  h+='<h2>Sauvegarde</h2><div class="card"><p class="m" style="margin:0 0 6px">Les données restent dans ce navigateur, sur cet appareil. Exporte-les pour les garder ailleurs ou les restaurer.</p><textarea id="bk"></textarea><div class="row" style="margin-top:8px"><button onclick="ex()">Exporter</button><button onclick="im()">Restaurer</button></div><small>'+esc(S.msg)+'</small></div>';
  return h;
}
function addC(){var n=document.getElementById("nc").value.trim();if(!n)return;var c={id:id(),name:n,students:[],evals:[],grades:{}};S.classes.push(c);S.cur=c.id;S.ev=null;save();render()}
function addS(){var c=C();document.getElementById("ns").value.split("\n").forEach(function(l){l=l.trim();if(l)c.students.push({id:id(),name:l})});save();render()}
function delS(i){var c=C();c.students=c.students.filter(function(s){return s.id!==i});for(var k in c.grades)delete c.grades[k][i];save();render()}
function delE(i){var c=C();c.evals=c.evals.filter(function(e){return e.id!==i});delete c.grades[i];if(S.ev===i)S.ev=null;save();render()}
function delC(){if(!S.cd){S.cd=true;render();return}S.classes=S.classes.filter(function(k){return k.id!==C().id});S.cur=null;S.ev=null;S.cd=false;save();render()}
function ex(){var t=JSON.stringify({classes:S.classes});document.getElementById("bk").value=t;S.msg="";try{navigator.clipboard.writeText(t).then(function(){document.querySelector("small:last-child");},function(){})}catch(e){}}
function im(){try{var d=JSON.parse(document.getElementById("bk").value);if(!d.classes)throw 0;S.classes=d.classes;S.cur=null;S.ev=null;save();S.msg="Restauré.";render()}catch(e){S.msg="Sauvegarde illisible.";render()}}
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
