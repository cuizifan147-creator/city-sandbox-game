# 🧩 模组开发文档（MODDING.md）

游戏内置了类似《我的世界》的轻量模组系统。模组是**普通 JS 文件**，通过 `<script>` 标签加载（无需构建工具），可以：

- 注册新建筑（自动出现在"🏗️ 建筑"菜单）
- 注册新兵种（自动出现在"🎖️ 军队"菜单，可框选指挥）
- 监听游戏事件（放置/拆除/占领/每秒节拍……）
- 调用核心工具（体素积木、统计、飘字、报错）

## 目录约定

```
js/mods/你的模组.js      ← 模组文件
city3d.html              ← 底部加一行 <script src="js/mods/你的模组.js"></script>
```

## 1. 注册新建筑

```js
GameMod.registerTile({
  key: 'BANK',            // 唯一键名（会挂到全局 TILE.BANK 上）
  num: 200,               // 方块编号，建议从 100 开始（官方占用 0~17）
  name: '银行',           // 显示名
  style: { h: 8, color: 0xfacc15 },   // 占位样式（逻辑用的高度/颜色）
  cost: 500,              // 造价（默认 0）
  powerUse: 1,            // 耗电/格（默认 0）
  hp: 300,                // AI 侧血量（默认 100）
  needsRoad: true,        // 是否必须临路（默认 false）
  button: { icon: '🏦', label: '银行', color: '#facc15' },  // 可选：自动加菜单按钮
  builder: function (group, r, c) {
    // 用体素积木拼建筑，坐标系：格中心为原点，地面 y=0，一格 10×10 单位
    GameMod.helpers.vox(group, 9, 7, 9, 0xfacc15, 0, 3.5, 0);
  },
});
```

`builder(group, r, c)` 里可用 `GameMod.helpers.vox(parent, w, h, d, color, x, y, z, tiltX)` 逐块拼模型；返回值无要求，直接往 group 里加即可。

**放置规则**：非道路方块默认不限制位置；`needsRoad: true` 的方块会要求旁边有路（与官方住宅一致）。`num` 建议 ≥100 避免与官方冲突。

## 2. 注册新兵种

```js
GameMod.registerUnit({
  key: 'archer',
  cost: 200,              // 招募费
  upkeep: 0.9,            // 军费 元/秒
  hp: 70,
  damage: 40,
  speed: 5.5,             // 移动速度 单位/秒
  range: 9,               // 攻击/占领距离
  cooldown: 1.2,          // 攻击间隔（秒）
  button: { icon: '🏹', label: '招募弓箭手（200元）', color: '#7c2d12' },
  model: function () {
    // 返回 THREE.Group；选中光环和点击球会自动补上
    const g = new THREE.Group();
    // ...拼模型...
    return g;
  },
});
```

注册后：需要军营才能招募（与官方一致）、参与框选/移动/攻击敌军/占领 AI 建筑、军费每秒扣 `upkeep`、受伤可在医院附近回血。单位在核心数组 `soldiers` 中管理，`s.kind` 为注册的 `key`。

## 3. 事件总线

```js
GameMod.events.on('事件名', (payload) => { ... });
```

| 事件 | payload | 触发时机 |
|---|---|---|
| `placed` | `{ type, r, c }` | 成功放置建筑 |
| `demolished` | `{ type, r, c }` | 成功拆除建筑 |
| `secondTick` | `{ money, population, food, sick, science }` | 每 0.5 秒一次（全局节拍） |
| `captured` | `{ r, c, type }` | 彻底占领 AI 建筑 |
| `wallDestroyed` | `{ side, r, c }` | 坦克摧毁围墙 |
| `unitRecruited` | `{ key, unit }` | 模组单位被招募 |
| `tileRegistered` / `unitRegistered` | `{ key, num }` / `{ key }` | 注册完成 |

`on()` 返回取消监听的函数；处理器抛错不会中断游戏（错误打印到控制台）。

## 4. 常用工具（GameMod.helpers）

| 工具 | 说明 |
|---|---|
| `vox(parent, w, h, d, color, x, y, z, tilt)` | 体素积木助手 |
| `countTiles(type)` | 统计某方块数量 |
| `cellAtWorld(x, z)` | 世界坐标 → 格子 `{side, r, c, isWall}` |
| `spawnFloatText(text, x, z, color)` | 3D 飘字 |
| `showError(msg)` | 屏幕中央大字提示 |
| `status(msg)` | 底部状态栏文字 |

## 5. 直接使用核心全局变量（进阶）

核心脚本与模组共享全局作用域，可直接访问：`TILE`、`map`、`money`、`population`、`food`、`sick`、`science`、`soldiers`、`scene`、`GRID_COLS` 等。**注意**：这些是内部变量，可能随版本变化——尽量优先使用上面文档化的 API。

## 6. 模组自检清单

- [ ] `node --check js/mods/你的模组.js` 通过
- [ ] 在 `city3d.html` 底部添加了 script 标签
- [ ] 建筑/兵种能在菜单中出现并可正常放置/招募
- [ ] 事件监听不会抛错（控制台无报错）
- [ ] `num` 编号不与官方（0~17）及其他模组冲突

祝开发愉快！🎉
