/* =========================
   treasure_fix.js
   法宝系统收口文件
   作用：
   1. 统一法宝灵效显示
   2. 修复封神榜显示
   3. 统一图鉴法宝详情
   4. 不再继续往 index.html 底部堆补丁
========================= */

(function(){

function tf_num(v,def=0){
  let n=Number(v);
  return Number.isFinite(n)?n:def;
}

function tf_pct(v){
  return (Math.round(tf_num(v,0)*1000)/10).toFixed(1).replace('.0','')+'%';
}

function tf_formatPower(v){
  if(typeof formatPower==='function')return formatPower(v);
  v=tf_num(v,0);
  if(v>=100000000)return (v/100000000).toFixed(2)+'亿';
  if(v>=10000)return (v/10000).toFixed(1)+'万';
  return Math.round(v);
}

function tf_qualityInfo(q){
  if(typeof treasureQInfo==='function')return treasureQInfo(q);
  return {
    N:{name:'普通法宝',cls:'n',color:'#ddd'},
    R:{name:'后天灵宝',cls:'r',color:'#4fc3f7'},
    SR:{name:'后天至宝',cls:'sr',color:'#ce93d8'},
    SSR:{name:'先天灵宝',cls:'ssr',color:'#ffd54f'},
    SP:{name:'先天至宝',cls:'sp',color:'#ff4444'},
    UR:{name:'混沌至宝',cls:'ur',color:'#ff66ff'}
  }[q] || {name:'法宝',cls:'n',color:'#ddd'};
}

function tf_statName(stat){
  if(typeof statName==='function')return statName(stat);
  return {atk:'攻击',def:'防御',hp:'气血'}[stat] || stat || '属性';
}

function tf_typeName(type){
  if(typeof treasureTypeName==='function')return treasureTypeName(type);
  return {
    ATK:'攻击法宝',
    DEF:'防御法宝',
    HP:'气血法宝',
    SUP:'辅助法宝',
    BAL:'均衡法宝',
    CTRL:'控制法宝'
  }[type] || '法宝';
}

function tf_findBase(id){
  if(typeof findTreasureBase==='function')return findTreasureBase(id);
  if(typeof TREASURE_LIBRARY==='undefined')return null;

  for(let q in TREASURE_LIBRARY){
    let hit=(TREASURE_LIBRARY[q]||[]).find(x=>x.id===id);
    if(hit)return hit;
  }

  return null;
}

function tf_realTurn(item){
  if(!item)return 0;
  if(typeof treasureRealTurn==='function')return treasureRealTurn(item);
  return tf_num(item.turn,0);
}

function tf_effectRate(item,base){
  if(!item || !base)return 0;

  if(base.effect==='sealBook' || base.name==='封神榜'){
    let turn=tf_realTurn(item);
    if(turn>=3)return 0.08;
    if(turn>=1)return 0.06;
    return 0.04;
  }

  if(typeof treasureEffectRate==='function')return treasureEffectRate(item,base);

  let qInfo=tf_qualityInfo(base.quality);
  let arr=qInfo.effectRates || [];
  return arr[Math.min(7,tf_realTurn(item))] || 0;
}

function tf_sealBookEnergy(item){
  let turn=tf_realTurn(item);
  if(turn>=3)return 2;
  if(turn>=1)return 1;
  return 0;
}

function tf_effectText(base,item){
  if(!base)return '无';

  let effect=base.effect || 'statOnly';

  if(effect==='sealBook' || base.name==='封神榜'){
    return '技能伤害 +'+tf_pct(tf_effectRate(item,base))+'；当前开局怒气 +'+tf_sealBookEnergy(item)+'（1转怒气+1，3转怒气+2）';
  }

  let pct=tf_pct(tf_effectRate(item,base));

  if(effect==='statOnly')return '仅提供基础属性';
  if(effect==='skillDmg')return '技能伤害 +'+pct;
  if(effect==='normalDmg')return '普攻伤害 +'+pct;
  if(effect==='healBoost')return '治疗效果 +'+pct;
  if(effect==='shieldBoost')return '护盾效果 +'+pct;
  if(effect==='dmgReduce')return '受到伤害降低 '+pct;
  if(effect==='lifesteal')return '伤害吸血 '+pct;
  if(effect==='critBoost')return '暴击 +'+pct;
  if(effect==='critDmg')return '暴击伤害 +'+pct;
  if(effect==='hitBoost')return '命中 +'+pct;
  if(effect==='dodgeBoost')return '闪避 +'+pct;

  return effect+' +'+pct;
}

function tf_effectNote(base,item){
  if(!base)return '';

  let effect=base.effect || 'statOnly';

  if(effect==='statOnly'){
    return '说明：低阶法宝只提供基础属性，不带高级灵效。';
  }

  if(effect==='sealBook' || base.name==='封神榜'){
    return '说明：封神榜0转不加怒气，只给少量技能伤害；1转开局怒气+1；3转开局怒气+2。';
  }

  if(['skillDmg','normalDmg','healBoost','shieldBoost','dmgReduce','lifesteal'].includes(effect)){
    return '说明：该灵效已接入实战。';
  }

  return '说明：该灵效属于基础加成，后续可继续接入更完整战斗计算。';
}

function tf_mainStat(base){
  return base.mainStat || base.main || 'atk';
}

function tf_subStat(base){
  return base.subStat || base.sub || (tf_mainStat(base)==='hp'?'def':'hp');
}

function tf_statValue(item,base,stat){
  if(typeof treasureStatValue==='function')return treasureStatValue(item,base,stat);
  return 0;
}

function tf_power(item){
  if(typeof treasurePower==='function')return treasurePower(item);
  return 0;
}

function tf_textStyle(q){
  if(typeof treasureTextStyle==='function')return treasureTextStyle(q);

  if(q==='UR'){
    return 'background-image:linear-gradient(90deg,#ff66ff,#5ad1ff,#ffe066,#7dff9b,#ff7a7a,#ff66ff);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:urFlow 4s linear infinite;';
  }

  return 'color:'+tf_qualityInfo(q).color+';';
}

/* 封神榜规则重新压一次，避免旧数据覆盖 */
function tf_applyTreasureFinalDesign(){
  if(typeof TREASURE_LIBRARY==='undefined')return;

  Object.keys(TREASURE_LIBRARY).forEach(q=>{
    (TREASURE_LIBRARY[q]||[]).forEach(t=>{
      if(t.name==='封神榜'){
        t.effect='sealBook';
        t.type='SUP';
        t.mainStat='atk';
        t.subStat='hp';
        t.lore='封神榜记名诸神。0转提升少量技能伤害；1转开局怒气+1；3转开局怒气+2。';
      }
    });
  });
}

/* 覆盖 effectName，避免显示“封神榜 +5%”这种怪东西 */
let oldEffectName = typeof effectName==='function' ? effectName : null;
window.effectName=function(effect){
  if(effect==='sealBook')return '封神榜';
  if(effect==='statOnly')return '基础属性';
  if(effect==='skillDmg')return '技能伤害';
  if(effect==='normalDmg')return '普攻伤害';
  if(effect==='healBoost')return '治疗效果';
  if(effect==='shieldBoost')return '护盾效果';
  if(effect==='dmgReduce')return '受到伤害降低';
  if(effect==='lifesteal')return '伤害吸血';
  if(effect==='critBoost')return '暴击';
  if(effect==='critDmg')return '暴击伤害';
  if(effect==='hitBoost')return '命中';
  if(effect==='dodgeBoost')return '闪避';
  if(oldEffectName)return oldEffectName(effect);
  return effect || '法宝灵效';
};

/* 给其他旧补丁调用 */
window.treasureRealBattleTextFinal=function(base,item){
  return tf_effectText(base,item);
};

/* 图鉴法宝详情：正式覆盖 */
window.showCodexTreasureDetail=function(id){
  tf_applyTreasureFinalDesign();

  let base=tf_findBase(id);
  if(!base)return;

  let qInfo=tf_qualityInfo(base.quality);
  let item={
    uid:'codex_'+base.id,
    tid:base.id,
    level:1,
    turn:0
  };

  let mainStat=tf_mainStat(base);
  let subStat=tf_subStat(base);

  let cardWrap=document.getElementById('codexDetailCardWrap');
  let textBox=document.getElementById('codexDetailText');
  let modal=document.getElementById('codexDetailModal');

  if(!cardWrap || !textBox || !modal)return;

  if(typeof renderTreasureCodexCard==='function'){
    cardWrap.innerHTML=renderTreasureCodexCard(base,true);
  }else{
    cardWrap.innerHTML=`
      <div class="codex-card ${qInfo.cls} big" style="border-color:${qInfo.color};">
        <div class="qline"><span>${qInfo.name}</span><span>${tf_typeName(base.type).replace('法宝','')}</span></div>
        <div class="cname" style="${tf_textStyle(base.quality)}">${base.name}</div>
      </div>
    `;
  }

  textBox.className='codex-detail-copy '+qInfo.cls;
  textBox.innerHTML=`
    <div class="line">品质：${qInfo.name}</div>
    <div class="line">类型：${tf_typeName(base.type)}</div>
    <div class="line">主属性：${tf_statName(mainStat)} +${tf_statValue(item,base,mainStat)}</div>
    <div class="line">副属性：${tf_statName(subStat)} +${tf_statValue(item,base,subStat)}</div>
    <div class="line">灵效：${tf_effectText(base,item)}</div>
    <div class="line">初始战力：${tf_formatPower(tf_power(item))}</div>

    <div class="skill-block">
      <div class="line">${tf_effectNote(base,item)}</div>
    </div>

    <div class="skill-block">
      <div class="line">来历：</div>
      <div class="line">${base.lore || '此法宝来历暂未收录。'}</div>
    </div>
  `;

  modal.classList.remove('hidden');
};

/* 背包法宝详情：正式覆盖 */
window.showTreasureDetail=function(id,mode){
  tf_applyTreasureFinalDesign();

  let base=null;
  let item=null;

  if(mode==='bag'){
    if(typeof treasureBag==='undefined')return;
    item=treasureBag.find(x=>x.uid===id);
    if(item)base=tf_findBase(item.tid);
  }else{
    base=tf_findBase(id);
  }

  if(!base)return;

  let qInfo=tf_qualityInfo(base.quality);
  let tempItem=item || {
    uid:'temp_'+base.id,
    tid:base.id,
    level:1,
    turn:0
  };

  let lv=item ? tf_num(item.level,1) : 1;
  let turn=item ? tf_realTurn(item) : 0;

  let mainStat=tf_mainStat(base);
  let subStat=tf_subStat(base);

  let mainValue=tf_statValue(tempItem,base,mainStat);
  let subValue=tf_statValue(tempItem,base,subStat);
  let powerValue=tf_power(tempItem);

  let owner=item && typeof treasureOwner==='function' ? treasureOwner(item.uid) : null;
  let selected=typeof heroes!=='undefined' ? (heroes.find(x=>x.id===selectedHeroId) || (typeof team==='function'?team()[0]:null)) : null;

  let actionHtml='';

  if(mode==='bag' && item){
    if(owner){
      if(selected && owner.id===selected.id){
        actionHtml=`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <button class="choose-close" style="color:#ff6666;border-color:#b73333;" onclick="unequipTreasure('${item.uid}')">卸下</button>
            <button class="choose-close" style="color:#d8aa45;border-color:#d8aa45;" onclick="openTreasureEquipChoose('${item.uid}')">装备/更换</button>
          </div>
        `;
      }else{
        actionHtml=`<button class="choose-close" style="margin-top:8px;opacity:.55;">已由 ${owner.name} 装备</button>`;
      }
    }else{
      actionHtml=`<button class="choose-close" style="margin-top:8px;color:#d8aa45;border-color:#d8aa45;" onclick="equipTreasureToSelected('${item.uid}')">装备到当前角色</button>`;
    }
  }

  if(typeof closeTreasureDetailPop==='function'){
    closeTreasureDetailPop();
  }

  let old=document.getElementById('treasureDetailPop');
  if(old)old.remove();

  let mask=document.createElement('div');
  mask.id='treasureDetailPop';
  mask.className='modal-mask';

  mask.onclick=function(e){
    if(e.target.id==='treasureDetailPop'){
      if(typeof closeTreasureDetailPop==='function')closeTreasureDetailPop();
      let pop=document.getElementById('treasureDetailPop');
      if(pop)pop.remove();
    }
  };

  mask.innerHTML=`
    <div class="codex-detail-box" onclick="event.stopPropagation()">
      <div class="choose-title">法宝详情</div>

      <div class="codex-card ${qInfo.cls} big" style="margin-bottom:8px;border-color:${qInfo.color};">
        <div class="qline">
          <span>${qInfo.name}</span>
          <span>${tf_typeName(base.type).replace('法宝','')}</span>
        </div>
        <div class="cname" style="${tf_textStyle(base.quality)}">${base.name}</div>
      </div>

      <div class="codex-detail-text">
        <div class="codex-detail-copy ${qInfo.cls}" style="${base.quality==='UR'?'':('color:'+qInfo.color)}">
          <div class="line">品质：${qInfo.name}</div>
          <div class="line">类型：${tf_typeName(base.type)}</div>
          <div class="line">等级：${lv}</div>
          <div class="line">转数：${turn}转</div>
          <div class="line">主属性：${tf_statName(mainStat)} +${mainValue}</div>
          <div class="line">副属性：${tf_statName(subStat)} +${subValue}</div>
          <div class="line">灵效：${tf_effectText(base,tempItem)}</div>
          <div class="line">战力：${tf_formatPower(powerValue)}</div>
          ${owner?`<div class="line">当前装备：${owner.name}</div>`:''}

          <div class="skill-block">
            <div class="line">${tf_effectNote(base,tempItem)}</div>
          </div>

          <div class="skill-block">
            <div class="line">来历：</div>
            <div class="line">${base.lore || '此法宝来历暂未收录。'}</div>
          </div>
        </div>
      </div>

      ${typeof treasureUpgradePanelFinal==='function' && mode==='bag' && item ? treasureUpgradePanelFinal(item) : ''}

      ${actionHtml}

      <button class="choose-close" style="margin-top:8px;" onclick="closeTreasureDetailPop();let p=document.getElementById('treasureDetailPop');if(p)p.remove();">关闭</button>
    </div>
  `;

  document.querySelector('.game').appendChild(mask);
};

tf_applyTreasureFinalDesign();

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

/* =========================
   法宝显示与灵效强化 V2
   1. 删除“说明”区
   2. 封神榜来历改成神话来历
   3. UR / SP 灵效描述增强
   4. 继续用现有效果字段接入实战
========================= */

function tf_setTreasureV2(name,effect,type,mainStat,subStat,lore){
  if(typeof TREASURE_LIBRARY==='undefined')return;

  Object.keys(TREASURE_LIBRARY).forEach(q=>{
    (TREASURE_LIBRARY[q]||[]).forEach(t=>{
      if(t.name===name){
        t.effect=effect;
        t.type=type;
        t.mainStat=mainStat;
        t.subStat=subStat;
        t.lore=lore;
      }
    });
  });
}

function tf_applyStrongTreasureV2(){
  if(typeof TREASURE_LIBRARY==='undefined')return;

  /* N / R / SR：低阶只给基础属性 */
  ['N','R','SR'].forEach(q=>{
    (TREASURE_LIBRARY[q]||[]).forEach(t=>{
      t.effect='statOnly';
    });
  });

  /* SSR：简单灵效，不搞太复杂 */
  tf_setTreasureV2('紫电锤','skillDmg','ATK','atk','def','雷部炼成的紫电法器，锤落如雷霆破阵，可助修士提升法术爆发。');
  tf_setTreasureV2('九龙神火罩','skillDmg','ATK','atk','hp','九龙真火盘绕成罩，焚妖镇魔，火势一起万邪难近。');
  tf_setTreasureV2('定海神珠','normalDmg','ATK','atk','hp','二十四颗神珠之一，珠光定海，落如星陨。');
  tf_setTreasureV2('混元金斗','dmgReduce','DEF','hp','def','三霄娘娘所持奇宝，可削人顶上三花，闭人胸中五气。');
  tf_setTreasureV2('阴阳镜','hitBoost','CTRL','atk','hp','一面照生，一面照死，阴阳轮转之间可辨敌机。');
  tf_setTreasureV2('照妖镜','hitBoost','CTRL','atk','def','镜光照妖，邪祟无所遁形。');
  tf_setTreasureV2('风雷双翼','normalDmg','ATK','atk','hp','风雷随身，振翼之间身法如电。');
  tf_setTreasureV2('金蛟剪','critBoost','ATK','atk','def','双蛟化剪，交错而出，神仙亦难抵挡。');

  /* SP：开始有治疗、护盾、吸血、减伤 */
  tf_setTreasureV2('玲珑宝塔','shieldBoost','DEF','hp','def','托塔天王所持宝塔，可镇妖伏魔，护持阵前不崩。');
  tf_setTreasureV2('山河社稷图','dmgReduce','DEF','hp','def','图中自成山河天地，可困敌，也可护主。');
  tf_setTreasureV2('河图洛书','healBoost','SUP','hp','atk','河图洛书藏天地数理，推演生机，逆转衰败。');
  tf_setTreasureV2('十二品莲台','healBoost','SUP','hp','def','莲台生光，护法安神，能续队伍气脉。');
  tf_setTreasureV2('业火红莲','lifesteal','ATK','atk','hp','红莲业火焚尽罪业，伤敌亦能反哺自身。');
  tf_setTreasureV2('玄元控水旗','dmgReduce','DEF','hp','def','控水成阵，万流归一，可化解外来杀机。');
  tf_setTreasureV2('离地焰光旗','skillDmg','ATK','atk','hp','焰光升腾，火势离地，专破敌阵。');
  tf_setTreasureV2('青莲宝色旗','shieldBoost','DEF','hp','def','青莲宝光护身，诸邪难近。');
  tf_setTreasureV2('素色云界旗','healBoost','SUP','hp','def','云界清宁，法光温养，可恢复队伍气血。');
  tf_setTreasureV2('戊己杏黄旗','dmgReduce','DEF','hp','def','杏黄旗展开，万法不侵，最善守阵。');

  /* UR：混沌至宝 / 顶级法宝 */
  tf_setTreasureV2('混沌钟','dmgReduce','DEF','hp','def','混沌初开前孕育的至宝，钟声一响可镇压诸天，定住地水火风。');
  tf_setTreasureV2('盘古幡','skillDmg','ATK','atk','hp','元始天尊镇教至宝，幡动可撕裂混沌，破开万法。');
  tf_setTreasureV2('太极图','dmgReduce','DEF','hp','def','太清圣人镇教至宝，阴阳流转，定住乾坤万象。');
  tf_setTreasureV2('诛仙阵图','skillDmg','ATK','atk','def','通天教主所掌杀伐阵图，阵起则剑气纵横，仙神难逃。');
  tf_setTreasureV2('造化玉碟','healBoost','SUP','hp','atk','记载三千大道残篇的无上道器，蕴含造化生机。');
  tf_setTreasureV2('鸿蒙珠','shieldBoost','DEF','hp','atk','鸿蒙未判时孕育的灵珠，内藏原初本源，可护元神不灭。');
  tf_setTreasureV2('封神榜','sealBook','SUP','atk','hp','姜子牙代天封神所奉天书，榜上有名者归位天庭，执掌神职。');
  tf_setTreasureV2('弑神枪','lifesteal','ATK','atk','hp','先天杀伐至宝，枪锋饮血，可伤圣躯，可破神魂。');
  tf_setTreasureV2('混沌青莲','healBoost','SUP','hp','def','混沌中孕育的无上青莲，生机无尽，万法归源。');
  tf_setTreasureV2('乾坤鼎','shieldBoost','DEF','hp','def','鼎中有乾坤，可炼万物，也可镇一方气运。');
  tf_setTreasureV2('七宝妙树','normalDmg','ATK','atk','hp','西方妙树，七宝流光，号称无物不刷。');
  tf_setTreasureV2('玄黄宝塔','dmgReduce','DEF','hp','def','天地玄黄功德凝成，悬于头顶，万法难伤。');
  tf_setTreasureV2('六魂幡','skillDmg','ATK','atk','def','幡动摄魂，杀机入魄，是截教极凶之宝。');
  tf_setTreasureV2('十二品功德金莲','healBoost','SUP','hp','def','西方教镇运金莲，功德护体，清净不染。');
  tf_setTreasureV2('十二品灭世黑莲','lifesteal','ATK','atk','hp','灭世黑莲吞噬生机，黑光起处万物凋零。');
}

tf_applyStrongTreasureV2();

/* 专属灵效显示 */
function tf_specialEffectTextV2(base,item){
  if(!base)return '';

  let name=base.name;
  let rate=tf_pct(tf_effectRate(item,base));

  if(name==='封神榜'){
    return '技能伤害 +'+tf_pct(tf_effectRate(item,base))+'；当前开局怒气 +'+tf_sealBookEnergy(item)+'（1转怒气+1，3转怒气+2）';
  }

  let map={
    /* UR */
    '混沌钟':'受到伤害降低 '+rate+'；开战时获得护盾，护盾存在时额外减伤。',
    '盘古幡':'技能伤害 +'+rate+'；攻击Boss时额外提升伤害。',
    '太极图':'受到伤害降低 '+rate+'；气血越低，减伤越高。',
    '诛仙阵图':'技能伤害 +'+rate+'；攻击前排时额外提升伤害。',
    '造化玉碟':'治疗效果 +'+rate+'；回合开始时为最低气血队友恢复少量气血。',
    '鸿蒙珠':'护盾效果 +'+rate+'；开战时为自身获得护盾。',
    '弑神枪':'伤害吸血 '+rate+'；目标气血越低，伤害越高。',
    '混沌青莲':'治疗效果 +'+rate+'；低血队友受到治疗时效果提升。',
    '乾坤鼎':'护盾效果 +'+rate+'；拥有护盾时受到伤害降低。',
    '七宝妙树':'普攻伤害 +'+rate+'；普攻有概率削弱目标攻击。',
    '玄黄宝塔':'受到伤害降低 '+rate+'；开战时获得额外护盾。',
    '六魂幡':'技能伤害 +'+rate+'；对被弱化目标额外提升伤害。',
    '十二品功德金莲':'治疗效果 +'+rate+'；治疗目标时附加少量护盾。',
    '十二品灭世黑莲':'伤害吸血 '+rate+'；击杀目标后恢复自身气血。',

    /* SP */
    '玲珑宝塔':'护盾效果 +'+rate+'；护盾存在时受到伤害降低。',
    '山河社稷图':'受到伤害降低 '+rate+'；前排受到伤害时效果更明显。',
    '河图洛书':'治疗效果 +'+rate+'；治疗最低气血目标时额外提升。',
    '十二品莲台':'治疗效果 +'+rate+'；治疗后附加少量护盾。',
    '业火红莲':'伤害吸血 '+rate+'；技能伤害也可触发吸血。',
    '玄元控水旗':'受到伤害降低 '+rate+'；受到群体伤害时额外减伤。',
    '离地焰光旗':'技能伤害 +'+rate+'；攻击被弱化目标时额外提升。',
    '青莲宝色旗':'护盾效果 +'+rate+'；开战时获得少量护盾。',
    '素色云界旗':'治疗效果 +'+rate+'；治疗目标时提升其防御。',
    '戊己杏黄旗':'受到伤害降低 '+rate+'；气血低于一半时额外减伤。'
  };

  return map[name] || '';
}

/* 覆盖灵效文字：优先用专属显示 */
tf_effectText=function(base,item){
  if(!base)return '无';

  let special=tf_specialEffectTextV2(base,item);
  if(special)return special;

  let effect=base.effect || 'statOnly';

  if(effect==='sealBook' || base.name==='封神榜'){
    return '技能伤害 +'+tf_pct(tf_effectRate(item,base))+'；当前开局怒气 +'+tf_sealBookEnergy(item)+'（1转怒气+1，3转怒气+2）';
  }

  let pct=tf_pct(tf_effectRate(item,base));

  if(effect==='statOnly')return '仅提供基础属性';
  if(effect==='skillDmg')return '技能伤害 +'+pct;
  if(effect==='normalDmg')return '普攻伤害 +'+pct;
  if(effect==='healBoost')return '治疗效果 +'+pct;
  if(effect==='shieldBoost')return '护盾效果 +'+pct;
  if(effect==='dmgReduce')return '受到伤害降低 '+pct;
  if(effect==='lifesteal')return '伤害吸血 '+pct;
  if(effect==='critBoost')return '暴击 +'+pct;
  if(effect==='critDmg')return '暴击伤害 +'+pct;
  if(effect==='hitBoost')return '命中 +'+pct;
  if(effect==='dodgeBoost')return '闪避 +'+pct;

  return effect+' +'+pct;
};

/* 背包法宝详情：删除说明区 */
window.showTreasureDetail=function(id,mode){
  tf_applyStrongTreasureV2();

  let base=null;
  let item=null;

  if(mode==='bag'){
    if(typeof treasureBag==='undefined')return;
    item=treasureBag.find(x=>x.uid===id);
    if(item)base=tf_findBase(item.tid);
  }else{
    base=tf_findBase(id);
  }

  if(!base)return;

  let qInfo=tf_qualityInfo(base.quality);
  let tempItem=item || {
    uid:'temp_'+base.id,
    tid:base.id,
    level:1,
    turn:0
  };

  let lv=item ? tf_num(item.level,1) : 1;
  let turn=item ? tf_realTurn(item) : 0;

  let mainStat=tf_mainStat(base);
  let subStat=tf_subStat(base);

  let mainValue=tf_statValue(tempItem,base,mainStat);
  let subValue=tf_statValue(tempItem,base,subStat);
  let powerValue=tf_power(tempItem);

  let owner=item && typeof treasureOwner==='function' ? treasureOwner(item.uid) : null;
  let selected=typeof heroes!=='undefined' ? (heroes.find(x=>x.id===selectedHeroId) || (typeof team==='function'?team()[0]:null)) : null;

  let actionHtml='';

  if(mode==='bag' && item){
    if(owner){
      if(selected && owner.id===selected.id){
        actionHtml=`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <button class="choose-close" style="color:#ff6666;border-color:#b73333;" onclick="unequipTreasure('${item.uid}')">卸下</button>
            <button class="choose-close" style="color:#d8aa45;border-color:#d8aa45;" onclick="openTreasureEquipChoose('${item.uid}')">装备/更换</button>
          </div>
        `;
      }else{
        actionHtml=`<button class="choose-close" style="margin-top:8px;opacity:.55;">已由 ${owner.name} 装备</button>`;
      }
    }else{
      actionHtml=`<button class="choose-close" style="margin-top:8px;color:#d8aa45;border-color:#d8aa45;" onclick="equipTreasureToSelected('${item.uid}')">装备到当前角色</button>`;
    }
  }

  if(typeof closeTreasureDetailPop==='function'){
    closeTreasureDetailPop();
  }

  let old=document.getElementById('treasureDetailPop');
  if(old)old.remove();

  let mask=document.createElement('div');
  mask.id='treasureDetailPop';
  mask.className='modal-mask';

  mask.onclick=function(e){
    if(e.target.id==='treasureDetailPop'){
      if(typeof closeTreasureDetailPop==='function')closeTreasureDetailPop();
      let pop=document.getElementById('treasureDetailPop');
      if(pop)pop.remove();
    }
  };

  mask.innerHTML=`
    <div class="codex-detail-box" onclick="event.stopPropagation()">
      <div class="choose-title">法宝详情</div>

      <div class="codex-card ${qInfo.cls} big" style="margin-bottom:8px;border-color:${qInfo.color};">
        <div class="qline">
          <span>${qInfo.name}</span>
          <span>${tf_typeName(base.type).replace('法宝','')}</span>
        </div>
        <div class="cname" style="${tf_textStyle(base.quality)}">${base.name}</div>
      </div>

      <div class="codex-detail-text">
        <div class="codex-detail-copy ${qInfo.cls}" style="${base.quality==='UR'?'':('color:'+qInfo.color)}">
          <div class="line">品质：${qInfo.name}</div>
          <div class="line">类型：${tf_typeName(base.type)}</div>
          <div class="line">等级：${lv}</div>
          <div class="line">转数：${turn}转</div>
          <div class="line">主属性：${tf_statName(mainStat)} +${mainValue}</div>
          <div class="line">副属性：${tf_statName(subStat)} +${subValue}</div>
          <div class="line">灵效：${tf_effectText(base,tempItem)}</div>
          <div class="line">战力：${tf_formatPower(powerValue)}</div>
          ${owner?`<div class="line">当前装备：${owner.name}</div>`:''}

          <div class="skill-block">
            <div class="line">来历：</div>
            <div class="line">${base.lore || '此法宝来历暂未收录。'}</div>
          </div>
        </div>
      </div>

      ${typeof treasureUpgradePanelFinal==='function' && mode==='bag' && item ? treasureUpgradePanelFinal(item) : ''}

      ${actionHtml}

      <button class="choose-close" style="margin-top:8px;" onclick="closeTreasureDetailPop();let p=document.getElementById('treasureDetailPop');if(p)p.remove();">关闭</button>
    </div>
  `;

  document.querySelector('.game').appendChild(mask);
};

/* 图鉴法宝详情：删除说明区 */
window.showCodexTreasureDetail=function(id){
  tf_applyStrongTreasureV2();

  let base=tf_findBase(id);
  if(!base)return;

  let qInfo=tf_qualityInfo(base.quality);
  let item={
    uid:'codex_'+base.id,
    tid:base.id,
    level:1,
    turn:0
  };

  let mainStat=tf_mainStat(base);
  let subStat=tf_subStat(base);

  let cardWrap=document.getElementById('codexDetailCardWrap');
  let textBox=document.getElementById('codexDetailText');
  let modal=document.getElementById('codexDetailModal');

  if(!cardWrap || !textBox || !modal)return;

  if(typeof renderTreasureCodexCard==='function'){
    cardWrap.innerHTML=renderTreasureCodexCard(base,true);
  }else{
    cardWrap.innerHTML=`
      <div class="codex-card ${qInfo.cls} big" style="border-color:${qInfo.color};">
        <div class="qline"><span>${qInfo.name}</span><span>${tf_typeName(base.type).replace('法宝','')}</span></div>
        <div class="cname" style="${tf_textStyle(base.quality)}">${base.name}</div>
      </div>
    `;
  }

  textBox.className='codex-detail-copy '+qInfo.cls;
  textBox.innerHTML=`
    <div class="line">品质：${qInfo.name}</div>
    <div class="line">类型：${tf_typeName(base.type)}</div>
    <div class="line">主属性：${tf_statName(mainStat)} +${tf_statValue(item,base,mainStat)}</div>
    <div class="line">副属性：${tf_statName(subStat)} +${tf_statValue(item,base,subStat)}</div>
    <div class="line">灵效：${tf_effectText(base,item)}</div>
    <div class="line">初始战力：${tf_formatPower(tf_power(item))}</div>

    <div class="skill-block">
      <div class="line">来历：</div>
      <div class="line">${base.lore || '此法宝来历暂未收录。'}</div>
    </div>
  `;

  modal.classList.remove('hidden');
};

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

/* =========================
   实战规则补丁 V3
   1. 法宝转数成长倍率
   2. 封神榜转数规则
   3. 女娲复活次数限制
   4. UR/SP 法宝部分专属实战效果
========================= */

function tf_turnMulV3(item){
  let turn=0;
  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=Number(item&&item.turn||0);
  }

  return [1,1.25,1.45,1.70,1.95,2.20,2.45,2.70][Math.min(7,turn)] || 1;
}

function tf_itemByNameV3(h,name){
  if(!h || typeof getHeroTreasureItems!=='function')return null;

  let arr=getHeroTreasureItems(h);

  for(let i=0;i<arr.length;i++){
    let base=tf_findBase(arr[i].tid);
    if(base && base.name===name)return arr[i];
  }

  return null;
}

function tf_hasTreasureV3(h,name){
  return !!tf_itemByNameV3(h,name);
}

function tf_rateByNameV3(h,name,baseRate){
  let item=tf_itemByNameV3(h,name);
  if(!item)return 0;
  return baseRate*tf_turnMulV3(item);
}

function tf_totalExtraSkillRateV3(a,target){
  if(!a)return 0;

  let add=0;

  /* 盘古幡：技能伤害，打Boss额外 */
  if(tf_hasTreasureV3(a,'盘古幡')){
    add+=tf_rateByNameV3(a,'盘古幡',0.08);
    if(target && target.type==='Boss'){
      add+=tf_rateByNameV3(a,'盘古幡',0.12);
    }
  }

  /* 诛仙阵图：技能伤害，打前排额外。这里简单按目标存在就生效 */
  if(tf_hasTreasureV3(a,'诛仙阵图')){
    add+=tf_rateByNameV3(a,'诛仙阵图',0.09);
    add+=tf_rateByNameV3(a,'诛仙阵图',0.10);
  }

  /* 六魂幡：技能伤害，对弱化/控制目标额外 */
  if(tf_hasTreasureV3(a,'六魂幡')){
    add+=tf_rateByNameV3(a,'六魂幡',0.10);

    if(target && (
      target.weak>0 || target.defDown>0 || target.stun>0 || target.freeze>0 || target.charm>0 || target.seal>0
    )){
      add+=tf_rateByNameV3(a,'六魂幡',0.12);
    }
  }

  /* 弑神枪：目标低血增伤 */
  if(tf_hasTreasureV3(a,'弑神枪')){
    if(target && target.maxHp && target.hp/target.maxHp<0.4){
      add+=tf_rateByNameV3(a,'弑神枪',0.12);
    }
  }

  /* 离地焰光旗：技能伤害，攻击弱化目标额外 */
  if(tf_hasTreasureV3(a,'离地焰光旗')){
    add+=tf_rateByNameV3(a,'离地焰光旗',0.07);
    if(target && (target.weak>0 || target.defDown>0)){
      add+=tf_rateByNameV3(a,'离地焰光旗',0.08);
    }
  }

  return add;
}

function tf_totalDamageReduceV3(target){
  if(!target)return 0;

  let r=0;

  r+=tf_rateByNameV3(target,'混沌钟',0.08);
  r+=tf_rateByNameV3(target,'太极图',0.07);
  r+=tf_rateByNameV3(target,'玄黄宝塔',0.10);
  r+=tf_rateByNameV3(target,'山河社稷图',0.06);
  r+=tf_rateByNameV3(target,'玄元控水旗',0.06);
  r+=tf_rateByNameV3(target,'戊己杏黄旗',0.07);

  if(tf_hasTreasureV3(target,'太极图') && target.maxHp && target.hp/target.maxHp<0.5){
    r+=tf_rateByNameV3(target,'太极图',0.08);
  }

  if(tf_hasTreasureV3(target,'乾坤鼎') && target.shield>0){
    r+=tf_rateByNameV3(target,'乾坤鼎',0.08);
  }

  if(tf_hasTreasureV3(target,'玲珑宝塔') && target.shield>0){
    r+=tf_rateByNameV3(target,'玲珑宝塔',0.05);
  }

  if(tf_hasTreasureV3(target,'戊己杏黄旗') && target.maxHp && target.hp/target.maxHp<0.5){
    r+=tf_rateByNameV3(target,'戊己杏黄旗',0.06);
  }

  if(r>0.55)r=0.55;
  return r;
}

function tf_startShieldV3(h){
  if(!h)return 0;

  let pct=0;

  pct+=tf_rateByNameV3(h,'混沌钟',0.12);
  pct+=tf_rateByNameV3(h,'鸿蒙珠',0.15);
  pct+=tf_rateByNameV3(h,'玄黄宝塔',0.18);
  pct+=tf_rateByNameV3(h,'青莲宝色旗',0.08);

  return Math.round(h.maxHp*pct);
}

/* 覆盖技能伤害：加入专属规则 */
let tf_oldCalcSkillDamageV3=typeof calcSkillDamage==='function'?calcSkillDamage:null;
if(tf_oldCalcSkillDamageV3){
  calcSkillDamage=function(a,target,rate,minRate){
    let dmg=tf_oldCalcSkillDamageV3(a,target,rate,minRate);
    let add=tf_totalExtraSkillRateV3(a,target);
    if(add>0){
      dmg=Math.round(dmg*(1+add));
    }
    return dmg;
  };
}

/* 覆盖受伤：加入专属减伤 */
let tf_oldApplyDamageV3=typeof applyDamage==='function'?applyDamage:null;
if(tf_oldApplyDamageV3){
  applyDamage=function(target,dmg){
    let reduce=tf_totalDamageReduceV3(target);
    if(reduce>0){
      dmg=Math.max(1,Math.round(dmg*(1-reduce)));
    }
    return tf_oldApplyDamageV3(target,dmg);
  };
}

/* 覆盖普攻：七宝妙树普攻削攻击 */
let tf_oldAttackV3=typeof attack==='function'?attack:null;
if(tf_oldAttackV3){
  attack=async function(a,t,side,useSkill){
    let beforeTarget=t && t.hp>0 ? t : null;

    await tf_oldAttackV3(a,t,side,useSkill);

    if(!useSkill && a && beforeTarget && beforeTarget.hp>0){
      if(tf_hasTreasureV3(a,'七宝妙树') && Math.random()<0.3){
        if(typeof addWeak==='function'){
          addWeak(beforeTarget,1,0.10);
        }else{
          beforeTarget.weak=1;
          beforeTarget.weakPct=0.10;
        }
        battleTitle.innerText=beforeTarget.name+' 攻击降低';
        render();
        await sleep(250);
      }
    }

    /* 十二品灭世黑莲：击杀回血 */
    if(a && beforeTarget && beforeTarget.hp<=0 && tf_hasTreasureV3(a,'十二品灭世黑莲')){
      let heal=Math.round(a.maxHp*tf_rateByNameV3(a,'十二品灭世黑莲',0.12));
      a.hp=Math.min(a.maxHp,a.hp+heal);
      if(typeof floatHeal==='function')floatHeal(a.id,heal);
      render();
      await sleep(250);
    }
  };
}

/* 覆盖治疗：混沌青莲 / 河图洛书低血额外治疗 */
let tf_oldHealUnitV3=typeof healUnit==='function'?healUnit:null;
if(tf_oldHealUnitV3){
  healUnit=function(target,amount){
    let caster=null;

    /* 旧系统 healUnit 没传施法者，这里只做目标受疗增强，避免乱 */
    if(target && target.maxHp && target.hp/target.maxHp<0.5){
      amount=Math.round(amount*1.10);
    }

    return tf_oldHealUnitV3(target,amount);
  };
}

/* 开战护盾 + 初始化复活次数 */
let tf_oldChallengeBossV3=typeof challengeBoss==='function'?challengeBoss:null;
if(tf_oldChallengeBossV3){
  challengeBoss=async function(){
    team().forEach(h=>{
      h.reviveUsed=0;
      h.teamReviveUsed=0;
    });

    await tf_oldChallengeBossV3();

    /* 这里旧 challengeBoss 内部会重置状态，真正开战护盾放进 startBattleTreasureShieldV3 备用 */
  };
}

/* 更稳：直接覆盖 reset 后的开战护盾，挂到 playerFirst 判断前不方便，所以用延迟补护盾 */
let tf_oldRenderV3=typeof render==='function'?render:null;
let tf_startShieldDoneV3=false;

if(tf_oldRenderV3){
  render=function(){
    if(combatLock && !tf_startShieldDoneV3){
      let anyShield=false;

      team().forEach(h=>{
        if(h.hp>0 && !h._treasureStartShieldDone){
          let shield=tf_startShieldV3(h);
          if(shield>0 && typeof addShield==='function'){
            addShield(h,shield);
            h._treasureStartShieldDone=true;
            anyShield=true;
          }
        }
      });

      if(anyShield){
        tf_startShieldDoneV3=true;
      }
    }

    tf_oldRenderV3();
  };
}

/* 女娲复活次数限制：一场战斗最多3次 */
let tf_oldReviveUnitV3=typeof reviveUnit==='function'?reviveUnit:null;
if(tf_oldReviveUnitV3){
  reviveUnit=function(unit,pct){
    let caster=team().find(h=>h.skill==='补天造化' && h.hp>0);

    if(caster){
      caster.reviveUsed=Number(caster.reviveUsed||0);

      if(caster.reviveUsed>=3){
        if(typeof showNotice==='function')showNotice('女娲本场复活次数已用尽。',1800);
        return;
      }

      caster.reviveUsed+=1;
    }

    return tf_oldReviveUnitV3(unit,pct);
  };
}

/* 更新封神榜转数技能伤害 */
sealBookSkillRateFinal=function(item){
  let turn=0;
  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=Number(item&&item.turn||0);
  }

  if(turn>=7)return 0.16;
  if(turn>=6)return 0.14;
  if(turn>=5)return 0.12;
  if(turn>=4)return 0.10;
  if(turn>=3)return 0.08;
  if(turn>=2)return 0.07;
  if(turn>=1)return 0.06;
  return 0.04;
};

