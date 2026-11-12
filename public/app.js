(() => {
'use strict';

const CRITERIA = [
  { k:'up', n:1, c:'var(--c1)', name:'User & Problem', short:'User & problem', q:'To what extent has the team clearly identified the target user(s) and the ADHD-related problem(s) their solution aims to solve?',
    d:['No identifiable target users or problems.','Users and problems are mentioned only vaguely.','A user or problem is identified, but lacks clarity or relevance.','One well-defined user group and one relevant problem.','Clear understanding of the users and several related needs or difficulties.','Multiple relevant user needs or problems are clearly identified, connected and well justified.'] },
  { k:'ld', n:2, c:'var(--c2)', name:'Learning & Design', short:'Learning & design', q:'To what extent has the team demonstrated an understanding of ADHD-related needs and used relevant insights to guide its design decisions?',
    d:['No evidence of understanding user needs or using relevant insights.','Generic assumptions about ADHD, with little connection to design decisions.','Some relevant insights, but limited evidence that they influenced the design.','Relevant insights from the provided materials or other sources clearly inform the solution.','Strong understanding of user needs, with well-justified design choices addressing several relevant difficulties.','Deep, well-supported understanding of interconnected user needs, translated into coherent, thoughtful and user-centred design decisions.'] },
  { k:'pu', n:3, c:'var(--c3)', name:'Prototype & Usefulness', short:'Prototype & usefulness', q:'To what extent has the team demonstrated a working prototype that meaningfully addresses the identified problem(s) through realistic user scenarios?',
    d:['No working prototype or meaningful demonstration.','Mostly conceptual or simulated, with little working functionality or demonstrated value.','Some working functionality, but limited usefulness or an incomplete demonstration.','At least one meaningful working feature, demonstrated in a realistic scenario with clear user value.','Multiple useful working features or scenarios, with good integration and clearly demonstrated benefits.','Multiple well-integrated working features demonstrated across distinct, realistic scenarios, delivering substantial and convincing user value.'] },
  { k:'vn', n:4, c:'var(--c4)', name:'Vision, Limits & Next Steps', short:'Limits & next test', q:"To what extent has the team presented an ambitious, coherent vision for the solution's future development, while clearly identifying its current limitations and next steps?",
    d:['No clear future vision, limitations or next steps.','Vague ideas for future development, with little awareness of current limitations.','Some ideas for improvement and awareness of limitations, but no clear development path.','A realistic vision for further development, with identified limitations and logical next steps.','An ambitious, coherent vision for a more complete solution, with relevant future features, clear limitations and well-defined next steps.','A compelling and ambitious vision showing how the prototype could evolve into an integrated, comprehensive solution addressing multiple relevant needs, supported by clear priorities, honest limitations and a credible validation roadmap.'] },
];
const QMAP = [ // submission questions, aligned with the criteria
  { k:'q1', c:'var(--c1)', n:1, title:'User & problem', sub:'Who they design for, and where that person gets stuck' },
  { k:'q2', c:'var(--c2)', n:2, title:'Learning & design', sub:'An insight that shaped a design decision' },
  { k:'q3', c:'var(--c3)', n:3, title:'Prototype & usefulness', sub:'A realistic scenario the prototype demonstrates' },
  { k:'q4', c:'var(--c4)', n:4, title:'Limits & next test', sub:"What works, what's simulated, what they'd test next" },
];
const LEVELS = ['Not at all','Very poorly','Partially','Clearly','Very clearly','Exceptionally'];
const LEVELS_FULL = ['Not at all','Very poorly','Partially','Clearly','Very clearly','Exceptionally clearly'];
const LOGO = {
  brain:'<img src="/logos/brainstorm.png" alt="Brainstorm" style="max-height:30px">',
  tesla:'<img src="/logos/tesla-vs.png" alt="Tesla Venture Studio" style="max-height:34px">',
  wexio:'<img src="/logos/wexio.png" alt="Wexio" style="max-height:18px">',
};
const PRIZES = {
  1: [[LOGO.brain,'Support from Brainstorm to bring the product to life'],
      [LOGO.tesla,'Most Marketable Product Award: Market Development &amp; Product-Market Fit Program, in-kind, valued at €25,000'],
      [LOGO.wexio,'First prize: a Wexio commercial partnership']],
  2: [[LOGO.wexio,'Second prize: Wexio AI credits']],
  3: [[LOGO.wexio,'Third prize: Wexio credits']],
};
const DEADLINE = new Date('2026-11-12T21:00:00Z'); // Thursday 21:00 Lisbon (WET = UTC+0)

const store = { get(k){ try{ return localStorage.getItem(k)||''; }catch{ return ''; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch{} }, del(k){ try{ localStorage.removeItem(k); }catch{} } };
const params = new URLSearchParams(location.search);
const urlK = params.get('k') || '', urlA = params.get('admin') || '';
const KEY = urlK || (urlA ? '' : store.get('ptw_jury_k'));
const ADMIN = urlA || (KEY ? '' : store.get('ptw_jury_admin'));
if(!urlK && KEY) history.replaceState(null,'','?k='+encodeURIComponent(KEY)+location.hash);
if(!urlA && ADMIN) history.replaceState(null,'','?admin='+encodeURIComponent(ADMIN)+location.hash);

const $app = document.getElementById('app');
let S = null, tab = 'pre', liveIdx = 0, activeCrit = 0;
const open = new Set();
let lastSaved = null, wasAllIn = null;

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d=2) => (n === null || n === undefined) ? '—' : Number(n).toFixed(d);
const initials = n => String(n||'?').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
function total(sc){ if(!sc) return null; let t=0; for(const c of CRITERIA){ if(typeof sc[c.k]!=='number') return null; t+=sc[c.k]; } return t; }
function partial(sc){ if(!sc) return 0; return CRITERIA.filter(c=>typeof sc[c.k]==='number').length; }
function sumPartial(sc){ if(!sc) return 0; return CRITERIA.reduce((a,c)=>a+(typeof sc[c.k]==='number'?sc[c.k]:0),0); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('on'),3000); }
function modal(html, actions){
  const bg=document.getElementById('modalBg'), m=document.getElementById('modal');
  m.innerHTML = html + '<div class="row">' + actions.map((a,i)=>`<button class="btn ${a.cls||''}" data-i="${i}">${esc(a.label)}</button>`).join('') + '</div>';
  bg.classList.add('on');
  m.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => { bg.classList.remove('on'); const a=actions[+b.dataset.i]; a.fn && a.fn(); });
  (m.querySelector('.primary')||m.querySelector('button[data-i]'))?.focus();
}
function closeModal(){ document.getElementById('modalBg').classList.remove('on'); askReopen._open=false; }
document.getElementById('modalBg').addEventListener('click', e => { if(e.target.id==='modalBg') closeModal(); });
async function api(path, opts={}){
  const r = await fetch(path, { cache:'no-store', ...opts, headers:{'Content-Type':'application/json', ...(opts.headers||{})} });
  let data = {}; try { data = await r.json(); } catch {}
  if(!r.ok) throw Object.assign(new Error(data.error || ('Request failed ('+r.status+')')), { status:r.status });
  return data;
}
function confetti(){
  const box=document.createElement('div'); box.className='confetti';
  const cols=['#E8642C','#ff8a4f','#CCAC70','#A55CF6','#5B8DEF','#3DD68C','#ffffff'];
  for(let i=0;i<130;i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'vw'; p.style.background=cols[i%cols.length];
    p.style.animationDuration=(2.4+Math.random()*2.4)+'s'; p.style.animationDelay=(Math.random()*0.9)+'s'; box.appendChild(p); }
  document.body.appendChild(box); setTimeout(()=>box.remove(),6500);
}
function safeUrl(u){ try{ const x=new URL(u); return /^https?:$/.test(x.protocol)?x.href:'#'; }catch{ return '#'; } }
function niceDate(v){
  const d = new Date(String(v).replace(' ', 'T'));
  if(isNaN(d)) return String(v);
  return d.toLocaleString('en-GB', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Lisbon' });
}
function entries(){ return (S && S.entries) || []; }

// ---------- header / meta ----------
function renderWho(){
  const w = document.getElementById('who');
  const save = `<span class="save"><span class="dot" id="saveDot"></span><span id="saveTxt"></span></span>`;
  if(ADMIN && S) w.innerHTML = `<span class="me-chip"><span class="avatar c3">${initials(S.viewerName)}</span><span class="nm">${S.role==='admin'?'Admin':'Organiser'} · <b>${esc(S.viewerName||'')}</b></span></span>`;
  else if(S && S.judge){ const ci = S.jury.findIndex(j=>j.id===S.judge.id);
    w.innerHTML = save + `<span class="me-chip"><span class="avatar c${ci%5}">${initials(S.judge.name)}</span><span class="nm"><b>${esc(S.judge.name)}</b> · ${esc(S.judge.org)}</span></span>`; }
  else w.innerHTML = '';
  setSave(setSave._s, setSave._t);
}
function setSave(state, txt){ setSave._s=state; setSave._t=txt; const d=document.getElementById('saveDot'), t=document.getElementById('saveTxt'); if(d) d.className='dot '+(state||''); if(t) t.textContent=txt||''; }
function renderMeta(){
  const m = document.getElementById('meta'); const diff = DEADLINE - new Date();
  let dl;
  if(diff > 0){ const h=Math.floor(diff/3.6e6), mi=Math.floor(diff%3.6e6/6e4); dl = `<span class="chip live"><span class="pip"></span>Submissions close <b>Thu 21:00</b> · in ${h}h ${String(mi).padStart(2,'0')}m</span>`; }
  else dl = `<span class="chip">Submissions <b>closed</b> Thu 21:00</span>`;
  m.innerHTML = dl + `<span class="chip">Final pitches &amp; awards <b>Friday</b> · PTW Palace, Lisbon</span><span class="chip">Max score <b>20</b> · 4 criteria × 0–5</span>`;
}
renderMeta(); setInterval(renderMeta, 30000);

// ---------- save queue ----------
let pending = new Map(); let saving = false;
function queueSave(entryId, phase, scores, notes){
  const key = entryId + '|' + (phase || 'notes');
  const cur = pending.get(key) || { entryId };
  if(phase){ cur.phase = phase; cur.scores = { ...(cur.scores||{}), ...scores }; }
  if(typeof notes === 'string') cur.notes = notes;
  pending.set(key, cur);
  clearTimeout(queueSave._t); queueSave._t = setTimeout(flush, 350);
  setSave('busy','Saving…');
}
async function flush(){
  clearTimeout(queueSave._t);
  if(saving){ queueSave._t=setTimeout(flush,300); return; }
  const batch = [...pending.entries()]; pending = new Map();
  if(!batch.length) return;
  saving = true;
  try{
    const r = await api('/api/save', { method:'POST', body: JSON.stringify({ k:KEY, updates: batch.map(([,u])=>u) }) });
    S.mine.scores = mergeServer(r.scores); lastSaved = new Date();
    setSave(pending.size?'busy':'ok', pending.size?'Saving…':'Saved '+lastSaved.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  }catch(e){
    setSave('err','Not saved, retrying'); toast(e.message);
    if(e.status === 409) { await load(); }
    else { for(const [k,u] of batch){ if(!pending.has(k)) pending.set(k,u); } queueSave._t=setTimeout(flush,2500); }
  }finally{ saving=false; }
}
function mergeServer(server){
  const out = JSON.parse(JSON.stringify(server||{}));
  for(const u of pending.values()){
    const cur = out[u.entryId] || (out[u.entryId] = {});
    if(u.phase && u.scores){ cur[u.phase] = { ...(cur[u.phase]||{}) };
      for(const [k,v] of Object.entries(u.scores)){ if(v===null) delete cur[u.phase][k]; else cur[u.phase][k]=v; } }
    if(typeof u.notes==='string') cur.notes = u.notes;
  }
  return out;
}
window.addEventListener('beforeunload', e => { if(pending.size || saving){ e.preventDefault(); e.returnValue=''; } });

function setScore(entryId, phase, k, v, opts={}){
  if(S.mine.submitted){ askReopen(); return; }
  const sc = S.mine.scores[entryId] || (S.mine.scores[entryId] = {});
  const ph = sc[phase] || (sc[phase] = {});
  if(ph[k] === v && !opts.noToggle){ delete ph[k]; queueSave(entryId, phase, {[k]:null}); }
  else { ph[k] = v; queueSave(entryId, phase, {[k]:v}); }
  render();
}

// ---------- info popover ----------
const pop = document.getElementById('pop');
let popFor = null;
function showInfo(btn){
  const [k, entryId, phase] = btn.dataset.info.split('|');
  if(popFor === btn.dataset.info && pop.classList.contains('on')){ hideInfo(); return; }
  const c = CRITERIA.find(x=>x.k===k);
  const v = entryId ? ((S?.mine?.scores?.[entryId]||{})[phase]||{})[k] : undefined;
  pop.innerHTML = `<button class="x" aria-label="Close">×</button><div class="sub-h" style="margin:0">Criterion ${c.n} of 4 · scored 0–5</div><h4 class="cond">${esc(c.name)}</h4><p class="q">${esc(c.q)}</p>
    <ol>${c.d.map((d,i)=>`<li class="${v===i?'cur':''}"><b>${i}</b><span><em>${LEVELS_FULL[i]}</em>${esc(d)}</span></li>`).join('')}</ol>
    <div class="foot">Brainstorm evaluation criteria · Portugal Tech Week 2026</div>`;
  pop.classList.add('on'); popFor = btn.dataset.info;
  document.querySelectorAll('.info[aria-expanded=true]').forEach(b=>b.setAttribute('aria-expanded','false'));
  btn.setAttribute('aria-expanded','true');
  const r = btn.getBoundingClientRect(); const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  let left = Math.max(12, Math.min(r.left - 12, vw - pw - 12));
  let top;
  if(r.bottom + 8 + ph <= vh - 12) top = r.bottom + 8;            // fits below
  else if(r.top - 8 - ph >= 80) top = r.top - 8 - ph;             // fits above (clear of the header)
  else top = Math.max(80, vh - ph - 12);                          // otherwise keep it on screen
  pop.style.left = left+'px'; pop.style.top = top+'px';
  pop.querySelector('.x').onclick = hideInfo;
}
function hideInfo(){ pop.classList.remove('on'); popFor=null; document.querySelectorAll('.info[aria-expanded=true]').forEach(b=>b.setAttribute('aria-expanded','false')); }
document.addEventListener('click', e => { if(pop.classList.contains('on') && !pop.contains(e.target) && !e.target.closest('.info')) hideInfo(); });
window.addEventListener('resize', hideInfo);
window.addEventListener('scroll', () => { if(pop.classList.contains('on')) hideInfo(); }, { passive:true });

// ---------- showcase (full-screen submission view) ----------
const $show = document.getElementById('show');
let showIdx = -1;
function openShow(i){ showIdx = i; renderShow(); $show.classList.add('on'); document.body.style.overflow='hidden'; $show.scrollTop=0; }
function closeShow(){ showIdx=-1; $show.classList.remove('on'); document.body.style.overflow=''; }
function renderShow(){
  const list = entries(); const e = list[showIdx]; if(!e){ closeShow(); return; }
  const when = e.submittedAt ? `<span> · submitted ${esc(niceDate(e.submittedAt))}</span>` : '';
  $show.innerHTML = `
    <div class="show-bar"><div class="l"><img src="/logos/ptw.png" alt="Portugal Tech Week"><span class="count">SUBMISSION <b>${String(showIdx+1).padStart(2,'0')}</b> / ${String(list.length).padStart(2,'0')}</span></div>
      <div class="r">${S.judge && tab!=='results'?`<button class="btn sm primary" data-showscore="1">Score this team</button>`:''}<button class="btn sm" data-showclose="1" aria-label="Close">✕ Close</button></div></div>
    <button class="show-nav prev" data-shownav="-1" ${showIdx===0?'disabled':''} aria-label="Previous submission">←</button>
    <button class="show-nav next" data-shownav="1" ${showIdx===list.length-1?'disabled':''} aria-label="Next submission">→</button>
    <div class="show-in" key="${showIdx}">
      <div class="kick">Hackathon for a Cause · Brainstorm challenge</div>
      <h2 class="cond">${esc(e.project||'Untitled project')}</h2>
      <div class="team">by <b>${esc(e.team||'—')}</b>${when}</div>
      <div class="show-cta">
        ${firstLink(e)?`<a class="linkbtn" href="${esc(safeUrl(firstLink(e)))}" target="_blank" rel="noopener noreferrer">Open prototype ↗</a>`:'<span class="pill">No prototype link</span>'}
        <div class="acc"><b>How to access it</b>${e.access?linkify(e.access):'No access instructions given.'}</div>
      </div>
      ${mediaBlock(e)}
      <div class="qgrid">${QMAP.map(q=>`<div class="qcard" style="--cc:${q.c}"><div class="qh"><span class="qn">${q.n}</span><div><h5 class="cond">${q.title}</h5><div class="qs">${q.sub}</div></div></div>
        <div class="tx">${e[q.k]?linkify(e[q.k]):'<span style="color:var(--dim)">No answer given.</span>'}</div></div>`).join('')}</div>
      ${e.comments?`<div class="quote"><b>In the team's own words</b>${linkify(e.comments)}</div>`:''}
      <div class="dots">${list.map((_,i)=>`<button class="${i===showIdx?'on':''}" data-showgo="${i}" aria-label="Submission ${i+1}"></button>`).join('')}</div>
    </div>`;
}
$show.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if(!b) return;
  if(b.dataset.showclose) return closeShow();
  if(b.dataset.shownav){ const n=showIdx+(+b.dataset.shownav); if(n>=0 && n<entries().length){ showIdx=n; renderShow(); $show.scrollTop=0; } return; }
  if(b.dataset.showgo){ showIdx=+b.dataset.showgo; renderShow(); $show.scrollTop=0; return; }
  if(b.dataset.showscore){ const id = entries()[showIdx].id; closeShow(); if(tab==='live'){ liveIdx=showIdx; } else { tab='pre'; open.add('pre:'+id); } render();
    setTimeout(()=>document.querySelector(tab==='live'?'.stage':`[data-toggle="pre:${id}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}),60); }
});

// ---------- shared views ----------
function juryStrip(list, meId){
  return `<div class="jury">` + list.map((j,i) => `
    <div class="juror ${j.submitted?'done':''} ${meId && j.id===meId?'me':''}">
      ${j.submitted?'<span class="badge-tick"><span class="tick" aria-label="Submitted">✓</span></span>':''}
      <span class="avatar c${i%5}">${initials(j.name)}</span>
      <div class="info2"><div class="n">${esc(j.name)}${meId && j.id===meId?' <span style="color:var(--orange);font-weight:600">(you)</span>':''}</div><div class="o">${esc(j.org)}</div>
      <div class="s">${j.submitted ? 'Submitted' : 'Scoring'}</div></div>
    </div>`).join('') + `</div>`;
}
function gallery(){
  const list = entries();
  if(!list.length) return `<div class="waiting"><h3 class="cond">No submissions yet</h3><p>Submissions close Thursday at 21:00.</p></div>`;
  return `<div class="gallery">` + list.map((e,i)=>`<button class="gcard" data-show="${i}">
    <span class="no">SUBMISSION ${String(i+1).padStart(2,'0')}</span>
    <h4>${esc(e.project||'Untitled project')}</h4><span class="tm">${esc(e.team)}</span>
    <p>${esc(e.q1||e.q3||'')}</p>
    <span class="foot"><span>${urlsIn(e).length?`${urlsIn(e).length} link${urlsIn(e).length===1?'':'s'} · ${[...new Set(urlsIn(e).map(r=>r.icon))].join(' ')}`:'No links'}</span><b>View submission →</b></span></button>`).join('') + `</div>`;
}
function heat(v){ if(v===null||v===undefined) return '—'; const a = Math.max(0, Math.min(1, v/20)); return `<span class="heat" style="background:rgba(232,100,44,${(0.08+a*0.5).toFixed(2)})">${v}</span>`; }
function resultsBlock(R, opts={}){
  if(!R.ranking.length) return `<div class="waiting"><h3 class="cond">No scores yet</h3></div>`;
  const top = R.ranking.filter(r=>r.rank<=3);
  let h = '';
  const ties = R.ranking.filter(r=>r.rank<=3 && r.exactTie);
  if(ties.length) h += `<div class="banner warn"><span class="grow"><b>Tie on the podium.</b> ${ties.map(t=>esc(t.project)).join(', ')} are level on average score, Prototype &amp; Usefulness and User &amp; Problem. The jury needs to decide the order between them.</span></div>`;
  else if(R.ranking.some(r=>r.rank<=3 && r.tiedOnAverage)) h += `<div class="banner info"><span class="grow">Some teams are level on average score. They were separated by average Prototype &amp; Usefulness, then User &amp; Problem.</span></div>`;
  const label = p => p===1?'Overall winner':p===2?'2nd place':'3rd place';
  h += `<div class="podium">` + [1,2,3].map(p=>{
    const rs = top.filter(r=>r.rank===p);
    if(!rs.length) return `<div class="place p${p}"><div class="rk">${label(p).toUpperCase()}</div><div class="tm" style="margin-top:10px">—</div></div>`;
    return rs.map(r=>`<div class="place p${p}"><div class="rk">${p===1?'★ ':''}${label(p).toUpperCase()}</div>
      <div class="pj">${esc(r.project)}</div><div class="tm">${esc(r.team)}</div>
      <div class="avg">${fmt(r.average)} <small>/ 20 average</small></div>
      <ul class="prizes">${(PRIZES[p]||[]).map(([logo,what])=>`<li><span class="plogo">${logo}</span><span>${what}</span></li>`).join('')}</ul></div>`).join('');
  }).join('') + `</div>`;
  h += `<div class="tablewrap"><table><thead><tr><th>Rank</th><th>Project</th><th class="num">Average /20</th>` +
    R.judges.map(j=>`<th class="num">${esc(j.name.split(' ')[0])}</th>`).join('') +
    CRITERIA.map(c=>`<th class="num">${esc(c.name)}</th>`).join('') + `</tr></thead><tbody>` +
    R.ranking.map(r=>`<tr><td><b>${r.rank}</b></td><td class="proj"><b>${esc(r.project)}</b><br><span style="color:var(--muted)">${esc(r.team)}</span></td>
      <td class="num"><b style="font-size:16px">${fmt(r.average)}</b></td>` +
      R.judges.map(j=>`<td class="num">${heat(r.perJudge[j.id]?r.perJudge[j.id].total:null)}</td>`).join('') +
      CRITERIA.map(c=>`<td class="num">${fmt(r.criteria[c.k])}</td>`).join('') + `</tr>`).join('') +
    `</tbody></table></div>`;
  h += `<p style="color:var(--muted);font-size:13px;margin-top:12px">The average is the mean of each judge's final total out of 20. Ties are separated by average Prototype &amp; Usefulness, then User &amp; Problem. Criterion columns are averages out of 5.${opts.partial?' <b>Only judges who have submitted are counted.</b>':''}</p>`;
  return h;
}

// ---------- judge views ----------
function phaseProgress(ph){ const n=entries().length; if(!n) return [0,0]; return [entries().filter(e=>total((S.mine.scores[e.id]||{})[ph])!==null).length, n]; }
function tabsBar(){
  const sub = S.jury.filter(j=>j.submitted).length;
  const t = [['pre','01','Pre-demo review',phaseProgress('pre')],['live','02','Live demo',phaseProgress('live')],['final','03','Final review & submit',phaseProgress('final')],['results','04','Results',[sub,S.jury.length]]];
  return `<nav class="tabs" role="tablist">` + t.map(([k,num,l,[a,b]]) => {
    const pct = b ? Math.round(a/b*100) : 0;
    return `<button class="tab ${tab===k?'on':''} ${b&&a===b?'complete':''}" role="tab" aria-selected="${tab===k}" data-tab="${k}"><span class="num">${num}</span><span class="lbl">${l}</span>
      <span class="prog"><span class="bar"><i style="width:${pct}%"></i></span><span>${a}/${b}${k==='results'?' judges':''}</span></span></button>`; }).join('') + `</nav>`;
}
function scorer(entryId, phase, opts={}){
  const sc = (S.mine.scores[entryId]||{})[phase] || {};
  const refs = (opts.refs||[]).map(([ph,l]) => [((S.mine.scores[entryId]||{})[ph] || {}), l]);
  const locked = S.mine.submitted;
  let h = '';
  CRITERIA.forEach((c, ci) => {
    const v = sc[c.k];
    const rs = refs.map(([r,l]) => `${l}: <b>${typeof r[c.k]==='number'?r[c.k]:'—'}</b>`);
    h += `<div class="crit ${opts.live && ci===activeCrit?'active':''}" data-crit="${ci}">
      <div class="crit-top"><div class="crit-name"><span class="ck" style="--cc:${c.c}">${c.n}</span>${esc(c.name)}
        <button class="info" type="button" aria-label="What ${esc(c.name)} means" aria-expanded="false" data-info="${c.k}|${entryId}|${phase}">i</button></div>
      ${rs.length?`<div class="crit-ref">${rs.join(' · ')}</div>`:''}</div>
      <div class="scale" role="radiogroup" aria-label="${esc(c.name)}">` +
      [0,1,2,3,4,5].map(n => `<button class="sbtn ${v===n?'on':''} ${locked?'ro':''}" role="radio" aria-checked="${v===n}" title="${n} · ${LEVELS_FULL[n]}: ${esc(c.d[n])}" data-score="${entryId}|${phase}|${c.k}|${n}"><span class="n">${n}</span><span class="l">${LEVELS[n]}</span></button>`).join('') +
      `</div><div class="desc">${typeof v==='number' ? `<b>${v} · ${LEVELS_FULL[v]}.</b> ${esc(c.d[v])}` : `<span class="q">${esc(c.q)}</span>`}</div></div>`;
  });
  const t = total(sc), p = sumPartial(sc), pc = partial(sc);
  h += `<div class="meter ${t!==null?'full':''}"><div class="row"><span>${opts.totalLabel||'Total'}</span><span class="v">${t===null?`<small>${pc}/4 scored</small>`:t+' <small>/ 20</small>'}</span></div>
    <div class="track"><i style="width:${(t===null?p:t)/20*100}%"></i></div></div>`;
  return h;
}
function ring(sc){ const t=total(sc), pc=partial(sc), p=sumPartial(sc);
  return `<span class="ring ${t!==null?'full':''}" style="--v:${(t===null?p:t)/20*100}" title="${t===null?pc+'/4 criteria scored':t+' out of 20'}"><span class="${t===null?'e':''}">${t===null?(pc?pc+'/4':'—'):t}</span></span>`; }

// ---------- links, videos and files inside a submission ----------
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
function urlsIn(e){
  const seen = new Set(), out = [];
  const add = (u, from) => { u = u.replace(/[.,;:!?]+$/, ''); const k = u.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push({ url:u, from }); } };
  (String(e.link||'').match(URL_RE)||[]).forEach(u=>add(u,'link'));
  ['extra','access','q3','q1','q2','q4','comments'].forEach(f => (String(e[f]||'').match(URL_RE)||[]).forEach(u=>add(u,f)));
  return out.map(r => ({ ...r, ...classify(r.url) }));
}
function driveId(u){
  let m = u.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/) || u.match(/[?&]id=([\w-]{10,})/) || u.match(/docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([\w-]{10,})/);
  return m ? m[1] : null;
}
function classify(u){
  let host = ''; try{ host = new URL(u).hostname.replace(/^www\./,''); }catch{}
  const path = u.split('?')[0].toLowerCase();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if(yt) return { kind:'video', label:'YouTube video', icon:'▶', embed:`https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const loom = u.match(/loom\.com\/(?:share|embed)\/([\w]+)/);
  if(loom) return { kind:'video', label:'Loom video', icon:'▶', embed:`https://www.loom.com/embed/${loom[1]}` };
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(vimeo) return { kind:'video', label:'Vimeo video', icon:'▶', embed:`https://player.vimeo.com/video/${vimeo[1]}` };
  if(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(u)) return { kind:'folder', label:'Google Drive folder', icon:'🗂' };
  if(/docs\.google\.com\/document\//.test(u)) return { kind:'doc', label:'Google Doc', icon:'📄', embed: driveId(u) ? `https://docs.google.com/document/d/${driveId(u)}/preview` : null };
  if(/docs\.google\.com\/presentation\//.test(u)) return { kind:'doc', label:'Google Slides', icon:'🖼', embed: driveId(u) ? `https://docs.google.com/presentation/d/${driveId(u)}/preview` : null };
  if(/docs\.google\.com\/spreadsheets\//.test(u)) return { kind:'sheet', label:'Google Sheet', icon:'📊', embed: driveId(u) ? `https://docs.google.com/spreadsheets/d/${driveId(u)}/preview` : null };
  if(host==='drive.google.com' && driveId(u)) return { kind:'drive', label:'Google Drive file', icon:'📎', embed:`https://drive.google.com/file/d/${driveId(u)}/preview` };
  if(/\.(png|jpe?g|gif|webp|svg)$/.test(path)) return { kind:'image', label:'Image', icon:'🖼', img:u };
  if(/\.(mp4|webm|mov)$/.test(path)) return { kind:'video', label:'Video file', icon:'▶', file:u };
  if(/\.pdf$/.test(path)) return { kind:'doc', label:'PDF', icon:'📄' };
  if(/\.docx?$/.test(path)) return { kind:'doc', label:'Word document', icon:'📄' };
  if(/\.(csv|xlsx?)$/.test(path)) return { kind:'sheet', label:'Spreadsheet', icon:'📊' };
  if(host==='github.com') return { kind:'code', label:'GitHub repo', icon:'⌨' };
  if(host==='figma.com') return { kind:'design', label:'Figma file', icon:'✎' };
  return { kind:'web', label: host || 'Link', icon:'↗' };
}
const FROM_LABEL = { link:'Prototype / demo field', extra:'Extra form field', access:'Access instructions', q1:'Answer 1', q2:'Answer 2', q3:'Answer 3', q4:'Answer 4', comments:'Comments' };
function resourceChips(e){
  const rs = urlsIn(e); if(!rs.length) return '';
  return `<div class="res-list">` + rs.map(r=>`<a class="res" href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer" title="${esc(r.url)}"><span class="ri">${r.icon}</span><span class="rt"><b>${esc(r.label)}</b><small>${esc(shortUrl(r.url))}</small></span><span class="ra">↗</span></a>`).join('') + `</div>`;
}
function shortUrl(u){ try{ const x=new URL(u); const p=(x.pathname.length>28?x.pathname.slice(0,28)+'…':x.pathname); return x.hostname.replace(/^www\./,'')+p; }catch{ return u.slice(0,40); } }
function mediaBlock(e){
  const rs = urlsIn(e); if(!rs.length) return '';
  const embeds = rs.filter(r=>r.embed||r.img||r.file).slice(0,4);
  let h = `<div class="media"><div class="media-h"><h5 class="cond">Demo &amp; materials</h5><span>${rs.length} link${rs.length===1?'':'s'} in this submission</span></div>`;
  if(embeds.length) h += `<div class="embeds">` + embeds.map(r => {
    const inner = r.img ? `<img src="${esc(safeUrl(r.img))}" alt="${esc(r.label)}" loading="lazy" referrerpolicy="no-referrer">`
      : r.file ? `<video src="${esc(safeUrl(r.file))}" controls preload="metadata"></video>`
      : `<iframe src="${esc(r.embed)}" loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="${esc(r.label)}"></iframe>`;
    return `<figure class="embed ${r.kind}"><div class="frame">${inner}</div><figcaption><span>${r.icon} ${esc(r.label)}</span><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">Open ↗</a></figcaption></figure>`; }).join('') + `</div>
    <p class="media-note">If a Google Drive preview says you need access, the team hasn't shared it publicly. Use "Open ↗" to view it with your own Google account.</p>`;
  h += resourceChips(e) + `</div>`;
  return h;
}

function linkify(t){ return esc(t).replace(/https?:\/\/[^\s<>"']+/g, m => { const u = m.replace(/[.,;:!?)]+$/,''); const tail = m.slice(u.length); return `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>${tail}`; }); }
function firstLink(e){ const m = String(e.link||'').match(URL_RE); return m ? m[0].replace(/[.,;:!?]+$/,'') : ''; }
function submissionBrief(e, i){
  return `<div class="linkrow">${firstLink(e)?`<a class="linkbtn" href="${esc(safeUrl(firstLink(e)))}" target="_blank" rel="noopener noreferrer">Open prototype ↗</a>`:'<span class="pill">No prototype link</span>'}
    <button class="btn" data-show="${i}">⤢ Full submission</button></div>
    <div class="access">${e.access ? `<b>Access:</b> ${esc(e.access)}` : ''}</div>
    ${urlsIn(e).length>1 || (urlsIn(e).length===1 && urlsIn(e)[0].url!==firstLink(e)) ? `<p class="sub-h">Links &amp; files (${urlsIn(e).length})</p>${resourceChips(e)}` : ''}
    <div class="answers">` + QMAP.filter(q=>e[q.k]).map((q,j)=>`<details ${j===0?'open':''}><summary>${q.n}. ${q.title}</summary><div class="a">${linkify(e[q.k])}</div></details>`).join('') +
    (e.comments?`<details><summary>Team's comments</summary><div class="a">${linkify(e.comments)}</div></details>`:'') + `</div>`;
}
function lockedBanner(){
  return `<div class="banner ok"><span class="tick">✓</span><span class="grow"><b>You've submitted.</b> Your scores count in the results. To change anything, reopen your scorecard, edit, then submit again.</span><button class="btn sm" data-reopenself="1">Reopen to edit</button></div>`;
}
function noEntries(){ return `<div class="waiting"><h3 class="cond">Entries arrive tonight</h3><p>Submissions close Thursday at 21:00. Teams appear here as soon as they're loaded, so check back later this evening.</p></div>`; }

function viewPre(){
  const list = entries(); if(!list.length) return noEntries();
  const [done,n] = phaseProgress('pre');
  let h = `<div class="intro"><div><h2 class="cond">Pre-demo review</h2>
    <p>Read each submission and try the prototype before Friday, then give your first impression. Only you can see these scores. Tap <b style="font-family:Georgia,serif;font-style:italic;color:var(--blue)">i</b> next to a criterion for Brainstorm's full scale. Tap a selected score again to clear it.</p></div>
    <div style="display:flex;gap:8px;align-items:center"><span class="pill ${done===n?'ok':''}">${done}/${n} teams scored</span><button class="btn sm" data-show="0">⤢ Browse submissions</button></div></div>`;
  if(S.mine.submitted) h += lockedBanner();
  list.forEach((e,i) => {
    const sc = S.mine.scores[e.id] || {};
    const isOpen = open.has('pre:'+e.id);
    h += `<div class="card ${isOpen?'open':''}">
      <button class="card-h" data-toggle="pre:${e.id}" aria-expanded="${isOpen}">
        <span class="idx">${String(i+1).padStart(2,'0')}</span>
        <span class="t"><div class="p">${esc(e.project||'Untitled project')}</div><div class="m">${esc(e.team)}</div></span>
        ${ring(sc.pre)}<span class="chev">▶</span>
      </button>
      <div class="card-b"><div class="grid2">
        <div><p class="sub-h">Submission</p>${submissionBrief(e,i)}</div>
        <div><p class="sub-h">Your pre-demo scores</p>${scorer(e.id,'pre')}
          <p class="sub-h" style="margin-top:18px">Private notes</p>
          <textarea data-notes="${e.id}" placeholder="Questions to ask at the demo, things to check…" ${S.mine.submitted?'readonly':''}>${esc(sc.notes||'')}</textarea></div>
      </div></div></div>`;
  });
  return h;
}
function viewLive(){
  const list = entries(); if(!list.length) return noEntries();
  liveIdx = Math.max(0, Math.min(liveIdx, list.length-1));
  const e = list[liveIdx]; const sc = S.mine.scores[e.id] || {};
  let h = `<div class="intro"><div><h2 class="cond">Live demo scoring</h2>
    <p>Score each team as they present. Your pre-demo score sits beside each criterion for reference. Change anything as the demo goes on.</p></div>
    <div class="keys"><span><kbd>0</kbd>–<kbd>5</kbd> score</span><span><kbd>↑</kbd><kbd>↓</kbd> criterion</span><span><kbd>←</kbd><kbd>→</kbd> team</span></div></div>`;
  if(S.mine.submitted) h += lockedBanner();
  h += `<div class="picker">` + list.map((x,i)=>{
    const t = total((S.mine.scores[x.id]||{}).live);
    return `<button class="pick ${i===liveIdx?'on':''}" data-live="${i}">${t!==null?'<span class="ok">✓</span>':''}${i+1}. ${esc(x.project||x.team)}</button>`;}).join('') + `</div>`;
  h += `<div class="stage"><div class="grid2">
      <div><div class="sub-h">Now presenting · team ${liveIdx+1} of ${list.length}</div><h3 class="cond">${esc(e.project||'Untitled project')}</h3><div class="team">${esc(e.team)}</div>
        <div class="linkrow" style="margin-top:18px">${firstLink(e)?`<a class="linkbtn" href="${esc(safeUrl(firstLink(e)))}" target="_blank" rel="noopener noreferrer">Open prototype ↗</a>`:''}<button class="btn" data-show="${liveIdx}">⤢ Full submission</button></div>
        <p class="sub-h" style="margin-top:20px">What teams were asked to show</p>
        <ol style="color:#d4d4d8;font-size:14px;padding-left:18px;margin:0 0 6px">
          <li>Who it's for and where they get stuck</li><li>What they learned that shaped their approach</li>
          <li>One realistic example of the prototype in action</li><li>What works today, what they simulated and what they'd test next</li></ol>
        <p class="sub-h" style="margin-top:18px">Private notes</p>
        <textarea data-notes="${e.id}" ${S.mine.submitted?'readonly':''}>${esc(sc.notes||'')}</textarea>
      </div>
      <div>${scorer(e.id,'live',{live:true,refs:[['pre','Pre-demo']],totalLabel:'Live total'})}</div>
    </div>
    <div class="navrow"><button class="btn" data-livestep="-1" ${liveIdx===0?'disabled':''}>← Previous team</button>
    <button class="btn primary" data-livestep="1" ${liveIdx===list.length-1?'disabled':''}>Next team →</button></div></div>`;
  return h;
}
function suggested(entryId){
  const sc = S.mine.scores[entryId] || {}; const out = {};
  for(const c of CRITERIA){
    const a = sc.pre?.[c.k], b = sc.live?.[c.k];
    if(typeof a==='number' && typeof b==='number') out[c.k] = Math.round((a+b)/2);
    else if(typeof b==='number') out[c.k] = b;
    else if(typeof a==='number') out[c.k] = a;
  }
  return out;
}
function applySuggestions(){
  if(!S || !S.mine || S.mine.submitted) return;
  for(const e of entries()){
    const sc = S.mine.scores[e.id] || (S.mine.scores[e.id] = {});
    const fin = sc.final || {}; const sug = suggested(e.id); const fill = {};
    for(const c of CRITERIA) if(typeof fin[c.k]!=='number' && typeof sug[c.k]==='number') fill[c.k]=sug[c.k];
    if(Object.keys(fill).length){ sc.final = { ...fin, ...fill }; queueSave(e.id,'final',fill); }
  }
}
function myRanking(){ return entries().map(e => ({ e, t: total((S.mine.scores[e.id]||{}).final) })).sort((a,b)=> (b.t??-1)-(a.t??-1)); }
function viewFinal(){
  const list = entries(); if(!list.length) return noEntries();
  const complete = list.every(e => total((S.mine.scores[e.id]||{}).final)!==null);
  let h = `<div class="intro"><div><h2 class="cond">Final review &amp; submit</h2>
    <p>Each final score starts from your own pre-demo and live scores: their average, rounded, or whichever one you gave. Adjust anything, check your personal ranking, then submit. You can reopen and change your scores at any time.</p></div></div>`;
  if(S.mine.submitted) h += `<div class="banner ok"><span class="tick">✓</span><span class="grow"><b>Submitted</b>${S.mine.submittedAt?' at '+new Date(S.mine.submittedAt).toLocaleString([], {weekday:'short',hour:'2-digit',minute:'2-digit'}):''}. Your scores count in the results.</span><button class="btn sm" data-reopenself="1">Reopen to edit</button></div>`;
  h += `<div class="final-grid"><div>`;
  list.forEach((e,i) => {
    const sc = S.mine.scores[e.id] || {};
    const isOpen = open.has('final:'+e.id) || (!open.has('final-closed:'+e.id) && !S.mine.submitted && total(sc.final)===null);
    h += `<div class="card ${isOpen?'open':''}">
      <button class="card-h" data-toggle="final:${e.id}" aria-expanded="${isOpen}">
        <span class="idx">${String(i+1).padStart(2,'0')}</span>
        <span class="t"><div class="p">${esc(e.project||'Untitled project')}</div>
          <div class="cmp"><span>Pre-demo <b>${total(sc.pre)??'—'}</b></span><span>Live <b>${total(sc.live)??'—'}</b></span><span>${esc(e.team)}</span></div></span>
        ${ring(sc.final)}<span class="chev">▶</span>
      </button>
      <div class="card-b">${scorer(e.id,'final',{refs:[['pre','Pre'],['live','Live']],totalLabel:'Final total'})}</div></div>`;
  });
  h += `</div><aside class="side"><h4 class="cond">Your ranking</h4><p class="sm">Updates as you adjust your final scores.</p><ol class="mylist">` +
    myRanking().map((x,i)=>`<li><span class="r">${x.t===null?'·':i+1}</span><span class="nm">${esc(x.e.project||x.e.team)}</span><span class="sc">${x.t===null?'—':x.t}</span></li>`).join('') +
    `</ol>` + (S.mine.submitted ? `<button class="btn" style="width:100%" data-reopenself="1">Reopen to edit</button>` :
    `<button class="btn primary" id="submitBtn" style="width:100%" ${complete?'':'disabled'}>Submit my final scores</button>
     ${complete?'':'<p style="font-size:13px;color:var(--muted);margin:10px 0 0">Give every team a final score on all four criteria to submit.</p>'}`) + `</aside></div>`;
  return h;
}
function viewResults(){
  const n = S.jury.filter(j=>j.submitted).length;
  let h = `<div class="intro"><div><h2 class="cond">Results</h2><p>The final ranking appears here automatically once all ${S.jury.length} judges have submitted. Until then, nobody can see anyone else's scores.</p></div></div>`;
  if(!S.allIn){
    const left = S.jury.filter(j=>!j.submitted);
    return h + `<div class="waiting"><h3 class="cond">${n} of ${S.jury.length} judges submitted</h3>
      <p>${left.length ? 'Still scoring: '+left.map(j=>esc(j.name)).join(', ') : ''}</p>
      <div class="avs">${S.jury.map((j,i)=>`<span class="avatar c${i%5}" style="${j.submitted?'box-shadow:0 0 0 2px var(--green)':'opacity:.45'}" title="${esc(j.name)}">${initials(j.name)}</span>`).join('')}</div></div>`;
  }
  return h + resultsBlock(S.results);
}

function render(){
  if(!S) return;
  if(ADMIN) return renderAdmin();
  hideInfo();
  const act = document.activeElement; const actNotes = act && act.dataset ? act.dataset.notes : null; const selStart = act && act.selectionStart;
  let body = `<p class="hint">🔖 Bookmark this page. Your private link brings you back to your own scorecard any time, on any device.</p>` + juryStrip(S.jury, S.judge.id) + tabsBar() + `<section class="view" ${render._tab!==tab?'':'style="animation:none"'}>`;
  body += tab==='pre'?viewPre(): tab==='live'?viewLive(): tab==='final'?viewFinal(): viewResults();
  body += `</section>`;
  render._tab = tab;
  $app.innerHTML = body;
  renderWho();
  if(actNotes){ const t = $app.querySelector(`textarea[data-notes="${actNotes}"]`); if(t){ t.focus(); try{ t.setSelectionRange(selStart, selStart); }catch{} } }
  if(S.allIn && tab==='results' && !render._confetti){ render._confetti = true; confetti(); }
  if($show.classList.contains('on')) renderShow();
}

// ---------- events ----------
$app.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if(!b) return;
  if(b.dataset.info){ ev.stopPropagation(); showInfo(b); return; }
  if(b.dataset.show){ openShow(+b.dataset.show); return; }
  if(ADMIN) return adminClick(b);
  if(b.dataset.tab){ tab = b.dataset.tab; if(tab==='final') applySuggestions(); render(); history.replaceState(null,'',location.pathname+location.search+'#'+tab); document.querySelector('.tabs').scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(b.dataset.score){ const [id,ph,k,n] = b.dataset.score.split('|'); if(ph==='live') activeCrit = CRITERIA.findIndex(c=>c.k===k); setScore(id,ph,k,+n); return; }
  if(b.dataset.toggle){ const key=b.dataset.toggle; const [ph,id]=key.split(':');
    const isOpen=b.closest('.card').classList.contains('open');
    if(isOpen){ open.delete(key); if(ph==='final') open.add('final-closed:'+id); } else { open.add(key); open.delete('final-closed:'+id); }
    render(); return; }
  if(b.dataset.live){ liveIdx=+b.dataset.live; activeCrit=0; render(); return; }
  if(b.dataset.livestep){ stepLive(+b.dataset.livestep); return; }
  if(b.dataset.reopenself) return askReopen();
  if(b.id==='submitBtn') return confirmSubmit();
});
$app.addEventListener('input', ev => {
  const t = ev.target;
  if(t.dataset && t.dataset.notes && S.mine && !S.mine.submitted){
    const sc = S.mine.scores[t.dataset.notes] || (S.mine.scores[t.dataset.notes] = {});
    sc.notes = t.value; queueSave(t.dataset.notes, null, null, t.value);
  }
});
$app.addEventListener('focusin', ev => {
  if(ev.target.tagName==='TEXTAREA' && ev.target.readOnly && S && S.mine && S.mine.submitted){ askReopen(); return; }
  const c = ev.target.closest('.crit[data-crit]');
  if(c && tab==='live' && +c.dataset.crit!==activeCrit){ activeCrit=+c.dataset.crit; $app.querySelectorAll('.crit[data-crit]').forEach(x=>x.classList.toggle('active', +x.dataset.crit===activeCrit)); }
});
function stepLive(d){ const n=liveIdx+d; if(n<0||n>=entries().length) return; liveIdx=n; activeCrit=0; render(); document.querySelector('.tabs').scrollIntoView({behavior:'smooth',block:'start'}); }
document.addEventListener('keydown', e => {
  if(e.key==='Escape'){ hideInfo(); if(document.getElementById('modalBg').classList.contains('on')) return closeModal(); if($show.classList.contains('on')) return closeShow(); }
  if($show.classList.contains('on')){
    if(e.key==='ArrowRight' && showIdx<entries().length-1){ showIdx++; renderShow(); $show.scrollTop=0; }
    if(e.key==='ArrowLeft' && showIdx>0){ showIdx--; renderShow(); $show.scrollTop=0; }
    return;
  }
  if(!S || ADMIN || tab!=='live' || !entries().length) return;
  if(['TEXTAREA','INPUT'].includes(document.activeElement?.tagName) || document.getElementById('modalBg').classList.contains('on')) return;
  const e0 = entries()[liveIdx];
  if(/^[0-5]$/.test(e.key)){ e.preventDefault(); const c = CRITERIA[activeCrit]; if(S.mine.submitted) return askReopen(); if(activeCrit<3) activeCrit++; setScore(e0.id,'live',c.k,+e.key,{noToggle:true}); return; }
  if(e.key==='ArrowDown'){ e.preventDefault(); activeCrit=Math.min(3,activeCrit+1); render(); }
  if(e.key==='ArrowUp'){ e.preventDefault(); activeCrit=Math.max(0,activeCrit-1); render(); }
  if(e.key==='ArrowRight'){ e.preventDefault(); stepLive(1); }
  if(e.key==='ArrowLeft'){ e.preventDefault(); stepLive(-1); }
});

function confirmSubmit(){
  const list = myRanking().map((x,i)=>`<li><span>${i+1}. ${esc(x.e.project||x.e.team)}</span><b>${x.t}/20</b></li>`).join('');
  modal(`<h3 class="cond">Submit your final scores?</h3><p>Your ranking:</p><ol>${list}</ol><p>The other judges will see your tick, but nobody sees your scores until every judge has submitted. You can reopen and edit afterwards.</p>`,
    [{label:'Keep editing',cls:'ghost'},{label:'Submit',cls:'primary',fn:doSubmit}]);
}
async function doSubmit(){
  try{
    while(saving || pending.size){ if(!saving) await flush(); else await new Promise(r=>setTimeout(r,150)); }
    await api('/api/submit',{method:'POST',body:JSON.stringify({k:KEY})});
    toast('Submitted. Thank you!'); await load();
  }catch(e){ modal(`<h3 class="cond">Couldn't submit</h3><p>${esc(e.message)}</p>`,[{label:'OK'}]); }
}
function askReopen(){
  if(askReopen._open) return; askReopen._open = true;
  modal(`<h3 class="cond">Reopen your scorecard?</h3><p>You can change any of your scores and notes. Your tick is removed${S.allIn?' and the results are hidden again':''} until you submit again.</p>`,
    [{label:'Cancel',cls:'ghost',fn:()=>{askReopen._open=false;}},{label:'Reopen to edit',cls:'primary',fn:async()=>{ askReopen._open=false;
      try{ await api('/api/submit',{method:'POST',body:JSON.stringify({k:KEY,action:'withdraw'})}); toast('Reopened. Remember to submit again.'); render._confetti=false; await load(); }
      catch(e){ toast(e.message); } }}]);
}

// ---------- load + polling ----------
async function load(){
  try{
    S = await api('/api/state?k='+encodeURIComponent(KEY));
    store.set('ptw_jury_k', KEY);
    const h = location.hash.slice(1);
    if(['pre','live','final','results'].includes(h)) tab = h;
    if(tab==='final') applySuggestions();
    if(wasAllIn===false && S.allIn){ tab='results'; render._confetti=false; }
    wasAllIn = S.allIn;
    render(); setSave('ok', lastSaved?'Saved':'');
  }catch(e){
    if(e.status===401) store.del('ptw_jury_k');
    $app.innerHTML = `<div class="waiting"><h3 class="cond">${e.status===401?'Personal link needed':'Something went wrong'}</h3><p>${esc(e.message)}</p></div>`;
  }
}
async function poll(){
  if(!S || ADMIN || document.hidden || pending.size || saving) return;
  try{
    const fresh = await api('/api/state?k='+encodeURIComponent(KEY));
    const changed = JSON.stringify([fresh.jury,fresh.entries,fresh.allIn,fresh.mine.submitted,fresh.mine.scores]) !== JSON.stringify([S.jury,S.entries,S.allIn,S.mine.submitted,S.mine.scores]); // includes scores, so edits made on another device appear here
    if(changed){
      fresh.jury.filter(j=>j.submitted && !S.jury.find(o=>o.id===j.id)?.submitted && j.id!==S.judge.id).forEach(j=>toast(`${j.name} has submitted ✓`));
      if(fresh.entries.length > S.entries.length) toast(`${fresh.entries.length - S.entries.length} new submission(s) loaded`);
      if(!S.allIn && fresh.allIn){ tab='results'; render._confetti=false; }
      S = { ...fresh, mine: { ...fresh.mine, scores: mergeServer(fresh.mine.scores) } };
      if(document.activeElement?.tagName !== 'TEXTAREA') render();
    }
  }catch{}
}

// ---------- organiser / admin ----------
let A = null, forced = null, editing = null, adminTab = 'subs';
async function loadAdmin(){
  try{ A = await api('/api/admin',{method:'POST',body:JSON.stringify({k:ADMIN,action:'state'})}); S = A; store.set('ptw_jury_admin', ADMIN); render(); }
  catch(e){ if(e.status===401) store.del('ptw_jury_admin'); $app.innerHTML = `<div class="waiting"><h3 class="cond">Organiser link needed</h3><p>${esc(e.message)}</p></div>`; }
}
function renderAdmin(){
  const isAdm = A.role === 'admin';
  renderWho();
  const n = A.jury.filter(j=>j.submitted).length;
  let h = juryStrip(A.jury, null);
  const tabs = [['subs','01','Submissions',`${A.entries.length} teams`],['upload','02','Upload submissions','CSV or Excel'],['results','03','Results',`${n}/${A.jury.length} judges`]];
  if(isAdm) tabs.push(['manage','04','Manage','Entries & judges']);
  h += `<nav class="tabs" role="tablist" style="grid-template-columns:repeat(${tabs.length},1fr)">` + tabs.map(([k,num,l,s])=>`<button class="tab ${adminTab===k?'on':''}" data-atab="${k}"><span class="num">${num}</span><span class="lbl">${l}</span><span class="prog"><span>${s}</span></span></button>`).join('') + `</nav>`;
  h += `<section class="view">`;
  if(adminTab==='subs'){
    h += `<div class="intro"><div><h2 class="cond">Submissions</h2><p>Every team's submission, ready to read or present. Open one to see it full screen, and use ← → to move between teams.</p></div>
      ${A.entries.length?`<button class="btn primary" data-show="0">▶ Present all</button>`:''}</div>` + gallery();
  }
  if(adminTab==='upload'){
    h += `<div class="intro"><div><h2 class="cond">Upload submissions</h2><p>Download the Google Form responses as <b>CSV</b> (or Excel) and drop the file here. You'll see a preview before anything changes. Uploading an updated file later adds new teams and refreshes existing ones, and it never removes judges' scores. Contact emails and phone numbers are not imported.</p></div></div>
      <label class="drop" id="drop"><input type="file" id="file" accept=".csv,.xlsx,.xls,text/csv" hidden><div class="ic">⇪</div><h4 class="cond">Drop the submissions file here</h4><p>or click to choose a .csv or .xlsx file</p></label>`;
  }
  if(adminTab==='results'){
    h += `<div class="intro"><div><h2 class="cond">Results</h2><p>Judges' scores stay hidden until all ${A.jury.length} have submitted. The ranking then appears here automatically.</p></div><button class="btn" data-refresh="1">↻ Refresh</button></div>`;
    if(A.allIn) h += resultsBlock(A.results);
    else if(forced) h += `<div class="banner warn"><span class="grow">Provisional result from the ${forced.judges.length} judge(s) who have submitted so far.</span></div>` + resultsBlock(forced,{partial:true});
    else h += `<div class="waiting"><h3 class="cond">${n} of ${A.jury.length} submitted</h3><p>${A.jury.filter(j=>!j.submitted).map(j=>esc(j.name)).join(', ')} still scoring.</p>${isAdm?'<p>If a judge can\'t submit, you can show a provisional result from the judges who have.</p><button class="btn" data-force="1">Show provisional results</button>':''}</div>`;
  }
  if(adminTab==='manage' && isAdm){
    h += `<div class="banner info"><span class="grow">Reopen a judge's scorecard on their behalf:</span>${A.jury.filter(j=>j.submitted).map(j=>`<button class="btn sm" data-reopen="${j.id}">Reopen ${esc(j.name.split(' ')[0])}</button>`).join('') || '<span style="color:var(--muted);font-size:13px">nobody has submitted yet</span>'}</div>`;
    h += `<h3 class="cond sec">Entries (${A.entries.length})</h3><div class="tablewrap"><table><thead><tr><th>#</th><th>Project</th><th>Team</th><th>Prototype</th><th></th></tr></thead><tbody>` +
      (A.entries.length ? A.entries.map((e,i)=>`<tr><td>${i+1}</td><td class="proj"><b>${esc(e.project)}</b></td><td>${esc(e.team)}</td><td>${firstLink(e)?`<a href="${esc(safeUrl(firstLink(e)))}" target="_blank" rel="noopener noreferrer">Open ↗</a>`:'—'}</td>
        <td style="text-align:right"><button class="btn sm ghost" data-edit="${i}">Edit</button> <button class="btn sm ghost" data-up="${i}" ${i===0?'disabled':''}>↑</button> <button class="btn sm danger" data-del="${i}">Delete</button></td></tr>`).join('')
        : `<tr><td colspan="5" style="color:var(--muted)">No entries yet.</td></tr>`) + `</tbody></table></div>`;
    const e = editing!==null ? A.entries[editing] : {};
    h += `<div class="card open" style="margin-top:16px"><div class="card-b" style="display:block;border:0"><p class="sub-h">${editing!==null?'Edit entry':'Add an entry by hand'}</p><div class="form">
      ${[['team','Team name'],['project','Project title'],['link','Prototype / demo link'],['access','Access instructions']].map(([k,l])=>`<div><label for="f_${k}">${l}</label><input type="text" id="f_${k}" value="${esc(e[k]||'')}"></div>`).join('')}
      ${[...QMAP.map(q=>[q.k,q.n+'. '+q.title]),['comments','Additional comments']].map(([k,l])=>`<div class="full"><label for="f_${k}">${esc(l)}</label><textarea id="f_${k}">${esc(e[k]||'')}</textarea></div>`).join('')}
      </div><div style="display:flex;gap:10px;margin-top:14px"><button class="btn primary" data-saveentry="1">${editing!==null?'Save changes':'Add entry'}</button>${editing!==null?'<button class="btn ghost" data-canceledit="1">Cancel</button>':''}</div></div></div>`;
  }
  h += `</section>`;
  $app.innerHTML = h;
  if(adminTab==='upload') wireUpload();
  if(A.allIn && adminTab==='results' && !render._confetti){ render._confetti=true; confetti(); }
  if($show.classList.contains('on')) renderShow();
}
async function saveEntries(list){
  const r = await api('/api/admin',{method:'POST',body:JSON.stringify({k:ADMIN,action:'setEntries',entries:list})});
  A.entries = r.entries; S = A; toast('Entries saved'); render();
}
async function adminClick(b){
  try{
    if(b.dataset.atab){ adminTab=b.dataset.atab; return render(); }
    if(b.dataset.refresh){ forced=null; return loadAdmin(); }
    if(b.dataset.force){ const r = await api('/api/admin',{method:'POST',body:JSON.stringify({k:ADMIN,action:'forceResults'})}); forced=r.results; return render(); }
    if(b.dataset.reopen){ const j=A.jury.find(x=>x.id===b.dataset.reopen);
      return modal(`<h3 class="cond">Reopen ${esc(j.name)}'s scorecard?</h3><p>Their tick is removed and they can edit their scores again. The results are hidden until they submit again.</p>`,
        [{label:'Cancel',cls:'ghost'},{label:'Reopen',cls:'primary',fn:async()=>{ await api('/api/admin',{method:'POST',body:JSON.stringify({k:ADMIN,action:'reopen',judgeId:j.id})}); loadAdmin(); }}]); }
    if(b.dataset.edit){ editing=+b.dataset.edit; render(); document.getElementById('f_team').scrollIntoView({behavior:'smooth',block:'center'}); return; }
    if(b.dataset.canceledit){ editing=null; return render(); }
    if(b.dataset.up){ const i=+b.dataset.up; const l=[...A.entries]; [l[i-1],l[i]]=[l[i],l[i-1]]; return saveEntries(l); }
    if(b.dataset.del){ const i=+b.dataset.del; const x=A.entries[i];
      return modal(`<h3 class="cond">Delete this entry?</h3><p><b>${esc(x.project)}</b> (${esc(x.team)}) will be removed for every judge.</p>`,
        [{label:'Cancel',cls:'ghost'},{label:'Delete',cls:'danger',fn:()=>saveEntries(A.entries.filter((_,k)=>k!==i))}]); }
    if(b.dataset.saveentry){
      const val = k => (document.getElementById('f_'+k)?.value||'').trim();
      const ne = { team:val('team'), project:val('project'), link:val('link'), access:val('access'), q1:val('q1'), q2:val('q2'), q3:val('q3'), q4:val('q4'), comments:val('comments') };
      if(!ne.project && !ne.team) return toast('Add at least a team name or project title');
      const l=[...A.entries];
      if(editing!==null){ l[editing] = { ...l[editing], ...ne }; } else l.push(ne);
      editing=null; return saveEntries(l);
    }
  }catch(e){ toast(e.message); }
}

// ---------- submissions file import ----------
function parseCSV(text){
  const rows=[]; let row=[], f='', q=false;
  text = text.replace(/^﻿/, '');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===','||c===';'&&false){ row.push(f); f=''; }
    else if(c==='\n'){ row.push(f); rows.push(row); row=[]; f=''; }
    else if(c==='\r'){ /* skip */ }
    else f+=c;
  }
  if(f!=='' || row.length){ row.push(f); rows.push(row); }
  return rows;
}
function loadSheetJS(){
  return new Promise((res, rej) => { if(window.XLSX) return res(window.XLSX);
    const s=document.createElement('script'); s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'; s.onload=()=>res(window.XLSX); s.onerror=()=>rej(new Error('Could not load the Excel reader. Please upload a CSV instead.')); document.head.appendChild(s); });
}
function hashId(s){ let h1=0x811c9dc5, h2=5381; for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c,16777619)>>>0; h2=((h2<<5)+h2+c)>>>0; } return 's'+h1.toString(36)+h2.toString(36); }
function mapRows(rows){
  const clean = rows.filter(r=>r.some(c=>String(c??'').trim()!==''));
  if(clean.length<2) throw new Error('The file has no submission rows.');
  const head = clean[0].map(h=>String(h||'').toLowerCase().replace(/\s+/g,' ').trim());
  const find = (...tests) => head.findIndex(h => tests.some(t => typeof t==='string' ? h.includes(t) : t.test(h)));
  const col = {
    submittedAt: find('timestamp','carimbo'),
    team: find('team name','nome da equipa','team'),
    project: find('project title','título do projeto','project name'),
    q1: find(/^1\.\s*user/,'user & problem'),
    q2: find(/^2\.\s*learning/,'learning & design'),
    q3: find(/^3\.\s*prototype/,'prototype & usefulness'),
    q4: find(/^4\.\s*limits/,'limits & next'),
    link: find('link to your prototype','prototype or short demo','demo recording','prototype link'),
    access: find('access instructions'),
    comments: find('additional comments',"space for any additional"),
  };
  if(col.team<0 && col.project<0) throw new Error("Couldn't find the Team Name or Project Title columns. Is this the Google Form responses export?");
  const get = (r,i) => i<0 ? '' : String(r[i]??'').trim();
  const used = new Set(Object.values(col));
  const skip = h => /e-?mail|whatsapp|phone|telefone|terms|declare|code of conduct/.test(h);
  const extraCols = head.map((h,i)=>i).filter(i => !used.has(i) && !skip(head[i]));
  const out = [];
  for(const r of clean.slice(1)){
    const e = {}; for(const [k,i] of Object.entries(col)) e[k]=get(r,i);
    e.extra = extraCols.map(i => { const v = get(r,i); return /https?:\/\//i.test(v) ? `${clean[0][i]}: ${v}` : ''; }).filter(Boolean).join('\n');
    if(!e.team && !e.project) continue;
    e.id = hashId([e.team, e.project].map(x=>x.trim().replace(/\s+/g,' ')).join('|').toLowerCase());
    out.push(e);
  }
  if(!out.length) throw new Error('No submissions with a team name or project title were found.');
  const missing = Object.entries(col).filter(([,i])=>i<0).map(([k])=>k);
  return { entries: out, missing };
}
async function readFile(file){
  if(/\.xlsx?$/i.test(file.name)){
    const XLSX = await loadSheetJS();
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates:true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header:1, raw:false, defval:'' });
  }
  return parseCSV(await file.text());
}
function wireUpload(){
  const drop = document.getElementById('drop'), input = document.getElementById('file');
  if(!drop) return;
  ['dragenter','dragover'].forEach(t=>drop.addEventListener(t, e=>{ e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(t=>drop.addEventListener(t, e=>{ e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f=e.dataTransfer.files[0]; if(f) handleFile(f); });
  input.addEventListener('change', () => { if(input.files[0]) handleFile(input.files[0]); input.value=''; });
}
async function handleFile(file){
  try{
    const { entries: rows, missing } = mapRows(await readFile(file));
    const have = new Set(A.entries.map(e=>e.id));
    const nNew = rows.filter(r=>!have.has(r.id)).length, nUpd = rows.length - nNew;
    const labels = {submittedAt:'timestamp',q1:'question 1',q2:'question 2',q3:'question 3',q4:'question 4',link:'prototype link',access:'access instructions',comments:'comments',team:'team name',project:'project title'};
    modal(`<h3 class="cond">Import ${rows.length} submission${rows.length===1?'':'s'}?</h3>
      <p><b>${nNew}</b> new · <b>${nUpd}</b> already loaded (will be refreshed). Existing scores are kept.</p>
      <div class="preview">${rows.map(r=>`<div><b>${esc(r.project||'Untitled')}</b><span>${esc(r.team)} ${have.has(r.id)?'<span class="tagupd">update</span>':'<span class="tagnew">new</span>'}</span></div>`).join('')}</div>
      ${missing.length?`<p style="font-size:13px;color:#ffb08a">Columns not found: ${missing.map(m=>labels[m]).join(', ')}. Those fields will be blank.</p>`:''}`,
      [{label:'Cancel',cls:'ghost'},{label:`Import ${rows.length}`,cls:'primary',fn:async()=>{
        try{ const r = await api('/api/admin',{method:'POST',body:JSON.stringify({k:ADMIN,action:'importEntries',entries:rows})});
          A.entries = r.entries; S = A; adminTab='subs'; render(); toast(`Imported: ${r.added} new, ${r.updated} updated`); }
        catch(e){ toast(e.message); } }}]);
  }catch(e){ modal(`<h3 class="cond">Couldn't read that file</h3><p>${esc(e.message)}</p>`,[{label:'OK'}]); }
}

// ---------- boot ----------
if(ADMIN){
  loadAdmin();
  setInterval(()=>{ if(document.hidden || editing!==null || document.getElementById('modalBg').classList.contains('on') || document.activeElement?.closest?.('.form')) return;
    api('/api/admin',{method:'POST',body:JSON.stringify({k:ADMIN,action:'state'})}).then(x=>{ if(JSON.stringify([x.jury,x.allIn,x.entries])!==JSON.stringify([A.jury,A.allIn,A.entries])){ A=x; S=x; render(); } }).catch(()=>{}); }, 20000);
}
else if(!KEY){ $app.innerHTML = `<div class="waiting"><h3 class="cond">Personal link needed</h3><p>Each judge has a private link sent by email. Open that link to reach your scorecard.</p></div>`; }
else { load(); setInterval(poll, 8000); window.addEventListener('focus', poll); document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) poll(); }); }
})();
