// ============================================================
// example-mod.js — 示例模组（新模组开发者照这个写即可）
//
// 演示内容：
//   1. 新建筑：🌳 公园（装饰 + 产出少量科技值）
//   2. 新兵种：🎯 狙击手（远程高伤低血）
//   3. 事件监听：建成公园播报 / 占领 AI 建筑提示
//
// 用法：本文件已通过 city3d.html 底部的 <script> 标签加载；
//       新模组复制本文件改名后，再加一行 script 标签即可。
// ============================================================
(function () {
  'use strict';
  if (!window.GameMod) {
    console.warn('[示例模组] 未找到 GameMod API（请确认 js/game-api.js 先加载）');
    return;
  }
  const vox = GameMod.helpers.vox;

  // ---------- 1) 新建筑：公园 ----------
  GameMod.registerTile({
    key: 'PARK',
    num: 100,                    // 模组方块编号建议从 100 开始（官方占用 0~17）
    name: '公园',
    style: { h: 1, color: 0x4ade80 },
    cost: 120,                   // 造价
    powerUse: 0,                 // 耗电
    hp: 150,                     // AI 侧血量（被占领/摧毁用）
    needsRoad: false,            // 不需要临路
    button: { icon: '🌳', label: '公园', color: '#4ade80' },
    builder: function (group, r, c) {
      vox(group, 9.4, 0.25, 9.4, 0x65a30d, 0, 0.125, 0);          // 草地
      const spots = [[-3, -3], [3, 3], [-3, 3], [3, -3], [0, 0]];
      for (let i = 0; i < spots.length; i++) {
        vox(group, 0.6, 1.8, 0.6, 0x6d4c2f, spots[i][0], 0.9, spots[i][1]);   // 树干
        vox(group, 2.2, 1.8, 2.2, 0x15803d, spots[i][0], 2.7, spots[i][1]);   // 树冠
      }
      vox(group, 2.4, 0.3, 0.7, 0x92400e, 0, 0.6, -1.6);          // 长椅
      vox(group, 2.4, 0.8, 0.15, 0x92400e, 0, 1.0, -1.6);
    },
  });

  // 公园产出科技值（借助每 0.5 秒一次的全局节拍事件）
  GameMod.events.on('secondTick', () => {
    science += GameMod.helpers.countTiles(TILE.PARK) * 0.02;
  });

  // ---------- 2) 新兵种：狙击手 ----------
  GameMod.registerUnit({
    key: 'sniper',
    name: '狙击手',
    cost: 300,                   // 招募费
    upkeep: 1.2,                 // 军费 元/秒
    hp: 60,
    damage: 90,
    speed: 5,
    range: 10,                   // 超远射程
    cooldown: 2.0,               // 射速慢
    button: { icon: '🎯', label: '招募狙击手（300元）', color: '#1e3a8a' },
    model: function () {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 1.0, 8),
        new THREE.MeshLambertMaterial({ color: 0x1e3a8a })
      );
      body.position.y = 0.5;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xfcd9b8 })
      );
      head.position.y = 1.25;
      const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 2.2),
        new THREE.MeshLambertMaterial({ color: 0x111827 })
      );
      gun.position.set(0.5, 1.0, 0.3);
      g.add(body, head, gun);
      return g;                  // 光环/点击球由 API 自动补上
    },
  });

  // ---------- 3) 事件监听示例 ----------
  GameMod.events.on('placed', (p) => {
    if (p.type === TILE.PARK) {
      GameMod.helpers.status('🌳 公园落成，市民多了一处休闲地！');
    }
  });
  GameMod.events.on('captured', () => {
    GameMod.helpers.status('🚩 占领成功，模组向你问好！');
  });
  GameMod.events.on('wallDestroyed', (p) => {
    GameMod.helpers.status('💥 模组播报：' + (p.side === 'own' ? '我方' : 'AI') + '的一段围墙被坦克轰塌！');
  });

  console.log('[示例模组] 已加载：🌳 公园 + 🎯 狙击手');
})();