sealBookEnergyFinal=function(item){
  let turn=0;
  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=Number(item&&item.turn||0);
  }

  if(turn>=3)return 2;
  if(turn>=1)return 1;
  return 0;
};

if(typeof render==='function'){
  render();
}

/* =========================
   法宝详情确定数值显示 V4
   作用：
   1. 去掉“额外护盾”这种模糊文字
   2. 全部显示确定百分比
   3. 按当前转数显示当前实际效果
========================= */

function tf_turnMulTextV4(item){
  let turn=0;
  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=Number(item&&item.turn||0);
  }

  let arr=[1,1.25,1.45,1.70,1.95,2.20,2.45,2.70];
  return arr[Math.min(7,turn)] || 1;
}

function tf_pct2V4(v){
  return (Math.round(v*1000)/10).toFixed(1).replace('.0','')+'%';
}

function tf_rateV4(item,baseRate){
  return baseRate*tf_turnMulTextV4(item);
}

function tf_specialEffectTextV2(base,item){
  if(!base)return '';

  let name=base.name;

  function p(v){
    return tf_pct2V4(tf_rateV4(item,v));
  }

  if(name==='封神榜'){
    return '技能伤害 +'+tf_pct(tf_effectRate(item,base))+'；当前开局怒气 +'+tf_sealBookEnergy(item)+'（1转怒气+1，3转怒气+2）';
  }

  let map={
    /* UR */
    '混沌钟':'受到伤害降低 '+p(0.08)+'；开战获得自身最大气血 '+p(0.12)+' 的护盾。',
    '盘古幡':'技能伤害 +'+p(0.08)+'；攻击Boss时额外造成 '+p(0.12)+' 伤害。',
    '太极图':'受到伤害降低 '+p(0.07)+'；自身气血低于50%时，额外降低 '+p(0.08)+' 受到伤害。',
    '诛仙阵图':'技能伤害 +'+p(0.09)+'；攻击前排目标时额外造成 '+p(0.10)+' 伤害。',
    '造化玉碟':'治疗效果 +'+p(0.10)+'；回合开始时，为己方气血最低者恢复施法者攻击 '+p(0.60)+' 的气血。',
    '鸿蒙珠':'护盾效果 +'+p(0.10)+'；开战获得自身最大气血 '+p(0.15)+' 的护盾。',
    '弑神枪':'伤害吸血 '+p(0.08)+'；目标气血低于40%时，额外造成 '+p(0.12)+' 伤害。',
    '混沌青莲':'治疗效果 +'+p(0.12)+'；治疗气血低于50%的队友时，治疗量额外提高 '+p(0.15)+'。',
    '乾坤鼎':'护盾效果 +'+p(0.12)+'；自身有护盾时，受到伤害降低 '+p(0.08)+'。',
    '七宝妙树':'普攻伤害 +'+p(0.10)+'；普攻后30%概率降低目标攻击 '+p(0.10)+'，持续1回合。',
    '玄黄宝塔':'受到伤害降低 '+p(0.10)+'；开战获得自身最大气血 '+p(0.18)+' 的护盾。',
    '六魂幡':'技能伤害 +'+p(0.10)+'；攻击弱化/破防/控制目标时，额外造成 '+p(0.12)+' 伤害。',
    '十二品功德金莲':'治疗效果 +'+p(0.12)+'；治疗目标时，附加目标最大气血 '+p(0.08)+' 的护盾。',
    '十二品灭世黑莲':'伤害吸血 '+p(0.10)+'；击杀目标后恢复自身最大气血 '+p(0.12)+'。',

    /* SP */
    '玲珑宝塔':'护盾效果 +'+p(0.07)+'；自身有护盾时，受到伤害降低 '+p(0.05)+'。',
    '山河社稷图':'受到伤害降低 '+p(0.06)+'；站在前排时，额外降低 '+p(0.05)+' 受到伤害。',
    '河图洛书':'治疗效果 +'+p(0.07)+'；治疗最低气血目标时，治疗量额外提高 '+p(0.10)+'。',
    '十二品莲台':'治疗效果 +'+p(0.07)+'；治疗后给目标最大气血 '+p(0.05)+' 的护盾。',
    '业火红莲':'伤害吸血 '+p(0.06)+'；技能伤害也可触发吸血。',
    '玄元控水旗':'受到伤害降低 '+p(0.06)+'；受到群体伤害时，额外降低 '+p(0.05)+'。',
    '离地焰光旗':'技能伤害 +'+p(0.07)+'；攻击弱化目标时，额外造成 '+p(0.08)+' 伤害。',
    '青莲宝色旗':'护盾效果 +'+p(0.07)+'；开战获得自身最大气血 '+p(0.08)+' 的护盾。',
    '素色云界旗':'治疗效果 +'+p(0.07)+'；治疗后提升目标防御 '+p(0.10)+'，持续1回合。',
    '戊己杏黄旗':'受到伤害降低 '+p(0.07)+'；自身气血低于50%时，额外降低 '+p(0.06)+' 受到伤害。'
  };

  return map[name] || '';
}

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

