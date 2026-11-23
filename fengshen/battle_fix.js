/* ========================= battle_fix.js 正式整理版 V1 功能： 1. Boss / 小怪按固定关卡模板生成，不再按玩家当前战力暴涨 2. 小Boss固定出现在 30/60、130/160、230/260…… 3. 普通小怪无技能；小Boss使用当前区间大Boss青春版技能；大Boss使用正式技能 4. 女娲每场最多复活3次，优先复活阵亡队友中战力最高者 5. 战斗中布阵下一场生效，不会让死人换人复活 6. 战斗状态防 NaN 7. 我方和敌方卡牌显示血量百分比 ========================= */

(function () {
  /* ========== 基础工具 ========== */
  function bfNum(v, def = 0) {
    let n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  function bfClamp(v, min, max) {
    v = bfNum(v, min);
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function bfSleep(ms) {
    if (typeof sleep === "function") return sleep(ms);
    return new Promise((r) => setTimeout(r, ms));
  }

  function bfNotice(text, ms = 2200) {
    if (typeof showNotice === "function") showNotice(text, ms);
    else alert(text);
  }

  function bfHpPct(u){
  return '';
}

  function bfFormatPower(v) {
    if (typeof formatPower === "function") return formatPower(v);
    v = bfNum(v, 0);
    if (v >= 100000000) return (v / 100000000).toFixed(2) + "亿";
    if (v >= 10000) return (v / 10000).toFixed(1) + "万";
    return Math.round(v);
  }

  function bfInBattle() {
    return typeof combatLock !== "undefined" && combatLock;
  }

  /* ========== 血量百分比显示 ========== */
  function bfInjectHpStyle() {
    if (document.getElementById("bf_hp_percent_style")) return;

    let style = document.createElement("style");
    style.id = "bf_hp_percent_style";
    style.textContent = ` .hp-pct-bf{ position:absolute; left:3px; right:3px; bottom:8px; height:8px; line-height:8px; font-size:6px; color:#e8e8e8; text-align:center; pointer-events:none; text-shadow:0 0 3px #000,0 0 5px #000; z-index:2; } .battle .card .hp-line{margin-top:0;} .team .card .hp-pct-bf{bottom:6px;font-size:6px;} `;
    document.head.appendChild(style);
  }

  bfInjectHpStyle();

  cardHTML = function (h, sel = false) {
    if (!h) return "";
    return `<div class="card ${h.cls || qCls(h.quality)} ${ h.hp <= 0 ? "dead" : "" } ${sel ? "selected" : ""}" id="${h.id}" onclick="selectHero('${h.id}')"> <div class="card-head"><span>${ h.quality || "" }</span><span class="status-tags">${statusText(h)}</span><span>${ h.role || "" }</span></div> <div class="card-name">${h.shortName || h.name}</div> <div class="hp-line"><span style="width:${hpWidth(h)}%"></span></div> <div class="hp-pct-bf">${bfHpPct(h)}</div> <div class="energy">${energyText(h.energy || 0)}</div> </div>`;
  };

  enemyHTML = function (e) {
    if (!e) return "";
    let cls = e.type === "Boss" ? "boss" : "mon";
    return `<div class="card ${cls} ${e.hp <= 0 ? "dead" : ""}" id="${e.id}"> <div class="card-head"><span>邪</span><span class="status-tags">${statusText( e )}</span><span>${e.type}</span></div> <div class="card-name">${e.name}</div> <div class="hp-line"><span style="width:${hpWidth(e)}%"></span></div> <div class="hp-pct-bf">${bfHpPct(e)}</div> ${ e.type === "Boss" ? `<div class="energy">${energyText(e.energy || 0)}</div>` : "" } </div>`;
  };

  /* ========== Boss / 小怪模板 ========== */
  const BF_BIG_TEMPLATES = {
    100: {
      boss: { atk: 3500, def: 1200, hp: 300000 },
      mob: { atk: 1600, def: 600, hp: 80000 },
      lineup: ["BOSS", "R", "R", "R", "R", "R"],
      names: [
        "黄风大王",
        "黑沙魔兵",
        "混沌邪魔",
        "沙海妖卒",
        "黄沙鬼兵",
        "风窟邪灵",
      ],
    },
    200: {
      boss: { atk: 9000, def: 3200, hp: 900000 },
      mob: { atk: 4200, def: 1500, hp: 240000 },
      lineup: ["BOSS", "SR", "SR", "SR", "SR", "SR"],
      names: [
        "白骨夫人",
        "枯骨刀卫",
        "白骨妖兵",
        "摄魂妖卒",
        "荒坟鬼兵",
        "骨林邪灵",
      ],
    },
    300: {
      boss: { atk: 15000, def: 5200, hp: 1600000 },
      mob: { atk: 7200, def: 2600, hp: 420000 },
      lineup: ["BOSS", "SSR", "SSR", "SSR", "SSR", "SSR"],
      names: [
        "火焰牛魔",
        "火山妖将",
        "烈焰魔兵",
        "熔岩妖卒",
        "赤火鬼兵",
        "焚风邪灵",
      ],
    },
    400: {
      boss: { atk: 22000, def: 7600, hp: 2500000 },
      mob: { atk: 11000, def: 3900, hp: 800000 },
      lineup: ["SP", "SP", "SP", "SSR", "SSR", "SSR"],
      names: [
        "盘丝妖后",
        "蛛网妖卫",
        "毒蛛妖兵",
        "盘丝妖卒",
        "幻毒鬼兵",
        "妖丝邪灵",
      ],
    },
    500: {
      boss: { atk: 36000, def: 12000, hp: 4800000 },
      mob: { atk: 18000, def: 6500, hp: 1400000 },
      lineup: ["UR", "SP", "SP", "SP", "SP", "SP"],
      names: [
        "狮驼妖王",
        "狮驼先锋",
        "裂山妖兵",
        "吞风妖卒",
        "铁羽鬼兵",
        "金翅邪灵",
      ],
    },
    600: {
      boss: { atk: 52000, def: 17000, hp: 7200000 },
      mob: { atk: 26000, def: 9000, hp: 2200000 },
      lineup: ["UR", "UR", "SP", "SP", "SP", "SP"],
      names: [
        "血海冥王",
        "修罗血卫",
        "血海魔兵",
        "冥河妖卒",
        "血煞鬼兵",
        "业火邪灵",
      ],
    },
    700: {
      boss: { atk: 78000, def: 25000, hp: 11000000 },
      mob: { atk: 38000, def: 13000, hp: 3400000 },
      lineup: ["UR", "UR", "UR", "UR", "SP", "SP"],
      names: [
        "太古星君",
        "星辰守卫",
        "陨星魔兵",
        "星海妖卒",
        "天陨鬼兵",
        "星辉邪灵",
      ],
    },
    800: {
      boss: { atk: 110000, def: 36000, hp: 16000000 },
      mob: { atk: 52000, def: 18000, hp: 5200000 },
      lineup: ["UR", "UR", "UR", "UR", "UR", "SP"],
      names: [
        "原始天魔",
        "混沌魔卫",
        "天魔邪兵",
        "裂界妖卒",
        "灭世鬼兵",
        "虚空邪灵",
      ],
    },
  };

  function bfTargetTier(stage) {
    stage = Math.max(1, bfNum(stage, 1));
    let tier = Math.ceil(stage / 100) * 100;
    if (tier < 100) tier = 100;
    if (tier > 800) tier = 800;
    return tier;
  }

  function bfStagePos(stage) {
    stage = Math.max(1, bfNum(stage, 1));
    let pos = stage % 100;
    if (pos === 0) pos = 100;
    return pos;
  }

  function bfStageKind(stage) {
    let pos = bfStagePos(stage);
    if (pos === 100) return "BIG";
    if (pos === 30) return "SMALL1";
    if (pos === 60) return "SMALL2";
    return "NORMAL";
  }

  function bfKindName(kind) {
    if (kind === "BIG") return "大Boss";
    if (kind === "SMALL1") return "小Boss一";
    if (kind === "SMALL2") return "小Boss二";
    return "普通关";
  }

  function bfStageScale(stage) {
    let pos = bfStagePos(stage);
    let kind = bfStageKind(stage);

    if (kind === "BIG") return 1.0;
    if (kind === "SMALL1") return 0.45;
    if (kind === "SMALL2") return 0.65;

    /* 普通关无技能，随区间慢慢增强 */
    let x = (pos - 1) / 98;
    x = bfClamp(x, 0, 1);
    return 0.24 + x * 0.46;
  }

  function bfBossSkillProfile(tier, kind) {
    let small1 = kind === "SMALL1";
    let small2 = kind === "SMALL2";
    let big = kind === "BIG";

    if (tier === 100) {
      return {
        name: small1 ? "黄风试炼" : small2 ? "黄风压阵" : "黄风狂卷",
        frontRate: small1 ? 1.0 : small2 ? 1.25 : 1.6,
      };
    }

    if (tier === 200) {
      return {
        name: small1 ? "白骨裂甲" : small2 ? "白骨破甲" : "白骨摄魂",
        frontRate: small1 ? 1.2 : small2 ? 1.5 : 1.9,
        defDown: small1 ? 0.08 : small2 ? 0.1 : 0.15,
      };
    }

    if (tier === 300) {
      return {
        name: small1 ? "烈焰震击" : small2 ? "烈焰压阵" : "牛魔焚天",
        frontRate: small1 ? 1.45 : small2 ? 1.75 : 2.2,
        stun: small1 ? 0.1 : small2 ? 0.15 : 0.25,
        shield: small1 ? 0.05 : small2 ? 0.07 : 0.1,
      };
    }

    if (tier === 400) {
      return {
        name: small1 ? "盘丝破阵" : small2 ? "盘丝困阵" : "盘丝万缚",
        frontRate: small1 ? 1.6 : small2 ? 1.9 : 2.4,
        defDown: small1 ? 0.08 : small2 ? 0.1 : 0.15,
        shield: small1 ? 0.06 : small2 ? 0.08 : 0.12,
      };
    }

    if (tier === 500) {
      return {
        name: small1 ? "狮驼裂伤" : small2 ? "狮驼吞敌" : "狮驼灭阵",
        frontRate: small1 ? 1.8 : small2 ? 2.2 : 2.7,
        lowHp: 0.35,
        lowRate: small1 ? 0.35 : small2 ? 0.55 : 0.8,
      };
    }

    if (tier === 600) {
      return {
        name: small1 ? "血海护身" : small2 ? "血海压阵" : "血海魔躯",
        frontRate: small1 ? 1.9 : small2 ? 2.35 : 2.9,
        shield: small1 ? 0.08 : small2 ? 0.11 : 0.15,
      };
    }

    if (tier === 700) {
      return {
        name: small1 ? "星辰锁魂" : small2 ? "星辰封灵" : "太古封天",
        frontRate: small1 ? 2.1 : small2 ? 2.5 : 3.1,
        seal: small1 ? 0.08 : small2 ? 0.12 : 0.2,
      };
    }

    return {
      name: small1 ? "天魔裂界" : small2 ? "天魔封界" : "原始灭世",
      frontRate: small1 ? 2.3 : small2 ? 2.8 : 3.4,
      seal: small1 ? 0.1 : small2 ? 0.18 : 0.3,
      lowHp: 0.3,
      lowRate: small1 ? 0.4 : small2 ? 0.7 : 1.0,
    };
  }

  function bfScaleStats(stats, scale) {
    return {
      atk: Math.max(100, Math.round(stats.atk * scale)),
      def: Math.max(50, Math.round(stats.def * scale)),
      hp: Math.max(1000, Math.round(stats.hp * scale)),
    };
  }

  function bfMakeEnemy(id, type, name, stats, skillProfile) {
    return {
      id,
      type,
      name,
      atk: stats.atk,
      baseAtk: stats.atk,
      def: stats.def,
      hp: stats.hp,
      maxHp: stats.hp,
      shield: 0,
      stun: 0,
      freeze: 0,
      charm: 0,
      seal: 0,
      weak: 0,
      weakPct: 0,
      defDown: 0,
      defDownPct: 0,
      atkUp: 0,
      atkUpPct: 0,
      defUp: 0,
      defUpPct: 0,
      energy: skillProfile ? 2 : 0,
      alive: true,
      skill: skillProfile ? skillProfile.name : "",
      skillText: skillProfile ? "Boss技能" : "",
      bossSkill: skillProfile || null,
    };
  }

  function bfMobStatsForSlot(template, lineupToken, idx) {
    /* 多UR/SP区间用boss模板给UR位，用mob模板给SP/SSR位 */
    if (lineupToken === "UR") return template.boss;
    if (lineupToken === "SP") return template.mob;
    if (lineupToken === "SSR") return template.mob;
    if (lineupToken === "BOSS") return template.boss;
    return template.mob;
  }

  resetEnemies = function () {
    let stage = bfNum(currentStage, 1);
    let tier = bfTargetTier(stage);
    let kind = bfStageKind(stage);
    let scale = bfStageScale(stage);
    let template = BF_BIG_TEMPLATES[tier] || BF_BIG_TEMPLATES[100];
    let names = template.names;
    let isBossFight = kind === "BIG" || kind === "SMALL1" || kind === "SMALL2";
    let skillProfile = isBossFight ? bfBossSkillProfile(tier, kind) : null;

    if (typeof skillTestMode !== "undefined" && skillTestMode) {
      /* 测试模式稍微厚一点，但不再离谱 */
      tier = 300;
      kind = "BIG";
      scale = 0.75;
      template = BF_BIG_TEMPLATES[300];
      names = [
        "测试魔尊",
        "测试护卫甲",
        "测试护卫乙",
        "测试妖将甲",
        "测试妖将乙",
        "测试妖将丙",
      ];
      skillProfile = bfBossSkillProfile(300, "BIG");
      isBossFight = true;
    }

    let lineup = template.lineup || ["BOSS", "MOB", "MOB", "MOB", "MOB", "MOB"];

    enemies = lineup.map((token, idx) => {
      let baseStats =
        idx === 0 ? template.boss : bfMobStatsForSlot(template, token, idx);
      let s = bfScaleStats(baseStats, scale);
      let type = idx === 0 && isBossFight ? "Boss" : "怪";
      let skill = idx === 0 && isBossFight ? skillProfile : null;
      let e = bfMakeEnemy(
        "e" + (idx + 1),
        type,
        names[idx] || "妖兵" + idx,
        s,
        skill
      );

      if (idx === 0 && kind === "BIG") e.shield = Math.round(e.maxHp * 0.08);
      if (idx === 0 && kind === "SMALL2") e.shield = Math.round(e.maxHp * 0.04);

      return e;
    });
  };

  enemyPower = function (arr) {
    return (arr || []).reduce((s, x) => {
      if (!x) return s;
      return s + x.atk * 120 + x.def * 80 + x.maxHp * 8 + (x.shield || 0) * 4;
    }, 0);
  };

  /* ========== Boss技能实战 ========== */
  function bfBattleAtk(actor) {
    if (typeof battleAtk === "function") return battleAtk(actor);
    return actor ? bfNum(actor.atk || actor.baseAtk, 1) : 1;
  }

  function bfSkillDamage(a, target, rate, minRate = 0.12) {
    if (typeof calcSkillDamage === "function")
      return calcSkillDamage(a, target, rate, minRate);
    let atk = bfBattleAtk(a);
    let def = target ? bfNum(target.def, 0) : 0;
    return Math.max(Math.round(atk * rate - def), Math.round(atk * minRate));
  }

  function bfFrontTargets(side) {
    let targets =
      side === "e" ? (typeof team === "function" ? team() : []) : enemies;
    if (typeof frontAliveTargets === "function")
      return frontAliveTargets(targets);
    let front = targets.slice(0, 3).filter((x) => x && x.hp > 0);
    return front.length ? front : targets.filter((x) => x && x.hp > 0);
  }

  function bfAddDefDown(target, pct) {
    if (!target || target.hp <= 0) return;
    if (typeof addDefDown === "function") addDefDown(target, 1, pct);
    else {
      target.defDown = Math.max(target.defDown || 0, 1);
      target.defDownPct = Math.max(target.defDownPct || 0, pct);
    }
  }

  function bfAddStun(target) {
    if (!target || target.hp <= 0) return;
    if (typeof addStun === "function") addStun(target, 1);
    else target.stun = Math.max(target.stun || 0, 1);
  }

  function bfAddSeal(target) {
    if (!target || target.hp <= 0) return;
    if (typeof addSeal === "function") addSeal(target, 1);
    else target.seal = Math.max(target.seal || 0, 1);
  }

  let bfOldPerformSkillEffect =
    typeof performSkillEffect === "function" ? performSkillEffect : null;

  if (bfOldPerformSkillEffect) {
    performSkillEffect = async function (a, t, side) {
      if (a && a.bossSkill) {
        let rule = a.bossSkill;
        let targets = bfFrontTargets(side);

        if (typeof center === "function") center(rule.name, true);
        await bfSleep(120);

        targets.forEach((x) => {
          let dmg = bfSkillDamage(a, x, rule.frontRate, 0.12);
          let real =
            typeof applyDamage === "function" ? applyDamage(x, dmg) : 0;
          if (real > 0 && typeof floatDmg === "function") floatDmg(x.id, real);
          if (typeof anim === "function") anim(x.id, "hit");

          if (rule.defDown && Math.random() < 1) bfAddDefDown(x, rule.defDown);
          if (rule.stun && Math.random() < rule.stun) bfAddStun(x);
          if (rule.seal && Math.random() < rule.seal) bfAddSeal(x);

          if (
            rule.lowHp &&
            x.hp > 0 &&
            x.hp / x.maxHp < rule.lowHp &&
            rule.lowRate
          ) {
            let extra = bfSkillDamage(a, x, rule.lowRate, 0.08);
            let real2 =
              typeof applyDamage === "function" ? applyDamage(x, extra) : 0;
            if (real2 > 0 && typeof floatDmg === "function")
              floatDmg(x.id, real2);
            if (typeof anim === "function") anim(x.id, "hit");
          }
        });

        if (rule.shield && typeof addShield === "function") {
          addShield(a, Math.round(a.maxHp * rule.shield));
        }

        if (typeof render === "function") render();
        await bfSleep(650);
        return;
      }

      return await bfOldPerformSkillEffect(a, t, side);
    };
  }

  /* ========== 女娲复活正式规则 ========== */
  function bfResetNuwaRevive() {
    window.__nuwaReviveCount = 0;
  }

  function bfNuwaCount() {
    return Number(window.__nuwaReviveCount || 0);
  }

  function bfAddNuwaCount() {
    window.__nuwaReviveCount = bfNuwaCount() + 1;
  }

  function bfDeadBestAlly() {
    if (typeof team !== "function") return null;
    let arr = team().filter((h) => h && h.hp <= 0 && !h.isMain);
    if (!arr.length) return null;
    arr.sort((a, b) => {
      let pa = typeof heroPower === "function" ? heroPower(a) : 0;
      let pb = typeof heroPower === "function" ? heroPower(b) : 0;
      return pb - pa;
    });
    return arr[0];
  }

  function bfReviveOne(target, pct) {
    if (!target || target.hp > 0) return false;
    target.hp = Math.max(1, Math.round(target.maxHp * pct));
    target.shield = 0;
    target.stun = 0;
    target.freeze = 0;
    target.charm = 0;
    target.seal = 0;
    target.weak = 0;
    target.weakPct = 0;
    target.defDown = 0;
    target.defDownPct = 0;
    target.atkUp = 0;
    target.atkUpPct = 0;
    target.defUp = 0;
    target.defUpPct = 0;
    target.energy = 2;
    return target.hp > 0;
  }

  function bfHealAllAlive(caster, rate) {
    if (!caster || typeof team !== "function") return;
    let amount = Math.round(bfBattleAtk(caster) * rate);
    team().forEach((h) => {
      if (h && h.hp > 0) {
        if (typeof healUnit === "function") healUnit(h, amount);
        else h.hp = Math.min(h.maxHp, h.hp + amount);
      }
    });
  }

  let bfNuwaOldPerform = performSkillEffect;
  performSkillEffect = async function (a, t, side) {
    if (a && a.skill === "补天造化") {
      let title = document.getElementById("battleTitle");

      if (bfNuwaCount() < 3) {
        let dead = bfDeadBestAlly();
        if (dead) {
          if (typeof center === "function") center("复活", true);
          await bfSleep(200);
          let ok = bfReviveOne(dead, 0.45);
          if (ok) {
            bfAddNuwaCount();
            if (typeof floatHeal === "function") floatHeal(dead.id, dead.hp);
            if (title)
              title.innerText =
                dead.name + " 已复活（" + bfNuwaCount() + "/3）";
          }
        }
      } else {
        if (title) title.innerText = "女娲本场复活次数已用尽";
        if (typeof center === "function") center("复活已尽", true);
        await bfSleep(200);
      }

      bfHealAllAlive(a, 2.2);
      if (typeof render === "function") render();
      await bfSleep(800);
      return;
    }
    return await bfNuwaOldPerform(a, t, side);
  };

  if (typeof SKILL_SHOW_TEXT !== "undefined") {
    SKILL_SHOW_TEXT["补天造化"] =
      "女娲引动造化神力，优先复活己方阵亡队友中战力最高者并恢复45%气血；每场战斗最多复活3次；同时为全队恢复自身攻击220%的气血。";
  }

  /* ========== 战斗状态稳定器 ========== */
  function bfAllUnits() {
    let arr = [];
    if (typeof heroes !== "undefined") heroes.forEach((h) => arr.push(h));
    if (typeof enemies !== "undefined") enemies.forEach((e) => arr.push(e));
    return arr.filter(Boolean);
  }

  function bfFixUnit(u) {
    if (!u) return;
    u.maxHp = Math.max(1, bfNum(u.maxHp, 1));
    u.hp = bfClamp(u.hp, 0, u.maxHp);
    u.shield = Math.max(0, Math.round(bfNum(u.shield, 0)));
    u.energy = bfClamp(u.energy, 0, 4);

    [
      "stun",
      "freeze",
      "charm",
      "seal",
      "weak",
      "defDown",
      "atkUp",
      "defUp",
    ].forEach((k) => {
      u[k] = Math.max(0, Math.round(bfNum(u[k], 0)));
    });

    if (u.hp <= 0) {
      u.hp = 0;
      u.shield = 0;
      u.energy = 0;
      u.stun = 0;
      u.freeze = 0;
      u.charm = 0;
      u.seal = 0;
      u.weak = 0;
      u.defDown = 0;
      u.atkUp = 0;
      u.defUp = 0;
    }
  }

  function bfFixAll() {
    bfAllUnits().forEach(bfFixUnit);
  }

  let bfOldApplyDamage = typeof applyDamage === "function" ? applyDamage : null;
  if (bfOldApplyDamage) {
    applyDamage = function (target, dmg) {
      dmg = Math.max(1, Math.round(bfNum(dmg, 1)));
      let real = bfOldApplyDamage(target, dmg);
      bfFixUnit(target);
      return real;
    };
  }

  let bfOldHealUnit = typeof healUnit === "function" ? healUnit : null;
  if (bfOldHealUnit) {
    healUnit = function (target, amount) {
      amount = Math.max(0, Math.round(bfNum(amount, 0)));
      let real = bfOldHealUnit(target, amount);
      bfFixUnit(target);
      return real;
    };
  }

  let bfOldAddShield = typeof addShield === "function" ? addShield : null;
  if (bfOldAddShield) {
    addShield = function (target, amount) {
      amount = Math.max(0, Math.round(bfNum(amount, 0)));
      let res = bfOldAddShield(target, amount);
      bfFixUnit(target);
      return res;
    };
  }

  /* ========== 战斗中布阵：下一场生效 ========== */
  var bfNextTeamIds = null;
  var bfFormationPreview = false;

  function bfActiveTeamIds() {
    if (bfInBattle() && bfFormationPreview && Array.isArray(bfNextTeamIds))
      return bfNextTeamIds;
    return teamIds;
  }

  function bfSlotCard(h) {
    if (typeof cardHTML === "function" && h) return cardHTML(h, false);
    return `<div class="card ${h ? h.cls : "empty"}">${ h ? h.name : "空" }</div>`;
  }

  renderFormation = function () {
    formationGrid.innerHTML = "";

    if (bfInBattle()) {
      bfFormationPreview = true;
      if (!Array.isArray(bfNextTeamIds)) bfNextTeamIds = [...teamIds];
    }

    ORDER.forEach((i) => {
      let ids = bfActiveTeamIds();
      let h = heroes.find((x) => x.id === ids[i]);
      let div = document.createElement("div");
      div.className = "formation-slot";
      div.dataset.index = i;
      div.innerHTML = `<div class="slot-index">${i + 1}号位${ bfInBattle() ? " · 下场" : "" }</div>${bfSlotCard(h)}`;
      div.onpointerdown = (e) => startPress(e, i);
      formationGrid.appendChild(div);
    });
  };

  openFormation = function () {
    if (bfInBattle()) {
      bfFormationPreview = true;
      if (!Array.isArray(bfNextTeamIds)) bfNextTeamIds = [...teamIds];
      bfNotice("战斗中布阵：修改将在下一场生效。");
    } else {
      bfFormationPreview = false;
      bfNextTeamIds = null;
    }
    formationModal.classList.remove("hidden");
    renderFormation();
  };

  openChooseHero = function (i) {
    replaceIndex = i;
    if (bfInBattle()) {
      bfFormationPreview = true;
      if (!Array.isArray(bfNextTeamIds)) bfNextTeamIds = [...teamIds];
    }
    renderChooseHero();
    lastChooseOpen = Date.now();
    setTimeout(() => {
      chooseHeroModal.classList.remove("hidden");
      chooseTitle.innerText =
        (bfInBattle() ? "选择下场伙伴 · 第" : "选择上阵伙伴 · 第") +
        (i + 1) +
        "号位";
    }, 120);
  };

  renderChooseHero = function () {
    let ids = bfActiveTeamIds();
    let data = bag.filter(
      (x) => !heroes.find((h) => h.id === x.id && h.isMain)
    );
    if (chooseFilter === "R")
      data = data.filter((x) => x.q === "R" || x.q === "N");
    else if (chooseFilter !== "ALL")
      data = data.filter((x) => x.q === chooseFilter);

    chooseHeroList.innerHTML = data
      .map((x) => {
        let used = ids.includes(x.id);
        return `<div class="choose-card ${qCls(x.q)} ${ used ? "inteam" : "" }" onclick="chooseHero('${x.id}')"> <div class="qline"><span>${x.q}</span><span>${x.role}</span></div> <div class="cname">${x.name}</div> <div class="state">${used ? "已选择" : "下场上阵"}</div> </div>`;
      })
      .join("");
  };

  chooseHero = function (id) {
    if (Date.now() - lastChooseOpen < 420) return;
    let ids = bfInBattle() ? bfNextTeamIds : teamIds;
    if (!Array.isArray(ids)) {
      ids = [...teamIds];
      bfNextTeamIds = ids;
    }
    let oldHero = heroes.find((h) => h.id === ids[replaceIndex]);
    if (oldHero && oldHero.isMain) {
      bfNotice("主角不可下阵，只能拖拽调整站位。");
      return;
    }
    if (ids.includes(id)) {
      bfNotice("该伙伴已在阵容中。");
      return;
    }
    ids[replaceIndex] = id;
    if (bfInBattle()) {
      bfNextTeamIds = ids;
      bfNotice("已设置下场上阵，本场战斗不变。");
    } else {
      teamIds = ids;
      selectedHeroId = id;
    }
    closeChooseHero();
    renderFormation();
    render();
  };

  let bfOldPressEnd = typeof pressEnd === "function" ? pressEnd : null;
  if (bfOldPressEnd) {
    pressEnd = function (e) {
      document.removeEventListener("pointermove", pressMove);
      if (!pressState) return;

      if (!pressState.moved) {
        let i = pressState.i;
        let ids = bfActiveTeamIds();
        let h = heroes.find((x) => x.id === ids[i]);
        if (h && h.isMain) {
          bfNotice("主角不可下阵，只能拖拽调整站位。");
          pressState = null;
          return;
        }
        pressState = null;
        openChooseHero(i);
        return;
      }

      let from = pressState.i;
      let el = document.elementFromPoint(e.clientX, e.clientY);
      let slot = el ? el.closest(".formation-slot") : null;
      if (slot) {
        let to = Number(slot.dataset.index);
        if (to !== from) {
          if (bfInBattle()) {
            if (!Array.isArray(bfNextTeamIds)) bfNextTeamIds = [...teamIds];
            let tmp = bfNextTeamIds[from];
            bfNextTeamIds[from] = bfNextTeamIds[to];
            bfNextTeamIds[to] = tmp;
            bfNotice(`已调整下场阵容：第${from + 1}号位 ↔ 第${to + 1}号位。`);
          } else {
            let tmp = teamIds[from];
            teamIds[from] = teamIds[to];
            teamIds[to] = tmp;
            notice.innerText = `已拖拽交换第${from + 1}号位和第${to + 1}号位。`;
          }
        }
      }
      pressState = null;
      cleanupDrag();
      renderFormation();
      render();
    };
  }

  function bfApplyNextTeam() {
    if (bfInBattle()) return;
    if (Array.isArray(bfNextTeamIds)) {
      teamIds = [...bfNextTeamIds];
      let first = team()[0];
      if (first) selectedHeroId = first.id;
      bfNextTeamIds = null;
      bfFormationPreview = false;
      bfNotice("下场阵容已生效。");
    }
  }

  closeFormation = function () {
    formationModal.classList.add("hidden");
    cleanupDrag();
    if (bfInBattle()) bfNotice("下场阵容已保存，当前战斗结束后生效。");
    render();
  };

  /* ========== 开战 / 渲染收口 ========== */
  let bfOldChallengeBoss =
    typeof challengeBoss === "function" ? challengeBoss : null;
  if (bfOldChallengeBoss) {
    challengeBoss = async function () {
      bfResetNuwaRevive();
      if (typeof heroes !== "undefined") {
        heroes.forEach((h) => {
          h.reviveUsed = 0;
          h.teamReviveUsed = 0;
          h._treasureStartShieldDone = false;
          h._battleStartDone = false;
        });
      }

      let stage = bfNum(currentStage, 1);
      let kind = bfStageKind(stage);
      let tier = bfTargetTier(stage);
      let title = document.getElementById("battleTitle");
      if (title)
        title.innerText =
          "第" + stage + "关 · " + bfKindName(kind) + "（目标" + tier + "关）";

      await bfOldChallengeBoss();

      if (!bfInBattle() && !skillTestMode && !bossPending) {
        bossPending = true;
        bfNotice("已进入第" + currentStage + "关，可继续挑战下一场。", 2200);
        if (typeof render === "function") render();
      }
    };
  }

  let bfOldRender = typeof render === "function" ? render : null;
  if (bfOldRender) {
    render = function () {
      bfFixAll();
      bfOldRender();
      if (!bfInBattle()) bfApplyNextTeam();
    };
  }

  /* ========== 测试查看敌人数据 ========== */
  window.bfShowEnemyInfo = function () {
    resetEnemies();
    let stage = bfNum(currentStage, 1);
    let tier = bfTargetTier(stage);
    let kind = bfStageKind(stage);
    let text =
      "【第" +
      stage +
      "关 · " +
      bfKindName(kind) +
      " · 目标" +
      tier +
      "关模板】\n\n";
    enemies.forEach((e) => {
      text +=
        e.name +
        "：" +
        e.type +
        "｜攻" +
        e.atk +
        " 防" +
        e.def +
        " 血" +
        e.maxHp +
        " HP " +
        bfHpPct(e);
      if (e.bossSkill) text += "｜技能：" + e.bossSkill.name;
      if (e.shield > 0) text += "｜护盾" + e.shield;
      text += "\n";
    });
    text += "\n敌方总战力：" + bfFormatPower(enemyPower(enemies));
    alert(text);
  };

  resetEnemies();
  if (typeof render === "function") render();
/* =========================
   测试资源补丁
   作用：
   给测试用修为、灵石、元宝、突破石
========================= */

function bfAddTestResources(){
  if(typeof cult!=='undefined'){
    cult += 50000000;
  }

  if(typeof gold!=='undefined'){
    gold += 5000000;
  }

  if(typeof spiritStone!=='undefined'){
    spiritStone += 500000000;
  }else{
    window.spiritStone = 500000000;
  }

  if(typeof treasureBreakStone!=='undefined'){
    treasureBreakStone += 9999;
  }else{
    window.treasureBreakStone = 9999;
  }

  if(typeof refreshTopResourceFinal==='function'){
    refreshTopResourceFinal();
  }

  if(typeof render==='function'){
    render();
  }

  if(typeof showNotice==='function'){
    showNotice('测试资源已发放：修为+5000万，灵石+5亿，元宝+500万，突破石+9999。',3000);
  }
}

/* 每次刷新游戏自动给一次测试资源 */
bfAddTestResources();

/* =========================
   法宝战力 V10：属性 + 灵效分离计算
   目标：
   1. 1级战力仍然控制在：
      UR：1.0万-1.2万
      SP：6000-8000
      SSR：3000-4500
      SR：1500-2500
      R：800-1200
      N：400-600

   2. 800级7转：
      UR：约2300万-3200万
      SP：约1000万-1600万
      SSR：约350万-700万
      SR：约120万-250万
      R：约50万-120万
      N：约20万-50万

   3. 战力拆成：
      基础等级战力 + 灵效战力
   4. 转数主要加强灵效战力
   5. 不改法宝属性
   6. 不改法宝实战灵效
========================= */

function tfpNumV10(v,def=0){
  let n=Number(v);
  return Number.isFinite(n)?n:def;
}

function tfpClampV10(v,min,max){
  v=tfpNumV10(v,min);
  if(v<min)return min;
  if(v>max)return max;
  return v;
}

function tfpFindBaseV10(id){
  if(typeof findTreasureBase==='function')return findTreasureBase(id);
  if(typeof tf_findBase==='function')return tf_findBase(id);

  if(typeof TREASURE_LIBRARY==='undefined')return null;

  for(let q in TREASURE_LIBRARY){
    let hit=(TREASURE_LIBRARY[q]||[]).find(x=>x.id===id);
    if(hit)return hit;
  }

  return null;
}

/* 用名字做稳定小差异，避免同品质完全一样 */
function tfpNameSeedV10(name){
  name=String(name||'');
  let n=0;

  for(let i=0;i<name.length;i++){
    n=(n + name.charCodeAt(i)*(i+5)) % 997;
  }

  return n/997;
}

/* 1级战力区间 */
function tfpLv1PowerV10(base){
  let q=(base&&base.quality)||'N';
  let seed=tfpNameSeedV10(base&&base.name);

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
    少数法宝固定到安全位置，防止名字seed把它们顶太高
  */
  if(base && base.name==='封神榜')v=10800;
  if(base && base.name==='鸿蒙珠')v=10600;
  if(base && base.name==='七宝妙树')v=10700;

  return Math.round(v);
}

/*
  基础等级战力终局倍率：
  这部分代表“等级带来的基础价值”
  不含灵效强弱。
*/
function tfpBaseEndMulV10(q){
  return {
    UR:1050,
    SP:620,
    SSR:360,
    SR:240,
    R:170,
    N:120
  }[q] || 120;
}

/*
  灵效终局倍率：
  这部分专门给技能伤害、减伤、吸血、护盾、开局怒气这些东西算战力。
*/
function tfpEffectEndMulV10(q){
  return {
    UR:500,
    SP:260,
    SSR:120,
    SR:35,
    R:15,
    N:0
  }[q] || 0;
}

function tfpLevelProgressV10(level){
  level=tfpClampV10(level,1,800);
  return (level-1)/799;
}

/* 基础等级成长：前期慢，后期快 */
function tfpBaseGrowV10(level,q){
  let x=tfpLevelProgressV10(level);
  let end=tfpBaseEndMulV10(q);

  return 1 + (end-1)*Math.pow(x,1.85);
}

/* 灵效成长：灵效也随等级解锁价值 */
function tfpEffectLevelGrowV10(level,q){
  let x=tfpLevelProgressV10(level);
  let end=tfpEffectEndMulV10(q);

  return end*Math.pow(x,1.75);
}

/* 转数对灵效的倍率：主加灵效 */
function tfpEffectTurnMulV10(item){
  let turn=0;

  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=tfpNumV10(item&&item.turn,0);
  }

  turn=tfpClampV10(turn,0,7);

  /*
    0转：1.00
    1转：1.25
    2转：1.45
    3转：1.70
    4转：1.95
    5转：2.20
    6转：2.45
    7转：2.70
  */
  return [1,1.25,1.45,1.70,1.95,2.20,2.45,2.70][turn] || 1;
}

/* 转数对基础战力只小幅体现 */
function tfpBaseTurnMulV10(item){
  let turn=0;

  if(typeof treasureRealTurn==='function'){
    turn=treasureRealTurn(item);
  }else{
    turn=tfpNumV10(item&&item.turn,0);
  }

  turn=tfpClampV10(turn,0,7);

  return 1 + turn*0.03;
}

/* 不同灵效价值不同 */
function tfpEffectWeightV10(base,item){
  if(!base)return 0;

  let e=base.effect || 'statOnly';
  let name=base.name || '';

  if(e==='statOnly')return 0;

  /*
    封神榜单独算：
    0转只有技能伤害，价值不高；
    1转怒气+1，价值大幅提升；
    3转怒气+2，价值再提升。
  */
  if(e==='sealBook' || name==='封神榜'){
    let turn=0;
    if(typeof treasureRealTurn==='function'){
      turn=treasureRealTurn(item);
    }else{
      turn=tfpNumV10(item&&item.turn,0);
    }

    if(turn>=3)return 1.75;
    if(turn>=1)return 1.25;
    return 0.70;
  }

  let w={
    normalDmg:0.75,
    skillDmg:1.00,
    critBoost:0.55,
    critDmg:0.65,
    hitBoost:0.40,
    dodgeBoost:0.65,
    healBoost:0.95,
    shieldBoost:1.05,
    dmgReduce:1.18,
    lifesteal:1.15,
    startEnergy:1.35,
    startRage:1.35
  }[e];

  if(w===undefined)w=0.80;

  /*
    专属法宝小修正：
    这些不是改灵效，只是让纸面战力更贴近实战价值。
  */
  if(name==='混沌钟')w+=0.10;
  if(name==='太极图')w+=0.08;
  if(name==='玄黄宝塔')w+=0.10;
  if(name==='弑神枪')w+=0.08;
  if(name==='十二品灭世黑莲')w+=0.08;
  if(name==='鸿蒙珠')w+=0.02;
  if(name==='七宝妙树')w-=0.05;

  if(w<0)w=0;
  return w;
}

/* 法宝总战力：基础等级战力 + 灵效战力 */
window.treasurePower=function(item){
  if(!item)return 0;

  let base=tfpFindBaseV10(item.tid);
  if(!base)return 0;

  let q=base.quality || 'N';
  let lv=tfpClampV10(item.level||1,1,800);

  let lv1=tfpLv1PowerV10(base);

  let basePart=lv1 * tfpBaseGrowV10(lv,q) * tfpBaseTurnMulV10(item);

  let effectPart=
    lv1 *
    tfpEffectLevelGrowV10(lv,q) *
    tfpEffectWeightV10(base,item) *
    tfpEffectTurnMulV10(item);

  /*
    封神榜：
    属性战力压一点，灵效战力保留。
  */
  if(base.name==='封神榜'){
    basePart*=0.82;
  }

  let total=basePart + effectPart;

  return Math.max(0,Math.round(total));
};

window.treasurePowerSafeV3=window.treasurePower;

/* 统计法宝给英雄的属性和法宝战力 */
window.getHeroTreasureStats=function(h){
  let total={atk:0,def:0,hp:0,power:0};

  if(!h || typeof getHeroTreasureItems!=='function')return total;

  getHeroTreasureItems(h).forEach(item=>{
    total.atk+=typeof treasureStatValue==='function' ? treasureStatValue(item,'atk') : 0;
    total.def+=typeof treasureStatValue==='function' ? treasureStatValue(item,'def') : 0;
    total.hp+=typeof treasureStatValue==='function' ? treasureStatValue(item,'hp') : 0;
    total.power+=window.treasurePower(item);
  });

  total.atk=Math.round(tfpNumV10(total.atk,0));
  total.def=Math.round(tfpNumV10(total.def,0));
  total.hp=Math.round(tfpNumV10(total.hp,0));
  total.power=Math.round(tfpNumV10(total.power,0));

  return total;
};

window.getHeroTreasureStatsV3=window.getHeroTreasureStats;

/*
  总战力：
  英雄本体战力 + 法宝自身战力。
  法宝属性先从英雄属性里减掉，避免重复算。
*/
window.power=function(arr){
  if(!Array.isArray(arr))return 0;

  return arr.reduce((sum,h)=>{
    if(!h)return sum;

    let t=window.getHeroTreasureStats(h);

    let fake=Object.assign({},h,{
      atk:Math.max(1,tfpNumV10(h.atk,1)-t.atk),
      def:Math.max(0,tfpNumV10(h.def,0)-t.def),
      hp:Math.max(1,tfpNumV10(h.hp||h.maxHp,1)-t.hp),
      maxHp:Math.max(1,tfpNumV10(h.maxHp,1)-t.hp)
    });

    let heroBasePower=typeof heroPower==='function' ? heroPower(fake) : 0;

    return sum + heroBasePower + t.power;
  },0);
};

/* 预览表：看基础战力 + 灵效战力后的总值 */
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

  let text='【法宝战力预览表 · V10灵效计入版】\n';
  text+='公式：基础等级战力 + 灵效战力\n';
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

/* 额外测试：显示某件法宝的战力拆分 */
window.showTreasurePowerBreakdownV10=function(tid,level,turn){
  let base=tfpFindBaseV10(tid);
  if(!base){
    alert('找不到法宝：'+tid);
    return;
  }

  let fake={
    uid:'break_'+tid,
    tid:tid,
    level:level||800,
    turn:turn||0
  };

  let q=base.quality || 'N';
  let lv1=tfpLv1PowerV10(base);
  let basePart=lv1 * tfpBaseGrowV10(fake.level,q) * tfpBaseTurnMulV10(fake);
  let effectPart=lv1 * tfpEffectLevelGrowV10(fake.level,q) * tfpEffectWeightV10(base,fake) * tfpEffectTurnMulV10(fake);

  if(base.name==='封神榜'){
    basePart*=0.82;
  }

  let text='【'+base.name+' 战力拆分】\n';
  text+='品质：'+q+'\n';
  text+='等级：'+fake.level+'\n';
  text+='转数：'+fake.turn+'\n\n';
  text+='1级基准：'+lv1+'\n';
  text+='基础等级战力：'+Math.round(basePart)+'\n';
  text+='灵效战力：'+Math.round(effectPart)+'\n';
  text+='总战力：'+window.treasurePower(fake)+'\n';

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
   Boss / 小怪正式设计 V11
   规则：
   1. 30/60、130/160、230/260……为小Boss
   2. 100/200/300/400/500/600/700/800为大Boss
   3. 普通小怪无技能
   4. 只有1号位Boss有技能
   5. 小Boss使用当前区间大Boss青春版技能
   6. 不再按玩家当前战力动态生成Boss
========================= */

function bfNumV11(v,def=0){
  let n=Number(v);
  return Number.isFinite(n)?n:def;
}

function bfClampV11(v,min,max){
  v=bfNumV11(v,min);
  if(v<min)return min;
  if(v>max)return max;
  return v;
}

/* 关卡类型 */
function bfStageKindV11(stage){
  stage=bfNumV11(stage,1);
  let pos=stage%100;

  if(stage%100===0)return 'BIG_BOSS';
  if(pos===30)return 'SMALL_BOSS_A';
  if(pos===60)return 'SMALL_BOSS_B';
  if(pos%10===0)return 'ELITE';
  return 'NORMAL';
}

/* 当前区间对应的大Boss模板 */
function bfMilestoneV11(stage){
  stage=bfNumV11(stage,1);
  let kind=bfStageKindV11(stage);

  if(kind==='BIG_BOSS'){
    return bfClampV11(stage,100,800);
  }

  let m=Math.floor(stage/100)*100+100;
  return bfClampV11(m,100,800);
}

function bfKindNameV11(kind){
  return {
    NORMAL:'普通关',
    ELITE:'精英关',
    SMALL_BOSS_A:'小Boss一',
    SMALL_BOSS_B:'小Boss二',
    BIG_BOSS:'大Boss'
  }[kind] || '普通关';
}

/* 小Boss和普通关强度缩放 */
function bfStageScaleV11(stage){
  let kind=bfStageKindV11(stage);
  let pos=stage%100;

  if(kind==='BIG_BOSS')return 1.00;
  if(kind==='SMALL_BOSS_A')return 0.45;
  if(kind==='SMALL_BOSS_B')return 0.65;
  if(kind==='ELITE')return 0.32 + Math.min(0.18,pos/100*0.18);

  return 0.18 + Math.min(0.18,pos/100*0.18);
}

/* 大Boss模板：按你定的阵容标准换算成敌人属性 */
function bfBossTemplateV11(m){
  let T={
    100:{
      names:['黄风大王','黑沙魔兵','混沌邪魔','沙海妖卒','黄沙鬼兵','风窟邪灵'],
      units:[
        {q:'SR',  atk:3500,  def:1200,  hp:300000},
        {q:'R',   atk:1600,  def:600,   hp:80000},
        {q:'R',   atk:1600,  def:600,   hp:80000},
        {q:'R',   atk:1500,  def:560,   hp:76000},
        {q:'R',   atk:1500,  def:560,   hp:76000},
        {q:'R',   atk:1700,  def:650,   hp:86000}
      ]
    },

    200:{
      names:['白骨夫人','枯骨刀卫','白骨妖兵','摄魂妖卒','荒坟鬼兵','骨林邪灵'],
      units:[
        {q:'SSR', atk:9000,  def:3200,  hp:900000},
        {q:'SR',  atk:4200,  def:1500,  hp:240000},
        {q:'SR',  atk:4200,  def:1500,  hp:240000},
        {q:'SR',  atk:3900,  def:1400,  hp:220000},
        {q:'SR',  atk:3900,  def:1400,  hp:220000},
        {q:'SR',  atk:4500,  def:1600,  hp:260000}
      ]
    },

    300:{
      names:['盘丝妖后','蛛网妖卫','毒蛛妖兵','盘丝妖卒','幻毒鬼兵','妖丝邪灵'],
      units:[
        {q:'SP',  atk:15000, def:5200,  hp:1600000},
        {q:'SSR', atk:7200,  def:2600,  hp:420000},
        {q:'SSR', atk:7200,  def:2600,  hp:420000},
        {q:'SSR', atk:6800,  def:2450,  hp:390000},
        {q:'SSR', atk:6800,  def:2450,  hp:390000},
        {q:'SSR', atk:7600,  def:2750,  hp:450000}
      ]
    },

    400:{
      names:['火焰牛魔','火山妖将','烈焰魔兵','熔岩妖卒','赤火鬼兵','焚风邪灵'],
      units:[
        {q:'SP',  atk:22000, def:7600,  hp:2500000},
        {q:'SP',  atk:20000, def:7000,  hp:2200000},
        {q:'SP',  atk:20000, def:7000,  hp:2200000},
        {q:'SSR', atk:11000, def:3900,  hp:800000},
        {q:'SSR', atk:11000, def:3900,  hp:800000},
        {q:'SSR', atk:12000, def:4200,  hp:900000}
      ]
    },

    500:{
      names:['狮驼妖王','狮驼先锋','裂山妖兵','吞风妖卒','铁羽鬼兵','金翅邪灵'],
      units:[
        {q:'UR',  atk:36000, def:12000, hp:4800000},
        {q:'SP',  atk:18000, def:6500,  hp:1400000},
        {q:'SP',  atk:18000, def:6500,  hp:1400000},
        {q:'SP',  atk:17000, def:6100,  hp:1300000},
        {q:'SP',  atk:17000, def:6100,  hp:1300000},
        {q:'SP',  atk:19000, def:7000,  hp:1500000}
      ]
    },

    600:{
      names:['血海冥王','修罗血卫','血海魔兵','冥河妖卒','血煞鬼兵','业火邪灵'],
      units:[
        {q:'UR',  atk:52000, def:17000, hp:7200000},
        {q:'UR',  atk:47000, def:15500, hp:6500000},
        {q:'SP',  atk:26000, def:9000,  hp:2200000},
        {q:'SP',  atk:25000, def:8600,  hp:2100000},
        {q:'SP',  atk:25000, def:8600,  hp:2100000},
        {q:'SP',  atk:27000, def:9400,  hp:2350000}
      ]
    },

    700:{
      names:['太古星君','星辰守卫','陨星魔兵','星海妖卒','天陨鬼兵','星辉邪灵'],
      units:[
        {q:'UR',  atk:78000, def:25000, hp:11000000},
        {q:'UR',  atk:72000, def:23500, hp:10000000},
        {q:'UR',  atk:72000, def:23500, hp:10000000},
        {q:'UR',  atk:76000, def:24500, hp:10800000},
        {q:'SP',  atk:38000, def:13000, hp:3400000},
        {q:'SP',  atk:40000, def:13800, hp:3600000}
      ]
    },

    800:{
      names:['原始天魔','混沌魔卫','天魔邪兵','裂界妖卒','灭世鬼兵','虚空邪灵'],
      units:[
        {q:'UR',  atk:110000, def:36000, hp:16000000},
        {q:'UR',  atk:102000, def:33000, hp:14800000},
        {q:'UR',  atk:102000, def:33000, hp:14800000},
        {q:'UR',  atk:105000, def:34500, hp:15200000},
        {q:'UR',  atk:105000, def:34500, hp:15200000},
        {q:'SP',  atk:52000,  def:18000, hp:5200000}
      ]
    }
  };

  return T[m] || T[100];
}

function bfMakeEnemyV11(id,type,name,src,scale,hasSkill,skillCfg){
  let atk=Math.max(100,Math.round(src.atk*scale));
  let def=Math.max(50,Math.round(src.def*scale));
  let hp=Math.max(1000,Math.round(src.hp*scale));

  return {
    id:id,
    type:type,
    name:name,
    q:src.q || 'R',
    atk:atk,
    baseAtk:atk,
    def:def,
    hp:hp,
    maxHp:hp,
    shield:0,
    stun:0,
    freeze:0,
    charm:0,
    seal:0,
    weak:0,
    weakPct:0,
    defDown:0,
    defDownPct:0,
    atkUp:0,
    atkUpPct:0,
    defUp:0,
    defUpPct:0,
    energy:hasSkill?2:0,
    skill:hasSkill ? skillCfg.name : '',
    _bossSkill:hasSkill ? skillCfg : null,
    alive:true
  };
}

/* Boss技能配置 */
function bfBossSkillV11(stage){
  let kind=bfStageKindV11(stage);
  let m=bfMilestoneV11(stage);

  let grade='big';
  if(kind==='SMALL_BOSS_A')grade='smallA';
  if(kind==='SMALL_BOSS_B')grade='smallB';

  function pick(a,b,c){
    if(grade==='smallA')return a;
    if(grade==='smallB')return b;
    return c;
  }

  let cfg={name:'妖王怒击',rate:1.2,targets:'front'};

  if(m===100){
    cfg={
      name:pick('黄风乱刃','黄风狂刃','黄风裂空斩'),
      rate:pick(1.00,1.25,1.60),
      targets:'front'
    };
  }

  if(m===200){
    cfg={
      name:pick('白骨爪影','白骨裂魂','白骨噬魂爪'),
      rate:pick(1.20,1.50,1.90),
      targets:'front',
      defDown:pick(0.08,0.10,0.15)
    };
  }

  if(m===300){
    cfg={
      name:pick('盘丝毒影','盘丝缠魂','盘丝锁魂阵'),
      rate:pick(1.45,1.75,2.20),
      targets:'front',
      stunChance:pick(0.10,0.15,0.25),
      shieldPct:pick(0.05,0.07,0.10)
    };
  }

  if(m===400){
    cfg={
      name:pick('焰山冲击','焰山裂阵','牛魔焚天击'),
      rate:pick(1.60,1.90,2.40),
      targets:'front',
      defDown:pick(0.08,0.10,0.15),
      shieldPct:pick(0.06,0.08,0.12)
    };
  }

  if(m===500){
    cfg={
      name:pick('狮驼裂爪','狮驼吞山','狮驼吞天击'),
      rate:pick(1.80,2.20,2.70),
      targets:'front',
      lowHpLine:0.35,
      lowExtra:pick(0.35,0.55,0.80)
    };
  }

  if(m===600){
    cfg={
      name:pick('血海斩浪','血海翻天','血海灭魂斩'),
      rate:pick(1.90,2.35,2.90),
      targets:'front',
      shieldPct:pick(0.08,0.11,0.15)
    };
  }

  if(m===700){
    cfg={
      name:pick('星陨封息','星陨禁法','太古封星术'),
      rate:pick(2.10,2.50,3.10),
      targets:'front',
      sealChance:pick(0.08,0.12,0.20)
    };
  }

  if(m===800){
    cfg={
      name:pick('天魔裂界','天魔灭世','原始灭世劫'),
      rate:pick(2.30,2.80,3.40),
      targets:'front',
      sealChance:pick(0.10,0.18,0.30),
      lowHpLine:0.30,
      lowExtra:pick(0.40,0.70,1.00)
    };
  }

  cfg.kind=kind;
  cfg.milestone=m;
  return cfg;
}

/* 覆盖是否Boss关：只认 +30/+60/整百 */
window.isBossStage=function(stage){
  let kind=bfStageKindV11(stage);
  return kind==='SMALL_BOSS_A' || kind==='SMALL_BOSS_B' || kind==='BIG_BOSS';
};

/* 覆盖敌人生成 */
window.resetEnemies=function(){
  let stage=bfNumV11(currentStage,1);
  let kind=bfStageKindV11(stage);
  let m=bfMilestoneV11(stage);
  let template=bfBossTemplateV11(m);
  let scale=bfStageScaleV11(stage);
  let bossSkill=bfBossSkillV11(stage);

  let isBossKind=kind==='SMALL_BOSS_A' || kind==='SMALL_BOSS_B' || kind==='BIG_BOSS';

  enemies=template.units.map((u,idx)=>{
    let id='e'+(idx+1);
    let name=template.names[idx] || ('敌人'+(idx+1));

    /*
      普通关 / 精英关：
      全部都是小怪，无技能。
      小Boss / 大Boss：
      1号位是Boss，有技能，其余无技能。
    */
    let type=(isBossKind && idx===0) ? 'Boss' : '怪';
    let hasSkill=isBossKind && idx===0;

    return bfMakeEnemyV11(id,type,name,u,scale,hasSkill,bossSkill);
  });

  /*
    大Boss和小Boss一点点护盾，避免被一轮秒。
    普通怪没有。
  */
  if(isBossKind && enemies[0]){
    if(kind==='BIG_BOSS')enemies[0].shield=Math.round(enemies[0].maxHp*0.10);
    if(kind==='SMALL_BOSS_A')enemies[0].shield=Math.round(enemies[0].maxHp*0.04);
    if(kind==='SMALL_BOSS_B')enemies[0].shield=Math.round(enemies[0].maxHp*0.06);
  }

  if(typeof skillTestMode!=='undefined' && skillTestMode){
    enemies.forEach(e=>{
      e.hp=Math.round(e.hp*1.25);
      e.maxHp=e.hp;
      e.atk=Math.round(e.atk*1.15);
      e.baseAtk=e.atk;
    });
  }
};

/* 敌方战力显示 */
window.enemyPower=function(arr){
  return (arr||[]).reduce((s,e)=>{
    if(!e)return s;
    return s + e.atk*4 + e.def*2.2 + e.maxHp*0.08 + (e.shield||0)*0.04;
  },0);
};

function bfAliveTargetsV11(side){
  let arr=[];

  if(typeof getBattleEnemies==='function'){
    arr=getBattleEnemies(side)||[];
  }else{
    arr=side==='enemy' ? (typeof team==='function'?team():[]) : enemies;
  }

  return arr.filter(x=>x&&x.hp>0);
}

function bfFrontTargetsV11(side){
  let arr=bfAliveTargetsV11(side);
  return arr.slice(0,3);
}

function bfBossAtkV11(a){
  if(typeof battleAtk==='function')return battleAtk(a);
  return Math.max(1,bfNumV11(a&&a.atk,1));
}

async function bfBossSkillEffectV11(a,side){
  let cfg=a._bossSkill;
  if(!cfg)return false;

  let targets=bfFrontTargetsV11(side);
  if(!targets.length)return true;

  if(typeof center==='function')center(cfg.name,true);
  if(typeof render==='function')render();
  if(typeof sleep==='function')await sleep(250);

  let atk=bfBossAtkV11(a);

  for(let t of targets){
    if(!t || t.hp<=0)continue;

    let dmg=Math.round(atk*cfg.rate);

    if(cfg.lowHpLine && t.maxHp && t.hp/t.maxHp<cfg.lowHpLine){
      dmg+=Math.round(atk*cfg.lowExtra);
    }

    let real=typeof applyDamage==='function' ? applyDamage(t,dmg) : dmg;

    if(typeof anim==='function')anim(t.id,'hit');
    if(real>0 && typeof floatDmg==='function')floatDmg(t.id,real);

    if(cfg.defDown && t.hp>0){
      t.defDown=1;
      t.defDownPct=cfg.defDown;
    }

    if(cfg.stunChance && t.hp>0 && Math.random()<cfg.stunChance){
      t.stun=1;
    }

    if(cfg.sealChance && t.hp>0 && Math.random()<cfg.sealChance){
      t.seal=1;
    }
  }

  if(cfg.shieldPct && typeof addShield==='function'){
    addShield(a,Math.round(a.maxHp*cfg.shieldPct));
  }

  if(typeof render==='function')render();
  if(typeof sleep==='function')await sleep(650);
  if(typeof center==='function')center('',false);

  return true;
}

/* 覆盖Boss技能：只拦截敌方Boss */
let bfOldPerformSkillEffectV11=typeof performSkillEffect==='function'?performSkillEffect:null;

if(bfOldPerformSkillEffectV11){
  window.performSkillEffect=async function(a,t,side){
    if(a && a._bossSkill && side==='enemy'){
      return await bfBossSkillEffectV11(a,side);
    }

    return await bfOldPerformSkillEffectV11(a,t,side);
  };
}

/* 战斗标题增强 + 胜利后允许继续下一场 */
let bfOldChallengeBossV11=typeof challengeBoss==='function'?challengeBoss:null;

if(bfOldChallengeBossV11){
  window.challengeBoss=async function(){
    let stage=bfNumV11(currentStage,1);
    let kind=bfStageKindV11(stage);

    if(typeof battleTitle!=='undefined' && battleTitle){
      battleTitle.innerText='第'+stage+'关 · '+bfKindNameV11(kind)+' 准备中';
    }

    await bfOldChallengeBossV11();

    /*
      旧逻辑胜利后 bossPending=false。
      挂机测试阶段这里自动打开下一场，方便连续测曲线。
    */
    if(!combatLock && !skillTestMode && !bossPending){
      bossPending=true;
      if(typeof showNotice==='function'){
        showNotice('已进入第'+currentStage+'关，可继续挑战。',2200);
      }
      if(typeof render==='function')render();
    }
  };
}

/* 测试用：查看当前敌人数据 */
window.bfShowEnemyInfoV11=function(){
  if(typeof resetEnemies==='function')resetEnemies();

  let stage=bfNumV11(currentStage,1);
  let kind=bfStageKindV11(stage);
  let m=bfMilestoneV11(stage);

  let text='【第'+stage+'关 · '+bfKindNameV11(kind)+'】\n';
  text+='模板：'+m+'关大Boss\n\n';

  enemies.forEach(e=>{
    text+=e.name+'：';
    text+='攻'+e.atk+' / 防'+e.def+' / 血'+e.maxHp;
    if(e.shield>0)text+=' / 盾'+e.shield;
    if(e.skill)text+=' / 技能：'+e.skill;
    text+='\n';
  });

  text+='\n敌方战力：';
  text+=typeof formatPower==='function' ? formatPower(enemyPower(enemies)) : Math.round(enemyPower(enemies));

  alert(text);
};

if(typeof resetEnemies==='function')resetEnemies();
if(typeof render==='function')render();

/* =========================
   Boss设计 V12：每10关一个Boss + 指数缩放版
   重点：
   1. 每10关都有Boss
   2. 100/200/300...是大Boss
   3. 10/20/30/40...是当前区间大Boss的青春版
   4. 30关不再是100关45%，改成9%
   5. 普通关无技能
========================= */

function bfStageKindV12(stage){
  stage=bfNumV11(stage,1);
  if(stage % 100 === 0)return 'BIG_BOSS';
  if(stage % 10 === 0)return 'SMALL_BOSS';
  return 'NORMAL';
}

function bfKindNameV12(kind,stage){
  if(kind==='BIG_BOSS')return '大Boss';
  if(kind==='SMALL_BOSS')return '小Boss';
  return '普通关';
}

/* 当前区间大Boss模板 */
function bfMilestoneV12(stage){
  stage=bfNumV11(stage,1);

  if(stage % 100 === 0){
    return bfClampV11(stage,100,800);
  }

  let m=Math.floor(stage/100)*100+100;
  return bfClampV11(m,100,800);
}

/*
  重点缩放：
  以前30关是45%，太高。
  现在30关只有9%。
*/
function bfStageScaleV12(stage){
  stage=bfNumV11(stage,1);
  let kind=bfStageKindV12(stage);
  let pos=stage % 100;

  if(kind==='BIG_BOSS')return 1.00;

  if(kind==='SMALL_BOSS'){
    let table={
      10:0.030,
      20:0.055,
      30:0.090,
      40:0.140,
      50:0.200,
      60:0.280,
      70:0.380,
      80:0.520,
      90:0.700
    };

    return table[pos] || 0.10;
  }

  /*
    普通小怪更弱，不放技能。
    比同区间小Boss低很多。
  */
  let x=pos/100;
  return 0.025 + x*0.10;
}

/* Boss技能也按当前关卡缩放 */
function bfBossSkillV12(stage){
  let kind=bfStageKindV12(stage);
  let m=bfMilestoneV12(stage);
  let pos=stage % 100;

  /*
    技能强度倍率：
    10关很弱，越接近100越接近完整技能。
  */
  let skillMul=1;

  if(kind==='SMALL_BOSS'){
    skillMul=0.50 + pos/100*0.50;
  }

  if(kind==='BIG_BOSS'){
    skillMul=1;
  }

  let cfg={
    name:'妖王怒击',
    rate:1.0,
    targets:'front',
    kind:kind,
    milestone:m
  };

  if(m===100){
    cfg={
      name:kind==='BIG_BOSS'?'黄风裂空斩':'黄风小旋风',
      rate:1.60*skillMul,
      targets:'front'
    };
  }

  if(m===200){
    cfg={
      name:kind==='BIG_BOSS'?'白骨噬魂爪':'白骨爪影',
      rate:1.90*skillMul,
      targets:'front',
      defDown:0.15*skillMul
    };
  }

  if(m===300){
    cfg={
      name:kind==='BIG_BOSS'?'盘丝锁魂阵':'盘丝毒影',
      rate:2.20*skillMul,
      targets:'front',
      stunChance:0.25*skillMul,
      shieldPct:0.10*skillMul
    };
  }

  if(m===400){
    cfg={
      name:kind==='BIG_BOSS'?'牛魔焚天击':'焰山冲击',
      rate:2.40*skillMul,
      targets:'front',
      defDown:0.15*skillMul,
      shieldPct:0.12*skillMul
    };
  }

  if(m===500){
    cfg={
      name:kind==='BIG_BOSS'?'狮驼吞天击':'狮驼裂爪',
      rate:2.70*skillMul,
      targets:'front',
      lowHpLine:0.35,
      lowExtra:0.80*skillMul
    };
  }

  if(m===600){
    cfg={
      name:kind==='BIG_BOSS'?'血海灭魂斩':'血海斩浪',
      rate:2.90*skillMul,
      targets:'front',
      shieldPct:0.15*skillMul
    };
  }

  if(m===700){
    cfg={
      name:kind==='BIG_BOSS'?'太古封星术':'星陨封息',
      rate:3.10*skillMul,
      targets:'front',
      sealChance:0.20*skillMul
    };
  }

  if(m===800){
    cfg={
      name:kind==='BIG_BOSS'?'原始灭世劫':'天魔裂界',
      rate:3.40*skillMul,
      targets:'front',
      sealChance:0.30*skillMul,
      lowHpLine:0.30,
      lowExtra:1.00*skillMul
    };
  }

  cfg.kind=kind;
  cfg.milestone=m;
  return cfg;
}

/* 覆盖旧V11函数名，让旧挑战逻辑也吃新规则 */
bfStageKindV11=bfStageKindV12;
bfStageScaleV11=bfStageScaleV12;
bfMilestoneV11=bfMilestoneV12;
bfBossSkillV11=bfBossSkillV12;
bfKindNameV11=function(kind){
  return bfKindNameV12(kind,currentStage);
};

/* 每10关都算Boss关 */
window.isBossStage=function(stage){
  return bfStageKindV12(stage)!=='NORMAL';
};

/* 覆盖敌人生成 */
window.resetEnemies=function(){
  let stage=bfNumV11(currentStage,1);
  let kind=bfStageKindV12(stage);
  let m=bfMilestoneV12(stage);
  let template=bfBossTemplateV11(m);
  let scale=bfStageScaleV12(stage);
  let bossSkill=bfBossSkillV12(stage);

  let isBossKind=kind!=='NORMAL';

  enemies=template.units.map((u,idx)=>{
    let id='e'+(idx+1);
    let name=template.names[idx] || ('敌人'+(idx+1));

    let type=(isBossKind && idx===0) ? 'Boss' : '怪';
    let hasSkill=isBossKind && idx===0;

    return bfMakeEnemyV11(id,type,name,u,scale,hasSkill,bossSkill);
  });

  /*
    护盾也跟着缩放。
    30关护盾很少，不会卡死。
  */
  if(isBossKind && enemies[0]){
    if(kind==='BIG_BOSS'){
      enemies[0].shield=Math.round(enemies[0].maxHp*0.10);
    }else{
      let pos=stage%100;
      let shieldPct=0.01 + pos/100*0.05;
      enemies[0].shield=Math.round(enemies[0].maxHp*shieldPct);
    }
  }

  if(typeof skillTestMode!=='undefined' && skillTestMode){
    enemies.forEach(e=>{
      e.hp=Math.round(e.hp*1.15);
      e.maxHp=e.hp;
      e.atk=Math.round(e.atk*1.10);
      e.baseAtk=e.atk;
    });
  }
};

/* 当前敌人信息测试 */
window.bfShowEnemyInfoV12=function(){
  if(typeof resetEnemies==='function')resetEnemies();

  let stage=bfNumV11(currentStage,1);
  let kind=bfStageKindV12(stage);
  let m=bfMilestoneV12(stage);
  let scale=bfStageScaleV12(stage);

  let text='【第'+stage+'关 · '+bfKindNameV12(kind,stage)+'】\n';
  text+='模板：'+m+'关大Boss\n';
  text+='强度倍率：'+Math.round(scale*1000)/10+'%\n\n';

  enemies.forEach(e=>{
    text+=e.name+'：';
    text+='攻'+e.atk+' / 防'+e.def+' / 血'+e.maxHp;
    if(e.shield>0)text+=' / 盾'+e.shield;
    if(e.skill)text+=' / 技能：'+e.skill;
    text+='\n';
  });

  text+='\n敌方战力：';
  text+=typeof formatPower==='function' ? formatPower(enemyPower(enemies)) : Math.round(enemyPower(enemies));

  alert(text);
};

/* 兼容旧按钮名 */
window.bfShowEnemyInfoV11=window.bfShowEnemyInfoV12;

/* 刷新 */
if(typeof resetEnemies==='function')resetEnemies();
if(typeof render==='function')render();

/* =========================
   测试按钮 + 人物连升10级补丁
   作用：
   1. 添加“测100关 / 测200关”
   2. 人物升级按钮“连升”改为“连升10级”
========================= */

function fsNoticeTestPatch(text){
  if(typeof showNotice==='function'){
    showNotice(text,2200);
  }else if(typeof notice!=='undefined' && notice){
    notice.innerText=text;
  }else{
    alert(text);
  }
}

/* 跳到指定Boss关测试 */
function fsTestBossStageFinal(stage){
  if(typeof combatLock!=='undefined' && combatLock){
    fsNoticeTestPatch('当前正在战斗，等这场打完再切测试关。');
    return;
  }

  currentStage=stage;
  bossPending=true;

  if(typeof resetEnemies==='function'){
    resetEnemies();
  }

  if(typeof battleTitle!=='undefined' && battleTitle){
    battleTitle.innerText='推图：第'+stage+'关   Boss待挑战';
  }

  if(typeof render==='function'){
    render();
  }

  fsNoticeTestPatch('已切到第'+stage+'关，点击挑战Boss测试。');
}

/* 安装两个测试按钮 */
function fsInstallBossTestButtonsFinal(){
  if(document.getElementById('fsBossTestBtnsFinal'))return;

  let game=document.querySelector('.game') || document.body;
  if(!game)return;

  let box=document.createElement('div');
  box.id='fsBossTestBtnsFinal';
  box.style.cssText=[
    'display:grid',
    'grid-template-columns:1fr 1fr',
    'gap:6px',
    'margin:6px 0',
    'padding:0 2px'
  ].join(';');

  box.innerHTML=`
    <button style="height:34px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:16px;"
      onclick="fsTestBossStageFinal(100)">测100关</button>
    <button style="height:34px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:16px;"
      onclick="fsTestBossStageFinal(200)">测200关</button>
  `;

  let menu=document.querySelector('.menu');
  if(menu && menu.parentNode){
    menu.parentNode.insertBefore(box,menu);
  }else{
    game.appendChild(box);
  }
}

/* 人物连升10级 */
function fsHeroLevelUp10Final(){
  let count=0;

  for(let i=0;i<10;i++){
    let btns=Array.from(document.querySelectorAll('button'));

    let oneBtn=btns.find(b=>{
      let t=(b.innerText||'').trim();
      return t==='升1级' || t==='升级' || t==='升一级';
    });

    if(!oneBtn || oneBtn.disabled)break;

    oneBtn.click();
    count++;
  }

  if(typeof render==='function'){
    render();
  }

  setTimeout(fsPatchHeroLevelButtonFinal,80);

  fsNoticeTestPatch('已连升'+count+'级。');
}

/* 把“连升”按钮改成“连升10级” */
function fsPatchHeroLevelButtonFinal(){
  let btns=Array.from(document.querySelectorAll('button'));

  btns.forEach(btn=>{
    let t=(btn.innerText||'').trim();

    if(t==='连升'){
      btn.innerText='连升10级';
      btn.onclick=function(e){
        if(e)e.stopPropagation();
        fsHeroLevelUp10Final();
        return false;
      };
    }
  });
}

/* 每次render后都重新检查按钮 */
if(typeof render==='function' && !window.fsRenderPatchBossTestAndLevel10){
  window.fsRenderPatchBossTestAndLevel10=true;

  let fsOldRenderBossTestAndLevel10=render;

  render=function(){
    fsOldRenderBossTestAndLevel10();

    setTimeout(function(){
      fsInstallBossTestButtonsFinal();
      fsPatchHeroLevelButtonFinal();
    },50);
  };
}

/* 启动一次 */
setTimeout(function(){
  fsInstallBossTestButtonsFinal();
  fsPatchHeroLevelButtonFinal();

  if(typeof render==='function'){
    render();
  }
},120);

/* =========================
   测试按钮修复 V3
   修复：
   1. 加资源按钮点了没反应
   2. 连升10级没生效
   3. 所有测试按钮函数挂到 window，保证 onclick 能点
========================= */

window.fsNoticePatchV3=function(text){
  if(typeof showNotice==='function'){
    showNotice(text,2500);
  }else if(typeof notice!=='undefined' && notice){
    notice.innerText=text;
  }else{
    alert(text);
  }
};

/* 发测试资源：这次挂到 window，按钮一定能调用 */
window.fsAddMoreTestResourcesV3=function(){
  if(typeof cult!=='undefined'){
    cult += 50000000000;
  }else{
    window.cult = 50000000000;
  }

  if(typeof spiritStone!=='undefined'){
    spiritStone += 500000000000;
  }else{
    window.spiritStone = 500000000000;
  }

  if(typeof gold!=='undefined'){
    gold += 500000000;
  }else{
    window.gold = 500000000;
  }

  if(typeof treasureBreakStone!=='undefined'){
    treasureBreakStone += 999999;
  }else{
    window.treasureBreakStone = 999999;
  }

  if(typeof refreshTopResourceFinal==='function'){
    refreshTopResourceFinal();
  }

  if(typeof render==='function'){
    render();
  }

  window.fsNoticePatchV3('测试资源已发放：修为+500亿，灵石+5000亿，元宝+5亿，突破石+999999。');
};

/* 跳关测试：挂到 window */
window.fsTestBossStageV3=function(stage){
  if(typeof combatLock!=='undefined' && combatLock){
    window.fsNoticePatchV3('当前正在战斗，等这场打完再切测试关。');
    return;
  }

  currentStage=stage;
  bossPending=true;

  if(typeof resetEnemies==='function'){
    resetEnemies();
  }

  if(typeof battleTitle!=='undefined' && battleTitle){
    battleTitle.innerText='推图：第'+stage+'关   Boss待挑战';
  }

  if(typeof render==='function'){
    render();
  }

  window.fsNoticePatchV3('已切到第'+stage+'关，点击挑战Boss测试。');
};

/* 重新安装测试按钮 */
window.fsInstallBossTestButtonsV3=function(){
  let old1=document.getElementById('fsBossTestBtnsFinal');
  if(old1)old1.remove();

  let old2=document.getElementById('fsBossTestBtnsV2');
  if(old2)old2.remove();

  let old3=document.getElementById('fsBossTestBtnsV3');
  if(old3)old3.remove();

  let game=document.querySelector('.game') || document.body;
  if(!game)return;

  let box=document.createElement('div');
  box.id='fsBossTestBtnsV3';
  box.style.cssText=[
    'display:grid',
    'grid-template-columns:repeat(4,1fr)',
    'gap:5px',
    'margin:6px 0',
    'padding:0 2px'
  ].join(';');

  box.innerHTML=`
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(100)">100关</button>
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(200)">200关</button>
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(230)">230关</button>
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(280)">280关</button>
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(340)">340关</button>
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(380)">380关</button>
    <button style="height:32px;background:#111;border:1px solid #d8aa45;color:#d8aa45;font-size:14px;" onclick="window.fsTestBossStageV3(430)">430关</button>
    <button style="height:32px;background:#111;border:1px solid #66dd88;color:#66dd88;font-size:14px;" onclick="window.fsAddMoreTestResourcesV3()">加资源</button>
  `;

  let menu=document.querySelector('.menu');
  if(menu && menu.parentNode){
    menu.parentNode.insertBefore(box,menu);
  }else{
    game.appendChild(box);
  }
};

/* 找当前选中角色 */
window.fsSelectedHeroV3=function(){
  if(typeof heroes==='undefined')return null;

  if(typeof selectedHeroId!=='undefined'){
    let h=heroes.find(x=>x.id===selectedHeroId);
    if(h)return h;
  }

  if(typeof team==='function'){
    let t=team();
    if(t && t[0])return t[0];
  }

  return heroes[0] || null;
};

/* 直接升1级：不依赖旧按钮 */
window.fsLevelUpOneDirectV3=function(h){
  if(!h)return false;

  let lv=Number(h.level || h.lv || 1);
  let next=lv+1;

  h.level=next;
  h.lv=next;

  /*
    兼容你的升品等级显示：
    只升等级，不乱改品质。
  */

  if(typeof recalcHeroStats==='function'){
    recalcHeroStats(h);
  }

  return true;
};

/* 连升10级：这次直接改角色等级 */
window.fsHeroLevelUp10V3=function(){
  let h=window.fsSelectedHeroV3();

  if(!h){
    window.fsNoticePatchV3('没有找到当前角色。');
    return;
  }

  let before=Number(h.level || h.lv || 1);

  for(let i=0;i<10;i++){
    window.fsLevelUpOneDirectV3(h);
  }

  let after=Number(h.level || h.lv || before+10);

  if(typeof recalcHeroStats==='function'){
    recalcHeroStats(h);
  }

  if(typeof refreshTopResourceFinal==='function'){
    refreshTopResourceFinal();
  }

  if(typeof render==='function'){
    render();
  }

  setTimeout(window.fsPatchHeroLevelButtonV3,80);

  window.fsNoticePatchV3(h.name+'：'+before+'级 → '+after+'级');
};

/* 把连升按钮强制改成连升10级 */
window.fsPatchHeroLevelButtonV3=function(){
  let all=Array.from(document.querySelectorAll('button,div'));

  all.forEach(el=>{
    let t=(el.innerText||'').trim();

    if(t==='连升' || t==='连升10级'){
      el.innerText='连升10级';
      el.onclick=function(e){
        if(e){
          e.preventDefault();
          e.stopPropagation();
        }
        window.fsHeroLevelUp10V3();
        return false;
      };
      el.style.color='#d8aa45';
      el.style.borderColor='#d8aa45';
    }
  });
};

/* 兜底：捕获点击 */
if(!window.fsLevel10CaptureV3){
  window.fsLevel10CaptureV3=true;

  document.addEventListener('click',function(e){
    let el=e.target;
    if(!el)return;

    let btn=el.closest ? el.closest('button,div') : el;
    if(!btn)return;

    let t=(btn.innerText||'').trim();

    if(t==='连升' || t==='连升10级'){
      e.preventDefault();
      e.stopPropagation();
      window.fsHeroLevelUp10V3();
      return false;
    }
  },true);
}

/* 每秒检查一次，防止 render 后按钮又变回去 */
if(!window.fsLevel10TimerV3){
  window.fsLevel10TimerV3=setInterval(function(){
    window.fsPatchHeroLevelButtonV3();
  },1000);
}

/* 包一层 render */
if(typeof render==='function' && !window.fsRenderPatchV3){
  window.fsRenderPatchV3=true;

  let oldRenderV3=render;

  render=function(){
    oldRenderV3();

    setTimeout(function(){
      window.fsInstallBossTestButtonsV3();
      window.fsPatchHeroLevelButtonV3();
    },80);
  };
}

/* 启动 */
setTimeout(function(){
  window.fsInstallBossTestButtonsV3();
  window.fsPatchHeroLevelButtonV3();

  if(typeof render==='function'){
    render();
  }
},120);

/* =========================
   手机救火补丁 V4
   作用：
   1. 强制修复法宝弹窗“连升10级”
   2. 强制显示战斗血量百分比
   3. 不改Boss、不改法宝战力、不改角色数据
========================= */

/* ---------- 工具 ---------- */
window.fsSafeNoticeV4=function(text){
  if(typeof showNotice==='function'){
    showNotice(text,2200);
  }else if(typeof notice!=='undefined' && notice){
    notice.innerText=text;
  }else{
    alert(text);
  }
};

window.fsNumV4=function(v,def){
  let n=Number(v);
  return Number.isFinite(n)?n:(def||0);
};

/* ---------- 强制法宝连升10级 ---------- */
window.fsTreasureUpgradeTenV4=function(uid){
  if(!uid){
    window.fsSafeNoticeV4('没有找到法宝ID。');
    return;
  }

  if(typeof treasureBag==='undefined'){
    window.fsSafeNoticeV4('没有找到法宝背包。');
    return;
  }

  let item=treasureBag.find(x=>x.uid===uid);
  if(!item){
    window.fsSafeNoticeV4('没有找到这件法宝。');
    return;
  }

  let count=0;

  for(let i=0;i<10;i++){
    let lv=window.fsNumV4(item.level,1);

    if(lv>=800)break;

    if(typeof treasureNeedBreakFinal==='function' && treasureNeedBreakFinal(item)){
      break;
    }

    let cost=1;

    if(typeof treasureUpgradeCostFinal==='function'){
      cost=treasureUpgradeCostFinal(item);
    }

    if(typeof spiritStone==='undefined'){
      window.spiritStone=0;
    }

    if(spiritStone<cost){
      break;
    }

    spiritStone-=cost;
    item.level=lv+1;
    count++;
  }

  if(count<=0){
    if(typeof treasureNeedBreakFinal==='function' && treasureNeedBreakFinal(item)){
      window.fsSafeNoticeV4('需要先突破转数。');
    }else{
      window.fsSafeNoticeV4('灵石不足，无法连升。');
    }
  }else{
    window.fsSafeNoticeV4('法宝连升成功：+'+count+'级');
  }

  if(typeof heroes!=='undefined' && typeof recalcHeroStats==='function'){
    heroes.forEach(h=>recalcHeroStats(h));
  }

  if(typeof refreshTopResourceFinal==='function'){
    refreshTopResourceFinal();
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

  setTimeout(function(){
    if(typeof showTreasureDetail==='function'){
      showTreasureDetail(uid,'bag');
    }
  },80);
};

/* 从按钮 onclick 里提取 uid */
window.fsGetTreasureUidFromButtonV4=function(btn){
  if(!btn)return '';

  let code=btn.getAttribute('onclick') || '';

  let m=code.match(/upgradeTreasureTenFinal\(['"]([^'"]+)['"]\)/);
  if(m && m[1])return m[1];

  m=code.match(/fsTreasureUpgradeTenV4\(['"]([^'"]+)['"]\)/);
  if(m && m[1])return m[1];

  if(window.__fsCurrentTreasureUidV4)return window.__fsCurrentTreasureUidV4;

  return '';
};

/* 记住当前打开的法宝 uid */
if(typeof showTreasureDetail==='function' && !window.__fsWrapShowTreasureDetailV4){
  window.__fsWrapShowTreasureDetailV4=true;

  let oldShowTreasureDetailV4=showTreasureDetail;

  window.showTreasureDetail=function(id,mode){
    if(mode==='bag'){
      window.__fsCurrentTreasureUidV4=id;
    }

    let r=oldShowTreasureDetailV4(id,mode);

    setTimeout(window.fsPatchTreasureButtonsV4,80);

    return r;
  };
}

/* 把法宝弹窗里的“连升10级”按钮强制改成我们的函数 */
window.fsPatchTreasureButtonsV4=function(){
  let pop=document.getElementById('treasureDetailPop');
  if(!pop)return;

  let btns=Array.from(pop.querySelectorAll('button,div'));

  btns.forEach(btn=>{
    let t=(btn.innerText||'').trim();

    if(t==='连升10级'){
      let uid=window.fsGetTreasureUidFromButtonV4(btn);

      if(uid){
        btn.setAttribute('onclick',"window.fsTreasureUpgradeTenV4('"+uid+"')");
        btn.onclick=function(e){
          if(e){
            e.preventDefault();
            e.stopPropagation();
          }
          window.fsTreasureUpgradeTenV4(uid);
          return false;
        };
      }
    }
  });
};

/* 捕获法宝弹窗点击，防止被人物连升拦截 */
if(!window.__fsTreasureClickCaptureV4){
  window.__fsTreasureClickCaptureV4=true;

  document.addEventListener('click',function(e){
    let pop=document.getElementById('treasureDetailPop');
    if(!pop)return;

    let btn=e.target && e.target.closest ? e.target.closest('button,div') : null;
    if(!btn)return;

    if(!pop.contains(btn))return;

    let t=(btn.innerText||'').trim();

    if(t==='连升10级'){
      e.preventDefault();
      e.stopPropagation();

      let uid=window.fsGetTreasureUidFromButtonV4(btn);

      if(uid){
        window.fsTreasureUpgradeTenV4(uid);
      }else{
        window.fsSafeNoticeV4('没有找到法宝ID。');
      }

      return false;
    }
  },true);
}

/* ---------- 强制显示血量百分比 ---------- */
window.fsHpTextV4=function(u){
  if(!u || !u.maxHp)return '';
  let hp=Math.max(0,window.fsNumV4(u.hp,0));
  let max=Math.max(1,window.fsNumV4(u.maxHp,1));
  let p=Math.round(hp/max*100);
  if(p<0)p=0;
  if(p>100)p=100;
  return p+'%';
};

window.fsFindUnitByCardIdV4=function(id){
  if(!id)return null;

  if(typeof heroes!=='undefined'){
    let h=heroes.find(x=>x.id===id);
    if(h)return h;
  }

  if(typeof enemies!=='undefined'){
    let e=enemies.find(x=>x.id===id);
    if(e)return e;
  }

  return null;
};

window.fsInstallHpStyleV4=function(){
  if(document.getElementById('fsHpPctStyleV4'))return;

  let style=document.createElement('style');
  style.id='fsHpPctStyleV4';
  style.textContent=`
    .fs-hp-pct-v4{
      position:absolute;
      right:2px;
      bottom:2px;
      font-size:6px;
      line-height:7px;
      color:#eeeeee;
      background:rgba(0,0,0,.55);
      padding:0 2px;
      border-radius:2px;
      z-index:8;
      pointer-events:none;
      text-shadow:0 0 3px #000;
    }
  `;
  document.head.appendChild(style);
};

window.fsPatchHpPctV4=function(){
  window.fsInstallHpStyleV4();

  let cards=Array.from(document.querySelectorAll('#playerSide .card,#enemySide .card'));

  cards.forEach(card=>{
    if(!card || !card.id)return;

    let u=window.fsFindUnitByCardIdV4(card.id);
    if(!u)return;

    let old=card.querySelector('.fs-hp-pct-v4');
    if(!old){
      old=document.createElement('div');
      old.className='fs-hp-pct-v4';
      card.appendChild(old);
    }

    old.innerText=window.fsHpTextV4(u);
  });
};

/* 包一层 render，保证刷新后还在 */
if(typeof render==='function' && !window.__fsRenderHpPatchV4){
  window.__fsRenderHpPatchV4=true;

  let oldRenderHpPatchV4=render;

  render=function(){
    oldRenderHpPatchV4();

    setTimeout(function(){
      window.fsPatchTreasureButtonsV4();
      window.fsPatchHpPctV4();
    },50);
  };
}

/* 每秒兜底检查一次 */
if(!window.__fsTimerV4){
  window.__fsTimerV4=setInterval(function(){
    window.fsPatchTreasureButtonsV4();
    window.fsPatchHpPctV4();
  },1000);
}

/* 启动一次 */
setTimeout(function(){
  window.fsPatchTreasureButtonsV4();
  window.fsPatchHpPctV4();

  if(typeof render==='function'){
    render();
  }
},120);

/* =========================
   显示优化补丁 V5
   作用：
   1. 血量百分比上移，不挡血条
   2. 修为超过1万显示万，超过1亿显示亿
========================= */

/* ---------- 血量百分比位置修正 ---------- */
window.fsInstallDisplayStyleV5=function(){
  if(document.getElementById('fsDisplayStyleV5'))return;

  let style=document.createElement('style');
  style.id='fsDisplayStyleV5';
  style.textContent=`
    .fs-hp-pct-v4,
    .hp-pct-bf{
      position:absolute !important;
      right:2px !important;
      bottom:13px !important;
      font-size:6px !important;
      line-height:7px !important;
      color:#eeeeee !important;
      background:rgba(0,0,0,.45) !important;
      padding:0 2px !important;
      border-radius:2px !important;
      z-index:20 !important;
      pointer-events:none !important;
      text-shadow:0 0 3px #000 !important;
      opacity:.9 !important;
    }
  `;
  document.head.appendChild(style);
};

/* ---------- 数字显示：万 / 亿 ---------- */
window.fsShortNumV5=function(v){
  let n=Number(v);

  if(!Number.isFinite(n)){
    return v;
  }

  let abs=Math.abs(n);

  function trim(s){
    return String(s).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
  }

  if(abs>=100000000){
    return trim((n/100000000).toFixed(2))+'亿';
  }

  if(abs>=10000){
    return trim((n/10000).toFixed(1))+'万';
  }

  return String(Math.floor(n));
};

window.fsFormatCultTextV5=function(text){
  if(!text || text.indexOf('修为')===-1)return text;

  /* 修为：500000 / 9562412 */
  text=text.replace(/(修为[:：]?\s*)(\d+(?:\.\d+)?)(\s*\/\s*)(\d+(?:\.\d+)?)/g,function(all,a,b,c,d){
    return a+window.fsShortNumV5(b)+c+window.fsShortNumV5(d);
  });

  /* 修为500000000 */
  text=text.replace(/(修为[:：]?\s*)(\d{5,}(?:\.\d+)?)/g,function(all,a,b){
    return a+window.fsShortNumV5(b);
  });

  return text;
};

window.fsPatchCultDisplayV5=function(){
  let root=document.querySelector('.game') || document.body;
  if(!root)return;

  let walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  let nodes=[];

  while(walker.nextNode()){
    nodes.push(walker.currentNode);
  }

  nodes.forEach(node=>{
    let p=node.parentNode;
    if(!p)return;

    let tag=(p.tagName||'').toUpperCase();
    if(tag==='SCRIPT' || tag==='STYLE' || tag==='TEXTAREA' || tag==='INPUT')return;

    let oldText=node.nodeValue;
    let newText=window.fsFormatCultTextV5(oldText);

    if(newText!==oldText){
      node.nodeValue=newText;
    }
  });
};

/* ---------- 包一层资源刷新 ---------- */
if(typeof refreshTopResourceFinal==='function' && !window.__fsRefreshTopPatchV5){
  window.__fsRefreshTopPatchV5=true;

  let oldRefreshTopV5=refreshTopResourceFinal;

  window.refreshTopResourceFinal=function(){
    oldRefreshTopV5();

    setTimeout(function(){
      window.fsInstallDisplayStyleV5();
      window.fsPatchCultDisplayV5();
    },30);
  };

  refreshTopResourceFinal=window.refreshTopResourceFinal;
}

/* ---------- 包一层 render ---------- */
if(typeof render==='function' && !window.__fsRenderDisplayPatchV5){
  window.__fsRenderDisplayPatchV5=true;

  let oldRenderDisplayV5=render;

  render=function(){
    oldRenderDisplayV5();

    setTimeout(function(){
      window.fsInstallDisplayStyleV5();

      if(typeof fsPatchHpPctV4==='function'){
        fsPatchHpPctV4();
      }

      window.fsPatchCultDisplayV5();
    },60);
  };
}

/* ---------- 每秒兜底修一次显示 ---------- */
if(!window.__fsDisplayTimerV5){
  window.__fsDisplayTimerV5=setInterval(function(){
    window.fsInstallDisplayStyleV5();

    if(typeof fsPatchHpPctV4==='function'){
      fsPatchHpPctV4();
    }

    window.fsPatchCultDisplayV5();
  },1000);
}

/* ---------- 启动一次 ---------- */
setTimeout(function(){
  window.fsInstallDisplayStyleV5();

  if(typeof fsPatchHpPctV4==='function'){
    fsPatchHpPctV4();
  }

  window.fsPatchCultDisplayV5();

  if(typeof render==='function'){
    render();
  }
},120);

/* =========================
   关闭血量百分比显示 V6
   作用：
   1. 不再显示 100% / 80% 这种血量百分比
   2. 只保留原来的细血条
   3. 不影响法宝连升、不影响战斗、不影响资源显示
========================= */

window.fsHideHpPercentV6=function(){
  let style=document.getElementById('fsHideHpPercentStyleV6');

  if(!style){
    style=document.createElement('style');
    style.id='fsHideHpPercentStyleV6';
    style.textContent=`
      .fs-hp-pct-v4,
      .hp-pct-bf{
        display:none !important;
        opacity:0 !important;
        pointer-events:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  document.querySelectorAll('.fs-hp-pct-v4,.hp-pct-bf').forEach(el=>{
    el.remove();
  });
};

/* 把之前补血量百分比的函数改成空函数，防止它又生成 */
window.fsPatchHpPctV4=function(){
  window.fsHideHpPercentV6();
};

window.bfHpPct=function(){
  return '';
};

/* 包一层 render，每次刷新后都删掉百分比 */
if(typeof render==='function' && !window.__fsHideHpPercentRenderV6){
  window.__fsHideHpPercentRenderV6=true;

  let oldRenderHideHpPercentV6=render;

  render=function(){
    oldRenderHideHpPercentV6();

    setTimeout(function(){
      window.fsHideHpPercentV6();
    },30);
  };
}

/* 启动一次 */
setTimeout(function(){
  window.fsHideHpPercentV6();

  if(typeof render==='function'){
    render();
  }
},100);

})();