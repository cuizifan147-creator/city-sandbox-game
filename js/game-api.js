// ============================================================
// game-api.js — 城市建造游戏 模组 API（开源模组开发者专用）
//
// 加载顺序：本文件 → 游戏主体脚本 → js/mods/*.js 模组文件
// 模组就是普通 JS 文件：在 city3d.html 里加一行
//     <script src="js/mods/你的模组.js"></script>
// 即可被加载，无需构建工具，双击打开游戏即可用。
//
// 核心能力：
//   GameMod.registerTile(...)   注册新建筑（自动加“建筑”菜单按钮）
//   GameMod.registerUnit(...)   注册新兵种（自动加“军队”菜单按钮，可框选指挥）
//   GameMod.events.on/emit      事件总线（placed/demolished/secondTick/captured/...）
//   GameMod.addBuildButton(...) 手动添加建筑按钮
//   GameMod.helpers             常用工具（vox 积木、统计、飘字、报错）
// 详细文档见 docs/MODDING.md
// ============================================================
(function () {
  'use strict';

  // ---- 事件总线 ----
  const listeners = {};
  const events = {
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
      return () => events.off(event, fn);
    },
    off(event, fn) {
      const arr = listeners[event];
      if (arr) {
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      }
    },
    emit(event, payload) {
      const arr = listeners[event];
      if (arr) {
        for (const fn of arr.slice()) {
          try {
            fn(payload);
          } catch (err) {
            console.error('[GameMod] 事件处理器出错：' + event, err);
          }
        }
      }
    },
  };

  // ---- 方块（建筑）注册 ----
  const tileBuilders = {};          // num -> builder(group, r, c)
  const tileRoadRequired = new Set();
  let nextTileNum = 100;            // 模组方块编号从 100 起，避免与官方 0~17 冲突

  // ---- 单位注册 ----
  const unitDefs = {};              // key -> 单位定义

  // 注册新建筑：立即写入核心查表并生效
  function registerTile(opts) {
    if (!opts || !opts.key || !opts.name) {
      console.error('[GameMod] registerTile 缺少 key/name');
      return -1;
    }
    const num = opts.num || nextTileNum++;
    TILE[opts.key] = num;
    TILE_NAMES[num] = opts.name;
    if (opts.style) BUILDING_STYLE[num] = opts.style;
    if (opts.cost != null) BUILDING_COST[num] = opts.cost;
    if (opts.powerUse != null) POWER_USE[num] = opts.powerUse;
    if (opts.hp != null) AI_BUILDING_HP[num] = opts.hp;
    if (opts.needsRoad) {
      if (typeof MOD_TILE_ROAD_REQUIRED !== 'undefined') MOD_TILE_ROAD_REQUIRED.add(num);
      tileRoadRequired.add(num);
    }
    if (opts.builder) {
      // 同时写入核心建造器表（createTileMesh 从这里取模组模型）
      if (typeof MOD_TILE_BUILDERS !== 'undefined') MOD_TILE_BUILDERS[num] = opts.builder;
      tileBuilders[num] = opts.builder;
    }
    if (opts.button) addBuildButton({ ...opts.button, num });
    events.emit('tileRegistered', { key: opts.key, num });
    return num;
  }

  // 注册新兵种：从军营招募，自动加入军队菜单，可框选指挥、参与占领
  function registerUnit(opts) {
    if (!opts || !opts.key) {
      console.error('[GameMod] registerUnit 缺少 key');
      return null;
    }
    unitDefs[opts.key] = opts;
    if (opts.button) addArmyButton({ ...opts.button, key: opts.key });
    events.emit('unitRegistered', { key: opts.key });
    return opts.key;
  }

  // 在“🏗️ 建筑”面板添加按钮（绑定与官方按钮相同的行为）
  function addBuildButton(opts) {
    const panel = document.getElementById('build-panel');
    if (!panel) return;
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.dataset.type = String(opts.num);
    btn.textContent = (opts.icon ? opts.icon + ' ' : '') + opts.label;
    if (opts.color) btn.style.background = opts.color;
    panel.appendChild(btn);
    if (typeof bindToolButton === 'function') bindToolButton(btn);
  }

  // 在“🎖️ 军队”面板添加招募按钮
  function addArmyButton(opts) {
    const panel = document.getElementById('army-panel');
    if (!panel) return;
    const btn = document.createElement('button');
    btn.className = 'army-btn';
    btn.textContent = (opts.icon ? opts.icon + ' ' : '') + opts.label;
    if (opts.color) btn.style.background = opts.color;
    btn.addEventListener('click', () => recruitModUnit(opts.key));
    panel.appendChild(btn);
  }

  // 招募模组单位：复用核心军队系统（需军营、扣军费、可框选、参与占领与夺回）
  function recruitModUnit(key) {
    const def = unitDefs[key];
    if (!def) return;
    const barracksCells = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (map[r][c] === TILE.BARRACKS) barracksCells.push({ r, c });
      }
    }
    if (barracksCells.length === 0) {
      if (typeof showError === 'function') showError('❌ 需要先建造军营');
      return;
    }
    if (money < def.cost) {
      if (typeof showError === 'function') showError('❌ 金钱不足');
      return;
    }
    money -= def.cost;
    const g = def.model();
    const cell = barracksCells[Math.floor(Math.random() * barracksCells.length)];
    const x = cell.c * CELL + CELL / 2;
    const z = cell.r * CELL + CELL / 2;
    g.position.set(x, 0, z);
    scene.add(g);
    // 自动补上选中光环与点击球（模型自带则跳过）
    if (!g.userData.hit) {
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(2.4, 8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      g.add(hit);
      g.userData.hit = hit;
    }
    if (!g.userData.ring) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.12, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      ring.visible = false;
      g.add(ring);
      g.userData.ring = ring;
    }
    const s = {
      group: g,
      kind: def.key,
      hp: def.hp, maxHp: def.hp, damage: def.damage,
      speed: def.speed, range: def.range, cooldownMax: def.cooldown,
      upkeep: def.upkeep,
      mode: 'idle',
      targetX: x, targetZ: z,
      target: null, targetCell: null, targetWall: null, cooldown: 0,
      guideLine: typeof makeGuideLine === 'function' ? makeGuideLine() : null,
    };
    soldiers.push(s);
    if (typeof selectSoldier === 'function') selectSoldier(s, true);
    events.emit('unitRecruited', { key, unit: s });
  }

  // 模组常用工具（运行时取核心函数，避免加载顺序问题）
  const helpers = {
    vox: (...a) => vox(...a),
    countTiles: (t) => countTilesOf(t),
    cellAtWorld: (x, z) => cellAtWorld(x, z),
    spawnFloatText: (...a) => spawnFloatText(...a),
    showError: (m) => showError(m),
    status: (m) => { statusEl.textContent = m; },
  };

  window.GameMod = {
    events,
    registerTile,
    registerUnit,
    addBuildButton,
    addArmyButton,
    recruitModUnit,
    helpers,
    get tileBuilders() { return tileBuilders; },
    get tileRoadRequired() { return tileRoadRequired; },
    get unitDefs() { return unitDefs; },
  };
})();