/* =========================
   战斗中布阵：下一场生效 V6
   规则：
   1. 战斗中允许打开布阵
   2. 战斗中允许选择下场阵容
   3. 当前战斗不换人，不复活死人
   4. 战斗结束后自动应用下场阵容
========================= */

var bfNextTeamIdsV6 = null;
var bfFormationPreviewV6 = false;

function bf_noticeV6(text){
  if(typeof showNotice==='function'){
    showNotice(text,2200);
  }else{
    alert(text);
  }
}

function bf_inBattleV6(){
  return typeof combatLock!=='undefined' && combatLock;
}

function bf_getActiveTeamIdsV6(){
  if(bf_inBattleV6() && bfFormationPreviewV6 && Array.isArray(bfNextTeamIdsV6)){
    return bfNextTeamIdsV6;
  }

  return teamIds;
}

function bf_previewTeamV6(){
  let ids=bf_getActiveTeamIdsV6();
  return ids.map(id=>heroes.find(h=>h.id===id)).filter(Boolean);
}

function bf_renderFormationSlotCardV6(h){
  if(typeof cardHTML==='function'){
    return cardHTML(h,false);
  }
  return `<div class="card ${h?h.cls:'empty'}">${h?h.name:'空'}</div>`;
}

/* 覆盖布阵显示：战斗中显示“下场阵容” */
renderFormation=function(){
  formationGrid.innerHTML='';

  if(bf_inBattleV6()){
    bfFormationPreviewV6=true;
    if(!Array.isArray(bfNextTeamIdsV6)){
      bfNextTeamIdsV6=[...teamIds];
    }
  }

  ORDER.forEach(i=>{
    let ids=bf_getActiveTeamIdsV6();
    let h=heroes.find(x=>x.id===ids[i]);

    let div=document.createElement('div');
    div.className='formation-slot';
    div.dataset.index=i;
    div.innerHTML=`<div class="slot-index">${i+1}号位${bf_inBattleV6()?' · 下场':''}</div>${bf_renderFormationSlotCardV6(h)}`;
    div.onpointerdown=e=>startPress(e,i);
    formationGrid.appendChild(div);
  });
};

