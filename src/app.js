import { CHARACTERS, SKILLS, LOCATIONS, ITEMS } from './data.js';
import { loadState, saveState, resetState } from './state.js';
import { createBattle, useSkill } from './battle.js';

let state = loadState();
let view = 'world';
let modal = null;
let battle = null;
let toastTimer = null;

const app = document.querySelector('#app');

function pct(v,max){ return Math.max(0, Math.min(100, Math.round(v/max*100))); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function commit(message){ state.logs.unshift(message); state.logs = state.logs.slice(0,30); saveState(state); render(); }
function showToast(msg){ clearTimeout(toastTimer); const old=document.querySelector('.toast'); old?.remove(); const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); toastTimer=setTimeout(()=>el.remove(),1800); }

function header(){ return `
<header class="topbar"><div class="brand-row"><div class="brand"><div class="brand-mark"><span>良</span></div><div><h1>不良人：江湖行</h1><small>PRIVATE FAN GAME · DEMO</small></div></div><div class="resources"><div class="resource">Lv.<b>${state.level}</b></div><div class="resource">银<b>${state.silver}</b></div></div></div></header>`; }

function nav(){
  const items=[['world','⌖','江湖'],['party','人','队伍'],['skills','武','武学'],['bag','囊','行囊'],['logs','录','记录']];
  return `<nav class="bottom-nav">${items.map(([id,ico,label])=>`<button class="nav-btn ${view===id?'active':''}" data-nav="${id}"><span class="ico">${ico}</span><span>${label}</span></button>`).join('')}</nav>`;
}

function worldView(){
  const progress = state.flags.scoutDefeated ? 48 : 12;
  return `<main class="page">
    <section class="hero-banner"><div class="eyebrow">序章 · 风起渝州</div><h2>${state.flags.scoutDefeated?'驿道血迹指向藏兵谷':'城外有人盯上了你'}</h2><p>${state.flags.scoutDefeated?'玄冥教探子临死前留下了一个奇怪的暗号。蚩梦认为，线索与旧日不良人有关。':'你刚入渝州便卷入追杀。蚩梦说，那群黑衣人身上有玄冥教的味道。'}</p><div class="progress-line"><span style="width:${progress}%"></span></div></section>
    <div class="section-title"><h3>当前任务</h3><span>主线</span></div>
    <section class="quest-card"><span class="tag">${state.flags.scoutDefeated?'已更新':'进行中'}</span><h4>${state.flags.scoutDefeated?'旧谷暗号':'驿道疑云'}</h4><p>${state.flags.scoutDefeated?'前往藏兵谷调查石壁上的不良人暗记。':'前往城南驿道，调查玄冥教为何在此出没。'}</p><button class="primary full" data-quest>${state.flags.scoutDefeated?'前往藏兵谷':'调查城南驿道'}</button></section>
    <div class="section-title"><h3>江湖地点</h3><span>${LOCATIONS.filter(x=>x.unlock(state)).length} / ${LOCATIONS.length} 已解锁</span></div>
    <section class="location-list">${LOCATIONS.map(loc=>{const unlocked=loc.unlock(state);return `<button class="location" data-location="${loc.id}" ${unlocked?'':'disabled'}><span class="loc-icon">${loc.icon}</span><span class="loc-copy"><b>${loc.name}</b><small>${loc.desc}${unlocked?'':' · 尚未解锁'}</small></span><span class="chev">›</span></button>`}).join('')}</section>
  </main>`;
}

