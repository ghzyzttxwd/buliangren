# v0.7 Art Assets

正式美术统一放在本目录，不使用网络热链。

规划目录：

```text
assets/art/
  characters/
    portraits/
    battle/
    cutins/
  backgrounds/
    world/
    locations/
    battle/
  effects/
    skills/
    status/
    ui/
  items/
  references/
```

Git 不保留空目录，因此目录在第一张对应正式资源入库时创建。

规则：

- 正式资源登记到 `src/art.js`；
- 来源记录到 `docs/v0.7美术资源来源表.md`；
- 正式资源不得引用外部 URL；
- 缺图时必须使用现有 CSS / 文字 fallback，不阻断游戏；
- 优先 WebP，确需透明 PNG 时再使用 PNG；
- 不把仅供参考的版权图片混入正式资源目录。