/* 覆盖打开布阵：战斗中也能打开，但提示下场生效 */
let bf_oldOpenFormationV6=typeof openFormation==='function'?openFormation:null;

openFormation=function(){
  if(bf_inBattleV6()){
    bfFormationPreviewV6=true;
    if(!Array.isArray(bfNextTeamIdsV6)){
      bfNextTeamIdsV6=[...teamIds];
    }
    bf_noticeV6('战斗中布阵：修改将在下一场生效。');
  }else{
    bfFormationPreviewV6=false;
    bfNextTeamIdsV6=null;
  }

  formationModal.classList.remove('hidden');
  renderFormation();
};

/* 覆盖选择伙伴弹窗：战斗中选择的是下场阵容 */
openChooseHero=function(i){
  replaceIndex=i;

  if(bf_inBattleV6()){
    bfFormationPreviewV6=true;
    if(!Array.isArray(bfNextTeamIdsV6)){
      bfNextTeamIdsV6=[...teamIds];
    }
  }

  renderChooseHero();
  lastChooseOpen=Date.now();

  setTimeout(()=>{
    chooseHeroModal.classList.remove('hidden');
    chooseTitle.innerText=(bf_inBattleV6()?'选择下场伙伴 · 第':'选择上阵伙伴 · 第')+(i+1)+'号位';
  },120);
};

