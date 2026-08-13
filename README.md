# 不良人：江湖行（Prototype v0.1）

私人非商业同人网页游戏原型。目标是做成“手机打开像 App”的单机 PWA：地点式江湖探索 + 队伍养成 + 武学系统 + 回合制战斗 + 本地存档。

## 当前可玩内容

- 手机优先的全屏 UI
- 渝州城、藏兵谷、岐国、娆疆四个地点占位
- 主角 + 蚩梦初始同行；女帝、降臣角色卡预置
- 4 门初始武学，数据驱动
- 第一场玄冥教探子战斗
- 藏兵谷第二场战斗
- 主线解锁逻辑
- 银两、阅历、任务日志
- `localStorage` 自动存档
- PWA manifest + 离线缓存
- GitHub Pages 自动部署工作流

## 本地运行

不要直接双击 `index.html`（Service Worker 和 ES Module 在 `file://` 下可能受限）。在目录中执行：

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## GitHub Pages

1. 仓库：`buliangren`。
2. 把本项目全部文件放入仓库根目录并推送到 `main`。
3. GitHub 仓库 Settings → Pages → Source 选择 **GitHub Actions**。
4. 以后每次改动并推送到 `main`，工作流会自动发布新版网页。

## 结构

```text
buliangren/
├── index.html
├── styles.css
├── manifest.webmanifest
├── sw.js
├── src/
│   ├── app.js       # 页面、剧情交互
│   ├── battle.js    # 回合制战斗核心
│   ├── data.js      # 人物、武学、地图、物品
│   └── state.js     # 本地存档
├── assets/
│   └── icon.svg
└── .github/workflows/pages.yml
```

## 下一阶段建议

1. 真正的角色立绘与场景背景资源层。
2. 女帝招募线、蚩梦专属线、降臣支线。
3. 内功/招式/绝技的升级、突破与残篇系统。
4. 装备可穿戴、属性计算、掉落表。
5. 战斗状态效果：毒、眩晕、护盾、内力。
6. 序章 Boss（黑无常）与完整章节结算。

> 本项目为私人非商业同人原型，不包含官方美术资源。