function partyView(){
  return `<main class="page"><div class="section-title"><h3>同行之人</h3><span>${state.party.length} / 4 上阵</span></div><section class="character-grid">${Object.values(CHARACTERS).map(c=>{
    const inParty=state.party.includes(c.id); const locked=c.locked && !inParty;
    return `<article class="character-card ${locked?'locked':''}"><div class="portrait" data-char="${c.short}" style="--c1:${c.c1};--c2:${c.c2}"><span class="level">Lv.${c.level}</span></div><div class="char-info"><div class="rarity">${c.rarity}${inParty?' · 同行':''}</div><h3>${c.name}</h3><div class="stat-row"><span>攻 <b>${c.attack}</b></span><span>防 <b>${c.defense}</b></span><span>速 <b>${c.speed}</b></span></div><div class="hpbar"><span style="width:100%"></span></div>${locked?`<div class="lock-note">🔒 ${c.unlock}</div>`:`<div class="lock-note">武学：${c.skills.map(id=>SKILLS[id].name).join('、')}</div>`}</div></article>`;
  }).join('')}</section></main>`;
}

function skillsView(){
  const owned=new Set(state.party.flatMap(id=>CHARACTERS[id].skills));
  return `<main class="page"><div class="section-title"><h3>已掌握武学</h3><span>${owned.size} 门</span></div><section class="skill-list">${[...owned].map(id=>{const s=SKILLS[id];return `<article class="skill-card"><div class="skill-head"><span class="skill-name">${s.name}</span><span class="skill-type">${s.type}</span></div><p>${s.desc}</p><div class="skill-meta"><span>熟练 Lv.${state.mastery[id]||1}</span><span>${s.heal?'治疗型':`威力 ${Math.round((s.power||1)*100)}%`}</span></div></article>`}).join('')}</section></main>`;
}

function bagView(){ return `<main class="page"><div class="section-title"><h3>行囊</h3><span>第一版</span></div><section class="inventory-list">${ITEMS.map(i=>`<article class="item-card"><div class="skill-head"><b>${i.name}</b><span class="skill-type">×${i.count}</span></div><p>${i.desc}</p></article>`).join('')}</section></main>`; }

function logsView(){ return `<main class="page"><div class="section-title"><h3>江湖记录</h3><span>自动存档</span></div><section class="log-list">${state.logs.map((x,i)=>`<article class="log-card"><b>${i===0?'最近':'记录'}</b><p>${esc(x)}</p></article>`).join('')}</section><section class="settings"><button class="danger full" data-reset>重置本地存档</button><div class="version">不良人：江湖行 · Prototype v0.1</div></section></main>`; }

function locationModal(id){
  const loc=LOCATIONS.find(x=>x.id===id); if(!loc||!loc.unlock(state))return '';
  let body='';
  if(id==='yuzhou') body=`<button class="story-option" data-action="story-scout"><b>城南驿道</b><small>${state.flags.scoutDefeated?'已击退玄冥教探子，可再次巡查。':'发现玄冥教踪迹。危险：低。'}</small></button><button class="story-option" data-action="rest"><b>客栈休整</b><small>恢复状态。当前版本战后会自动恢复。</small></button>`;
  else if(id==='cangbing') body=`<button class="story-option" data-action="cangbing-story"><b>查看石壁暗记</b><small>推进序章剧情并获得银两。</small></button><button class="story-option" data-action="cangbing-fight"><b>深入谷口</b><small>挑战玄冥教力士。危险：中。</small></button>`;
  else body=`<button class="story-option"><b>区域尚在制作</b><small>地图已解锁，剧情将在后续版本加入。</small></button>`;
  return `<div class="modal" data-close><section class="sheet" data-sheet><div class="sheet-handle"></div><div class="eyebrow">地点</div><h2>${loc.name}</h2><div class="sheet-desc">${loc.desc}</div><div class="option-stack">${body}<button class="secondary full" data-close-btn>返回江湖</button></div></section></div>`;
}