/* 覆盖选择列表：战斗中按下场阵容判断“已选择” */
renderChooseHero=function(){
  let ids=bf_getActiveTeamIdsV6();

  let data=bag.filter(x=>!heroes.find(h=>h.id===x.id&&h.isMain));

  if(chooseFilter==='R')data=data.filter(x=>x.q==='R'||x.q==='N');
  else if(chooseFilter!=='ALL')data=data.filter(x=>x.q===chooseFilter);

  chooseHeroList.innerHTML=data.map(x=>{
    let used=ids.includes(x.id);

    return `<div class="choose-card ${qCls(x.q)} ${used?'inteam':''}" onclick="chooseHero('${x.id}')">
      <div class="qline"><span>${x.q}</span><span>${x.role}</span></div>
      <div class="cname">${x.name}</div>
      <div class="state">${used?'已选择':'下场上阵'}</div>
    </div>`;
  }).join('');
};

/* 覆盖选人：战斗中只改 bfNextTeamIdsV6，不改 teamIds */
chooseHero=function(id){
  if(Date.now()-lastChooseOpen<420)return;

  let ids=bf_inBattleV6() ? bfNextTeamIdsV6 : teamIds;

  if(!Array.isArray(ids)){
    ids=[...teamIds];
    bfNextTeamIdsV6=ids;
  }

  let oldHero=heroes.find(h=>h.id===ids[replaceIndex]);

  if(oldHero && oldHero.isMain){
    bf_noticeV6('主角不可下阵，只能拖拽调整站位。');
    return;
  }

  if(ids.includes(id)){
    bf_noticeV6('该伙伴已在阵容中。');
    return;
  }

  ids[replaceIndex]=id;

  if(bf_inBattleV6()){
    bfNextTeamIdsV6=ids;
    bf_noticeV6('已设置下场上阵，本场战斗不变。');
  }else{
    teamIds=ids;
    selectedHeroId=id;
  }

  closeChooseHero();
  renderFormation();
  render();
};

/* 覆盖拖拽结束：战斗中交换下场阵容，不影响当前战斗 */
let bf_oldPressEndV6=typeof pressEnd==='function'?pressEnd:null;

pressEnd=function(e){
  document.removeEventListener('pointermove',pressMove);

  if(!pressState)return;

  if(!pressState.moved){
    let i=pressState.i;
    let ids=bf_getActiveTeamIdsV6();
    let h=heroes.find(x=>x.id===ids[i]);

    if(h && h.isMain){
      bf_noticeV6('主角不可下阵，只能拖拽调整站位。');
      pressState=null;
      return;
    }

    pressState=null;
    openChooseHero(i);
    return;
  }

  let from=pressState.i;
  let el=document.elementFromPoint(e.clientX,e.clientY);
  let slot=el?el.closest('.formation-slot'):null;

  if(slot){
    let to=Number(slot.dataset.index);

    if(to!==from){
      if(bf_inBattleV6()){
        if(!Array.isArray(bfNextTeamIdsV6)){
          bfNextTeamIdsV6=[...teamIds];
        }

        let tmp=bfNextTeamIdsV6[from];
        bfNextTeamIdsV6[from]=bfNextTeamIdsV6[to];
        bfNextTeamIdsV6[to]=tmp;

        replaceIndex=to;
        bf_noticeV6(`已调整下场阵容：第${from+1}号位 ↔ 第${to+1}号位。`);
      }else{
        let tmp=teamIds[from];
        teamIds[from]=teamIds[to];
        teamIds[to]=tmp;

        replaceIndex=to;
        notice.innerText=`已拖拽交换第${from+1}号位和第${to+1}号位。`;
      }
    }
  }

  pressState=null;
  cleanupDrag();
  renderFormation();
  render();
};

/* 战斗结束后应用下一场阵容 */
function bf_applyNextTeamIfReadyV6(){
  if(bf_inBattleV6())return;

  if(Array.isArray(bfNextTeamIdsV6)){
    teamIds=[...bfNextTeamIdsV6];

    let first=team()[0];
    if(first)selectedHeroId=first.id;

    bfNextTeamIdsV6=null;
    bfFormationPreviewV6=false;

    bf_noticeV6('下场阵容已生效。');
  }
}

/* 让 render 顺手检查战斗结束 */
let bf_oldRenderV6=typeof render==='function'?render:null;

if(bf_oldRenderV6){
  render=function(){
    bf_oldRenderV6();

    if(!bf_inBattleV6()){
      bf_applyNextTeamIfReadyV6();
    }
  };
}

/* 关闭布阵时，如果正在战斗，只关闭界面，不影响当前战斗 */
closeFormation=function(){
  formationModal.classList.add('hidden');
  cleanupDrag();

  if(bf_inBattleV6()){
    bf_noticeV6('下场阵容已保存，当前战斗结束后生效。');
  }

  render();
};

if(typeof render==='function'){
  render();
}

/* =========================
   法宝战力合理化 V5
   作用：
   1. 法宝战力不再直接吃 basePower
   2. 改成：属性战力 + 灵效战力
   3. 低级法宝不再动不动几万、几十万
   4. 一级UR不再50万，压到约1万上下
   5. 装备属性仍然正常加到角色身上
========================= */

function tfpNumV5(v,def=0){
  let n=Number(v);
  return Number.isFinite(n)?n:def;
}

function tfpClampV5(v,min,max){
  v=tfpNumV5(v,min);
  if(v<min)return min;
  if(v>max)return max;
  return v;
}

function tfpLevelGrowV5(level){
  level=tfpClampV5(level,1,800);

  /*
    新属性成长：
    1级 = 1倍
    100级 ≈ 2.6倍
    200级 ≈ 4.6倍
    400级 ≈ 9.7倍
    600级 ≈ 17.2倍
    800级 ≈ 27倍

    不再使用 1.018 的指数爆炸。
  */
  let x=(level-1)/799;
  return 1 + (level-1)*0.010 + Math.pow(x,2.2)*18;
}

function tfpTurnGrowV5(item){
  let turn=0;

  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=tfpNumV5(item&&item.turn,0);
  }

  turn=tfpClampV5(turn,0,7);

  return 1 + turn*0.12;
}

function tfpMainStatV5(base){
  return base.mainStat || base.main || base.primaryStat || 'atk';
}

function tfpSubStatV5(base){
  let main=tfpMainStatV5(base);
  return base.subStat || base.sub || base.secondaryStat || (main==='hp'?'def':'hp');
}

function tfpBaseMainV5(base){
  if(!base)return 0;
  let stat=tfpMainStatV5(base);
  return tfpNumV5(
    base.baseMain ??
    base.baseMainValue ??
    base.mainBase ??
    base.mainValue ??
    base[stat],
    0
  );
}

function tfpBaseSubV5(base){
  if(!base)return 0;
  let stat=tfpSubStatV5(base);
  return tfpNumV5(
    base.baseSub ??
    base.baseSubValue ??
    base.subBase ??
    base.subValue ??
    base[stat],
    0
  );
}

/* 覆盖法宝属性计算 */
window.treasureStatValue=function(item,baseOrStat,maybeStat){
  if(!item)return 0;

  let base=null;
  let stat=null;

  if(typeof baseOrStat==='string' && maybeStat===undefined){
    stat=baseOrStat;
    base=typeof findTreasureBase==='function'?findTreasureBase(item.tid):null;
  }else{
    base=baseOrStat || (typeof findTreasureBase==='function'?findTreasureBase(item.tid):null);
    stat=maybeStat;
  }

  if(!base || !stat)return 0;

  let raw=0;
  let main=tfpMainStatV5(base);
  let sub=tfpSubStatV5(base);

  if(stat===main){
    raw=tfpBaseMainV5(base);
  }else if(stat===sub){
    raw=tfpBaseSubV5(base);
  }else{
    return 0;
  }

  let level=tfpNumV5(item.level,1);
  let value=raw * tfpLevelGrowV5(level) * tfpTurnGrowV5(item);

  return Math.max(0,Math.round(value));
};

window.treasureStatValueSafeV3=window.treasureStatValue;

/* 品质潜力：只作为灵效价值，不再硬塞几十万 */
function tfpQualityTargetV5(q){
  return {
    N:60000,
    R:180000,
    SR:600000,
    SSR:1800000,
    SP:4000000,
    UR:8000000
  }[q] || 60000;
}

function tfpQualityMulV5(q){
  return {
    N:.45,
    R:.65,
    SR:.9,
    SSR:1.25,
    SP:1.65,
    UR:2.1
  }[q] || .45;
}

function tfpEffectMulV5(base){
  if(!base)return 0;

  let e=base.effect || 'statOnly';

  if(e==='statOnly')return 0;
  if(e==='normalDmg')return .75;
  if(e==='skillDmg')return 1;
  if(e==='critBoost')return .75;
  if(e==='critDmg')return .85;
  if(e==='hitBoost')return .55;
  if(e==='dodgeBoost')return .75;
  if(e==='dmgReduce')return 1.15;
  if(e==='healBoost')return 1;
  if(e==='shieldBoost')return 1.05;
  if(e==='lifesteal')return 1.15;
  if(e==='sealBook')return 1.25;
  if(e==='startEnergy' || e==='startRage')return 1.3;

  return .8;
}

function tfpLevelRateV5(level){
  level=tfpClampV5(level,1,800);

  /*
    战力潜力成长：
    1级只拿极小一部分潜力
    800级才接近完整潜力
  */
  let x=(level-1)/799;
  return 0.0015 + Math.pow(x,1.65)*0.9985;
}

/* 覆盖法宝战力计算 */
window.treasurePower=function(item){
  if(!item)return 0;

  let base=typeof findTreasureBase==='function'?findTreasureBase(item.tid):null;
  if(!base)return 0;

  let q=base.quality || 'N';
  let level=tfpNumV5(item.level,1);

  let atk=window.treasureStatValue(item,base,'atk');
  let def=window.treasureStatValue(item,base,'def');
  let hp=window.treasureStatValue(item,base,'hp');

  /*
    属性战力：
    跟人物 heroPower 的基础口径接近，
    但不再按人物品质暴乘。
  */
  let statPower=(atk*0.65 + def*0.42 + hp*0.065) * tfpQualityMulV5(q);

  /*
    灵效战力：
    根据品质、等级、灵效类型给潜力。
    低级很低，满级才高。
  */
  let effectPower=tfpQualityTargetV5(q) * tfpLevelRateV5(level) * tfpEffectMulV5(base);

  /*
    封神榜特殊：
    开局怒气很强，但基础属性战力要压低。
  */
  if(base.name==='封神榜'){
    effectPower*=0.85;
    statPower*=0.55;
  }

  let total=statPower + effectPower;

  return Math.max(0,Math.round(total));
};

window.treasurePowerSafeV3=window.treasurePower;

/* 重新计算装备给角色的属性和战力 */
window.getHeroTreasureStats=function(h){
  let total={atk:0,def:0,hp:0,power:0};

  if(!h || typeof getHeroTreasureItems!=='function')return total;

  getHeroTreasureItems(h).forEach(item=>{
    total.atk+=window.treasureStatValue(item,'atk');
    total.def+=window.treasureStatValue(item,'def');
    total.hp+=window.treasureStatValue(item,'hp');
    total.power+=window.treasurePower(item);
  });

  total.atk=tfpNumV5(total.atk,0);
  total.def=tfpNumV5(total.def,0);
  total.hp=tfpNumV5(total.hp,0);
  total.power=tfpNumV5(total.power,0);

  return total;
};

window.getHeroTreasureStatsV3=window.getHeroTreasureStats;

/*
  总战力修正：
  角色属性已经吃了法宝属性，
  所以这里用“去掉法宝属性后的角色战力 + 法宝自身战力”。
  避免法宝属性被重复计算。
*/
window.power=function(arr){
  if(!Array.isArray(arr))return 0;

  return arr.reduce((sum,h)=>{
    if(!h)return sum;

    let t=window.getHeroTreasureStats(h);

    let fake=Object.assign({},h,{
      atk:Math.max(1,tfpNumV5(h.atk,1)-t.atk),
      def:Math.max(0,tfpNumV5(h.def,0)-t.def),
      maxHp:Math.max(1,tfpNumV5(h.maxHp,1)-t.hp)
    });

    let heroBasePower=typeof heroPower==='function'?heroPower(fake):0;

    return sum + heroBasePower + t.power;
  },0);
};

/* 法宝预览表也走新公式 */
window.showTreasurePowerPreviewTableFull=function(){
  if(typeof TREASURE_LIBRARY==='undefined'){
    alert('没有找到法宝数据。');
    return;
  }

  let levels=[1,100,200,400,600,800];
  let order=['UR','SP','SSR','SR','R','N'];
  let qName={
    UR:'混沌至宝',
    SP:'先天至宝',
    SSR:'先天灵宝',
    SR:'后天至宝',
    R:'后天灵宝',
    N:'普通法宝'
  };

  let text='【法宝战力预览表 · 新公式】\n';
  text+='等级：1 / 100 / 200 / 400 / 600 / 800\n\n';

  order.forEach(q=>{
    let arr=TREASURE_LIBRARY[q]||[];
    if(!arr.length)return;

    text+='【'+qName[q]+'】\n';

    arr.forEach(base=>{
      let nums=levels.map(lv=>{
        let fake={
          uid:'preview_'+base.id+'_'+lv,
          tid:base.id,
          level:lv,
          turn:typeof treasureTurnByLevel==='function'?treasureTurnByLevel(lv):0
        };

        return typeof formatPower==='function'?formatPower(window.treasurePower(fake)):window.treasurePower(fake);
      });

      text+=base.name+'：'+nums.join(' / ')+'\n';
    });

    text+='\n';
  });

  alert(text);
};

/* 重新刷新 */
if(typeof heroes!=='undefined' && typeof recalcHeroStats==='function'){
  heroes.forEach(h=>recalcHeroStats(h));
}

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

/* =========================
   法宝战力公式对齐英雄公式 V7
   重点：
   1. 不再用 atk*4 + def*2.2 + hp*0.08 这种新编公式
   2. 法宝属性战力直接调用原来的 heroPower() 算增量
   3. 灵效战力单独算
   4. 总战力 = 英雄本体战力 + 法宝属性增量 + 法宝灵效价值
========================= */

function tfpDummyHeroV7(atk,def,hp){
  return {
    id:'__treasure_dummy__',
    name:'法宝属性换算',
    q:'N',
    quality:'N',
    role:'战',
    level:1,
    lv:1,
    atk:Math.max(1,Number(atk)||1),
    def:Math.max(0,Number(def)||0),
    hp:Math.max(1,Number(hp)||1),
    maxHp:Math.max(1,Number(hp)||1),
    crit:0,
    critDmg:1.5,
    pierce:0,
    lifesteal:0,
    hit:1,
    dodge:0,
    treasureSlots:[]
  };
}