function battleModal(){
  const current=battle?.allies[battle.allyIndex];
  const fighter=(f)=>`<div class="fighter ${current===f&&battle.status==='active'?'current':''} ${f.hp<=0?'dead':''}"><div class="fighter-top"><b>${f.name}</b><small>${Math.max(0,f.hp)}/${f.maxHp}</small></div><div class="hpbar"><span style="width:${pct(f.hp,f.maxHp)}%"></span></div></div>`;
  let controls='';
  if(battle.status==='active' && current) controls=`<div class="skill-buttons">${current.skills.map(id=>{const s=SKILLS[id];return `<button class="skill-btn" data-skill="${id}"><b>${s.name}</b><small>${s.heal?'恢复气血':`威力 ${Math.round(s.power*100)}%`}</small></button>`}).join('')}</div>`;
  if(battle.status==='win') controls=`<button class="primary full" data-battle-finish>领取战果</button>`;
  if(battle.status==='lose') controls=`<button class="secondary full" data-battle-leave>暂时撤退</button>`;
  return `<div class="modal"><section class="sheet"><div class="sheet-handle"></div><div class="battle-title"><div><div class="eyebrow">即时演算 · 回合制</div><h2>交锋</h2></div><span class="turn-pill">第 ${battle.round} 回合</span></div><div class="combatants"><div class="side">${battle.allies.map(fighter).join('')}</div><div class="vs">VS</div><div class="side">${battle.enemies.map(fighter).join('')}</div></div><div class="battle-log">${battle.log.slice(-8).map(x=>`<div>· ${esc(x)}</div>`).join('')}</div>${controls}</section></div>`;
}

function render(){
  const pages={world:worldView,party:partyView,skills:skillsView,bag:bagView,logs:logsView};
  app.innerHTML=`<div class="app-shell">${header()}${pages[view]()}${nav()}</div>${modal?locationModal(modal):''}${battle?battleModal():''}`;
  bind();
}

function startBattle(enemyIds,source){ battle=createBattle(enemyIds,state.party); battle.source=source; modal=null; render(); }

function finishBattle(){
  if(battle?.status!=='win') return;
  if(battle.source==='scout') {
    state.flags.scoutDefeated=true; state.quest='旧谷暗号'; state.silver+=60; state.exp+=35;
    state.logs.unshift('你与蚩梦击退玄冥教探子，搜到指向藏兵谷的旧暗号。获得 60 银两、35 阅历。');
  } else if(battle.source==='cangbing') {
    state.silver+=90; state.exp+=55; state.logs.unshift('你击退藏兵谷口的玄冥教力士。获得 90 银两、55 阅历。');
  }
  saveState(state); battle=null; render(); showToast('战果已结算 · 自动存档');
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav; modal=null; render();});
  document.querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{modal=b.dataset.location; render();});
  document.querySelector('[data-quest]')?.addEventListener('click',()=>{ modal=state.flags.scoutDefeated?'cangbing':'yuzhou'; render(); });
  document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',e=>{if(e.target===x){modal=null;render();}}));
  document.querySelectorAll('[data-sheet]').forEach(x=>x.addEventListener('click',e=>e.stopPropagation()));
  document.querySelector('[data-close-btn]')?.addEventListener('click',()=>{modal=null;render();});
  document.querySelector('[data-action="story-scout"]')?.addEventListener('click',()=>startBattle(['scout'],'scout'));
  document.querySelector('[data-action="cangbing-fight"]')?.addEventListener('click',()=>startBattle(['guard'],'cangbing'));
  document.querySelector('[data-action="rest"]')?.addEventListener('click',()=>{modal=null;render();showToast('已休整');});
  document.querySelector('[data-action="cangbing-story"]')?.addEventListener('click',()=>{
    if(!state.flags.cangbingVisited){state.flags.cangbingVisited=true;state.silver+=30;commit('你在藏兵谷石壁发现不良人暗记。蚩梦认出其中藏着“岐”字。获得 30 银两。');showToast('主线已推进');}
    else showToast('石壁暗记已经调查过了');
    modal=null; render();
  });
  document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{battle=useSkill(battle,b.dataset.skill);render();});
  document.querySelector('[data-battle-finish]')?.addEventListener('click',finishBattle);
  document.querySelector('[data-battle-leave]')?.addEventListener('click',()=>{battle=null;render();showToast('已撤回渝州');});
  document.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('确定清空当前本地存档？')){state=resetState();view='world';render();showToast('存档已重置');}});
}

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