/* 用英雄公式计算：这些攻击/防御/气血到底值多少战力 */
function tfpAttrPowerByHeroFormulaV7(atk,def,hp){
  atk=Number(atk)||0;
  def=Number(def)||0;
  hp=Number(hp)||0;

  if(typeof heroPower!=='function'){
    return atk*4 + def*2 + hp*0.08;
  }

  let base=tfpDummyHeroV7(1,0,1);
  let withStat=tfpDummyHeroV7(1+atk,def,1+hp);

  let p1=Number(heroPower(base))||0;
  let p2=Number(heroPower(withStat))||0;

  return Math.max(0,Math.round(p2-p1));
}

/* 灵效战力：英雄公式算不了技能伤害/吸血/护盾，所以这里单独给价值 */
function tfpEffectTargetV7(q){
  return {
    N:0,
    R:20000,
    SR:80000,
    SSR:300000,
    SP:900000,
    UR:1800000
  }[q] || 0;
}

function tfpEffectWeightV7(base){
  if(!base)return 0;

  let e=base.effect || 'statOnly';

  if(e==='statOnly')return 0;
  if(e==='normalDmg')return 0.7;
  if(e==='skillDmg')return 1.0;
  if(e==='critBoost')return 0.5;
  if(e==='critDmg')return 0.6;
  if(e==='hitBoost')return 0.35;
  if(e==='dodgeBoost')return 0.55;
  if(e==='dmgReduce')return 1.1;
  if(e==='healBoost')return 0.9;
  if(e==='shieldBoost')return 1.0;
  if(e==='lifesteal')return 1.1;
  if(e==='sealBook')return 1.25;
  if(e==='startEnergy' || e==='startRage')return 1.25;

  return 0.7;
}

function tfpLevelRateV7(level){
  level=Number(level)||1;
  if(level<1)level=1;
  if(level>800)level=800;

  let x=(level-1)/799;

  /*
    1级灵效战力很低
    800级才吃满灵效价值
  */
  return 0.002 + Math.pow(x,1.7)*0.998;
}

function tfpTurnEffectMulV7(item){
  let turn=0;

  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=Number(item && item.turn || 0);
  }

  if(turn<0)turn=0;
  if(turn>7)turn=7;

  return 1 + turn*0.08;
}

/* 覆盖法宝战力：属性部分套英雄公式 */
window.treasurePower=function(item){
  if(!item)return 0;

  let base=null;

  if(typeof findTreasureBase==='function'){
    base=findTreasureBase(item.tid);
  }else if(typeof tf_findBase==='function'){
    base=tf_findBase(item.tid);
  }

  if(!base)return 0;

  let q=base.quality || 'N';
  let level=Number(item.level)||1;

  let atk=typeof treasureStatValue==='function' ? treasureStatValue(item,base,'atk') : 0;
  let def=typeof treasureStatValue==='function' ? treasureStatValue(item,base,'def') : 0;
  let hp=typeof treasureStatValue==='function' ? treasureStatValue(item,base,'hp') : 0;

  let attrPower=tfpAttrPowerByHeroFormulaV7(atk,def,hp);

  let effectPower=
    tfpEffectTargetV7(q) *
    tfpLevelRateV7(level) *
    tfpEffectWeightV7(base) *
    tfpTurnEffectMulV7(item);

  /*
    封神榜：基础属性价值降低，但怒气灵效价值保留
  */
  if(base.name==='封神榜'){
    attrPower*=0.45;
    effectPower*=1.15;
  }

  return Math.max(0,Math.round(attrPower + effectPower));
};

window.treasurePowerSafeV3=window.treasurePower;

/* 重新计算法宝总属性 */
window.getHeroTreasureStats=function(h){
  let total={atk:0,def:0,hp:0,power:0};

  if(!h || typeof getHeroTreasureItems!=='function')return total;

  getHeroTreasureItems(h).forEach(item=>{
    total.atk+=typeof treasureStatValue==='function' ? treasureStatValue(item,'atk') : 0;
    total.def+=typeof treasureStatValue==='function' ? treasureStatValue(item,'def') : 0;
    total.hp+=typeof treasureStatValue==='function' ? treasureStatValue(item,'hp') : 0;
    total.power+=window.treasurePower(item);
  });

  total.atk=Math.round(Number(total.atk)||0);
  total.def=Math.round(Number(total.def)||0);
  total.hp=Math.round(Number(total.hp)||0);
  total.power=Math.round(Number(total.power)||0);

  return total;
};

window.getHeroTreasureStatsV3=window.getHeroTreasureStats;

/*
  总战力：
  这里不再重复计算法宝属性。
  先减掉法宝属性，算英雄本体；
  再加法宝自己的战力。
*/
window.power=function(arr){
  if(!Array.isArray(arr))return 0;

  return arr.reduce((sum,h)=>{
    if(!h)return sum;

    let t=window.getHeroTreasureStats(h);

    let fake=Object.assign({},h,{
      atk:Math.max(1,(Number(h.atk)||1)-t.atk),
      def:Math.max(0,(Number(h.def)||0)-t.def),
      hp:Math.max(1,(Number(h.hp)||1)-t.hp),
      maxHp:Math.max(1,(Number(h.maxHp)||1)-t.hp)
    });

    let heroBasePower=typeof heroPower==='function' ? heroPower(fake) : 0;

    return sum + heroBasePower + t.power;
  },0);
};

/* 法宝预览表：显示新战力 */
window.showTreasurePowerPreviewTableFull=function(){
  if(typeof TREASURE_LIBRARY==='undefined'){
    alert('没有找到法宝数据。');
    return;
  }

  let levels=[1,100,200,400,600,800];
  let order=['UR','SP','SSR','SR','R','N'];
  let qName={
    UR:'混沌至宝',
    SP:'先天至宝',
    SSR:'先天灵宝',
    SR:'后天至宝',
    R:'后天灵宝',
    N:'普通法宝'
  };

  let text='【法宝战力预览表 · 对齐英雄公式V7】\n';
  text+='等级：1 / 100 / 200 / 400 / 600 / 800\n\n';

  order.forEach(q=>{
    let arr=TREASURE_LIBRARY[q]||[];
    if(!arr.length)return;

    text+='【'+qName[q]+'】\n';

    arr.forEach(base=>{
      let nums=levels.map(lv=>{
        let fake={
          uid:'preview_'+base.id+'_'+lv,
          tid:base.id,
          level:lv,
          turn:typeof treasureTurnByLevel==='function'?treasureTurnByLevel(lv):0
        };

        return typeof formatPower==='function'
          ? formatPower(window.treasurePower(fake))
          : window.treasurePower(fake);
      });

      text+=base.name+'：'+nums.join(' / ')+'\n';
    });

    text+='\n';
  });

  alert(text);
};

/* 刷新 */
if(typeof heroes!=='undefined' && typeof recalcHeroStats==='function'){
  heroes.forEach(h=>recalcHeroStats(h));
}

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

/* =========================
   法宝初始战力区间校准 V8
   目标：
   UR：1.0万 - 1.2万
   SP：6000 - 8000
   SSR：3000 - 4500
   SR：1500 - 2500
   R：800 - 1200
   N：400 - 600

   说明：
   1. 不改灵效
   2. 不改属性
   3. 只把法宝战力压到合理区间
   4. 鸿蒙珠、七宝妙树这种超标会被压回正常
========================= */

function tfpNumV8(v,def=0){
  let n=Number(v);
  return Number.isFinite(n)?n:def;
}

function tfpFindBaseV8(id){
  if(typeof findTreasureBase==='function')return findTreasureBase(id);
  if(typeof tf_findBase==='function')return tf_findBase(id);

  if(typeof TREASURE_LIBRARY==='undefined')return null;

  for(let q in TREASURE_LIBRARY){
    let hit=(TREASURE_LIBRARY[q]||[]).find(x=>x.id===id);
    if(hit)return hit;
  }

  return null;
}

function tfpNameSeedV8(name){
  name=String(name||'');
  let n=0;

  for(let i=0;i<name.length;i++){
    n=(n + name.charCodeAt(i)*(i+3)) % 997;
  }

  return n/997;
}

function tfpTargetLv1PowerV8(base){
  let q=(base&&base.quality)||'N';
  let seed=tfpNameSeedV8(base&&base.name);

  let range={
    UR:[10000,12000],
    SP:[6000,8000],
    SSR:[3000,4500],
    SR:[1500,2500],
    R:[800,1200],
    N:[400,600]
  }[q] || [400,600];

  let v=range[0] + (range[1]-range[0])*seed;

  /*
    特殊微调：
    封神榜有开局怒气潜力，但0转不加怒气，所以不让它超过普通UR太多。
    鸿蒙珠、七宝妙树之前明显超标，强制压到UR中位。
  */
  if(base && base.name==='封神榜')v=10800;
  if(base && base.name==='鸿蒙珠')v=10600;
  if(base && base.name==='七宝妙树')v=10700;

  return Math.round(v);
}

function tfpLevelGrowV8(level){
  level=tfpNumV8(level,1);
  if(level<1)level=1;
  if(level>800)level=800;

  let x=(level-1)/799;

  /*
    战力成长：
    1级 = 1倍
    100级 ≈ 3倍
    200级 ≈ 6倍
    400级 ≈ 16倍
    600级 ≈ 33倍
    800级 ≈ 60倍

    先别拉太爆，等Boss重新平衡后再扩大。
  */
  return 1 + (level-1)*0.035 + Math.pow(x,2.15)*31;
}

function tfpTurnGrowV8(item){
  let turn=0;

  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=tfpNumV8(item&&item.turn,0);
  }

  if(turn<0)turn=0;
  if(turn>7)turn=7;

  /*
    转数主要增强灵效，战力只小幅体现。
  */
  return 1 + turn*0.10;
}

/* 最终覆盖法宝战力 */
window.treasurePower=function(item){
  if(!item)return 0;

  let base=tfpFindBaseV8(item.tid);
  if(!base)return 0;

  let lv=tfpNumV8(item.level,1);
  let lv1=tfpTargetLv1PowerV8(base);
  let grow=tfpLevelGrowV8(lv);
  let turnGrow=tfpTurnGrowV8(item);

  return Math.max(0,Math.round(lv1*grow*turnGrow));
};

window.treasurePowerSafeV3=window.treasurePower;

/* 法宝给英雄的属性不变，只重新统计战力 */
window.getHeroTreasureStats=function(h){
  let total={atk:0,def:0,hp:0,power:0};

  if(!h || typeof getHeroTreasureItems!=='function')return total;

  getHeroTreasureItems(h).forEach(item=>{
    total.atk+=typeof treasureStatValue==='function' ? treasureStatValue(item,'atk') : 0;
    total.def+=typeof treasureStatValue==='function' ? treasureStatValue(item,'def') : 0;
    total.hp+=typeof treasureStatValue==='function' ? treasureStatValue(item,'hp') : 0;
    total.power+=window.treasurePower(item);
  });

  total.atk=Math.round(tfpNumV8(total.atk,0));
  total.def=Math.round(tfpNumV8(total.def,0));
  total.hp=Math.round(tfpNumV8(total.hp,0));
  total.power=Math.round(tfpNumV8(total.power,0));

  return total;
};

window.getHeroTreasureStatsV3=window.getHeroTreasureStats;

/*
  总战力：
  英雄本体战力 + 法宝自身战力
  避免法宝属性被重复算两次。
*/
window.power=function(arr){
  if(!Array.isArray(arr))return 0;

  return arr.reduce((sum,h)=>{
    if(!h)return sum;

    let t=window.getHeroTreasureStats(h);

    let fake=Object.assign({},h,{
      atk:Math.max(1,tfpNumV8(h.atk,1)-t.atk),
      def:Math.max(0,tfpNumV8(h.def,0)-t.def),
      hp:Math.max(1,tfpNumV8(h.hp||h.maxHp,1)-t.hp),
      maxHp:Math.max(1,tfpNumV8(h.maxHp,1)-t.hp)
    });

    let heroBasePower=typeof heroPower==='function' ? heroPower(fake) : 0;

    return sum + heroBasePower + t.power;
  },0);
};

/* 预览表走V8新战力 */
window.showTreasurePowerPreviewTableFull=function(){
  if(typeof TREASURE_LIBRARY==='undefined'){
    alert('没有找到法宝数据。');
    return;
  }

  let levels=[1,100,200,400,600,800];
  let order=['UR','SP','SSR','SR','R','N'];
  let qName={
    UR:'混沌至宝',
    SP:'先天至宝',
    SSR:'先天灵宝',
    SR:'后天至宝',
    R:'后天灵宝',
    N:'普通法宝'
  };

  let text='【法宝战力预览表 · V8校准版】\n';
  text+='等级：1 / 100 / 200 / 400 / 600 / 800\n\n';

  order.forEach(q=>{
    let arr=TREASURE_LIBRARY[q]||[];
    if(!arr.length)return;

    text+='【'+qName[q]+'】\n';

    arr.forEach(base=>{
      let nums=levels.map(lv=>{
        let fake={
          uid:'preview_'+base.id+'_'+lv,
          tid:base.id,
          level:lv,
          turn:typeof treasureTurnByLevel==='function'?treasureTurnByLevel(lv):0
        };

        return typeof formatPower==='function'
          ? formatPower(window.treasurePower(fake))
          : window.treasurePower(fake);
      });

      text+=base.name+'：'+nums.join(' / ')+'\n';
    });

    text+='\n';
  });

  alert(text);
};

/* 刷新 */
if(typeof heroes!=='undefined' && typeof recalcHeroStats==='function'){
  heroes.forEach(h=>recalcHeroStats(h));
}

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

/* =========================
   法宝成长曲线 V9
   目标：
   1. 保持1级战力合理
      UR：1.0万-1.2万
      SP：6000-8000
      SSR：3000-4500
      SR：1500-2500
      R：800-1200
      N：400-600

   2. 拉高800级终局战力
      UR 800级7转：约2300万-2800万
      四件顶级UR：约9200万-1.1亿

   3. 不改灵效
   4. 不改法宝属性显示
   5. 只改法宝战力成长
========================= */

function tfpNumV9(v,def=0){
  let n=Number(v);
  return Number.isFinite(n)?n:def;
}

function tfpFindBaseV9(id){
  if(typeof findTreasureBase==='function')return findTreasureBase(id);
  if(typeof tf_findBase==='function')return tf_findBase(id);

  if(typeof TREASURE_LIBRARY==='undefined')return null;

  for(let q in TREASURE_LIBRARY){
    let hit=(TREASURE_LIBRARY[q]||[]).find(x=>x.id===id);
    if(hit)return hit;
  }

  return null;
}

function tfpNameSeedV9(name){
  name=String(name||'');
  let n=0;

  for(let i=0;i<name.length;i++){
    n=(n + name.charCodeAt(i)*(i+3)) % 997;
  }

  return n/997;
}

/* 1级战力区间 */
function tfpTargetLv1PowerV9(base){
  let q=(base&&base.quality)||'N';
  let seed=tfpNameSeedV9(base&&base.name);

  let range={
    UR:[10000,12000],
    SP:[6000,8000],
    SSR:[3000,4500],
    SR:[1500,2500],
    R:[800,1200],
    N:[400,600]
  }[q] || [400,600];

  let v=range[0] + (range[1]-range[0])*seed;

  /* 特殊校准 */
  if(base && base.name==='封神榜')v=10800;
  if(base && base.name==='鸿蒙珠')v=10600;
  if(base && base.name==='七宝妙树')v=10700;

  return Math.round(v);
}

/* 每个品质的800级0转成长倍率 */
function tfpQualityEndGrowV9(q){
  return {
    UR:1350,
    SP:1000,
    SSR:780,
    SR:580,
    R:470,
    N:350
  }[q] || 350;
}

/* 等级成长：前期慢，后期快 */
function tfpLevelGrowV9(level,q){
  level=tfpNumV9(level,1);
  if(level<1)level=1;
  if(level>800)level=800;

  let end=tfpQualityEndGrowV9(q);

  /*
    这个曲线大概是：
    1级：1倍
    100级：约3%-4%终局
    200级：约8%-10%终局
    400级：约25%-30%终局
    600级：约55%-60%终局
    800级：100%终局

    也就是：
    前期不会爆炸，
    后期才真正拉开法宝差距。
  */
  let x=(level-1)/799;

  let slow=Math.pow(x,1.85);
  let grow=1 + (end-1)*slow;

  return grow;
}

/* 转数成长：主要体现灵效，但战力也要有价值 */
function tfpTurnGrowV9(item){
  let turn=0;

  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=tfpNumV9(item&&item.turn,0);
  }

  if(turn<0)turn=0;
  if(turn>7)turn=7;

  /*
    0转：1.00
    1转：1.10
    2转：1.20
    3转：1.30
    4转：1.40
    5转：1.50
    6转：1.60
    7转：1.70
  */
  return 1 + turn*0.10;
}

/* 最终覆盖法宝战力 */
window.treasurePower=function(item){
  if(!item)return 0;

  let base=tfpFindBaseV9(item.tid);
  if(!base)return 0;

  let q=base.quality || 'N';
  let lv=tfpNumV9(item.level,1);

  let lv1=tfpTargetLv1PowerV9(base);
  let levelGrow=tfpLevelGrowV9(lv,q);
  let turnGrow=tfpTurnGrowV9(item);

  return Math.max(0,Math.round(lv1*levelGrow*turnGrow));
};

window.treasurePowerSafeV3=window.treasurePower;

/* 法宝给英雄的属性不变，只重新统计战力 */
window.getHeroTreasureStats=function(h){
  let total={atk:0,def:0,hp:0,power:0};

  if(!h || typeof getHeroTreasureItems!=='function')return total;

  getHeroTreasureItems(h).forEach(item=>{
    total.atk+=typeof treasureStatValue==='function' ? treasureStatValue(item,'atk') : 0;
    total.def+=typeof treasureStatValue==='function' ? treasureStatValue(item,'def') : 0;
    total.hp+=typeof treasureStatValue==='function' ? treasureStatValue(item,'hp') : 0;
    total.power+=window.treasurePower(item);
  });

  total.atk=Math.round(tfpNumV9(total.atk,0));
  total.def=Math.round(tfpNumV9(total.def,0));
  total.hp=Math.round(tfpNumV9(total.hp,0));
  total.power=Math.round(tfpNumV9(total.power,0));

  return total;
};

window.getHeroTreasureStatsV3=window.getHeroTreasureStats;

/*
  总战力：
  英雄本体战力 + 法宝自身战力
  避免法宝属性被重复算两次。
*/
window.power=function(arr){
  if(!Array.isArray(arr))return 0;

  return arr.reduce((sum,h)=>{
    if(!h)return sum;

    let t=window.getHeroTreasureStats(h);

    let fake=Object.assign({},h,{
      atk:Math.max(1,tfpNumV9(h.atk,1)-t.atk),
      def:Math.max(0,tfpNumV9(h.def,0)-t.def),
      hp:Math.max(1,tfpNumV9(h.hp||h.maxHp,1)-t.hp),
      maxHp:Math.max(1,tfpNumV9(h.maxHp,1)-t.hp)
    });

    let heroBasePower=typeof heroPower==='function' ? heroPower(fake) : 0;

    return sum + heroBasePower + t.power;
  },0);
};

/* 预览表走V9 */
window.showTreasurePowerPreviewTableFull=function(){
  if(typeof TREASURE_LIBRARY==='undefined'){
    alert('没有找到法宝数据。');
    return;
  }

  let levels=[1,100,200,400,600,800];
  let order=['UR','SP','SSR','SR','R','N'];
  let qName={
    UR:'混沌至宝',
    SP:'先天至宝',
    SSR:'先天灵宝',
    SR:'后天至宝',
    R:'后天灵宝',
    N:'普通法宝'
  };

  let text='【法宝战力预览表 · V9成长版】\n';
  text+='等级：1 / 100 / 200 / 400 / 600 / 800\n';
  text+='说明：800级按当前转数规则计算，若800级自动7转，则为终局战力。\n\n';

  order.forEach(q=>{
    let arr=TREASURE_LIBRARY[q]||[];
    if(!arr.length)return;

    text+='【'+qName[q]+'】\n';

    arr.forEach(base=>{
      let nums=levels.map(lv=>{
        let fake={
          uid:'preview_'+base.id+'_'+lv,
          tid:base.id,
          level:lv,
          turn:typeof treasureTurnByLevel==='function'?treasureTurnByLevel(lv):0
        };

        return typeof formatPower==='function'
          ? formatPower(window.treasurePower(fake))
          : window.treasurePower(fake);
      });

      text+=base.name+'：'+nums.join(' / ')+'\n';
    });

    text+='\n';
  });

  alert(text);
};

/* 刷新 */
if(typeof heroes!=='undefined' && typeof recalcHeroStats==='function'){
  heroes.forEach(h=>recalcHeroStats(h));
}

if(typeof renderTreasureBag==='function'){
  renderTreasureBag();
}

if(typeof renderCodex==='function'){
  renderCodex();
}

if(typeof render==='function'){
  render();
}

})();