# Context Log

## 2026-03-28 Iteration BG（合并后稳定性收口：验收脚本适配标题页）

### 任务目标
- 完成 `github/main` 合并后，恢复验收脚本稳定性，确保自动回归可持续使用。

### 本轮完成
1. 根因定位：
   - 验收脚本首步失败并非玩法损坏，而是新增标题页覆盖层导致“未先关标题页就点新游戏”。
   - 另一个失败点来自开局剧情 `state.choice` 残留拦截按键交互。
2. 脚本修复：
   - `scripts/acceptance-interaction.mjs` 新增 `dismissTitleScreenIfNeeded()`，在开测前自动关闭标题页。
   - 页面加载等待从 `networkidle2` 调整为 `domcontentloaded`，避免资源请求导致的首步超时。
   - NPC 自动立绘用例增加前置清场（`state.scene/state.choice/state.vnActive`），恢复可交互状态。
3. 结果验证：
   - `node scripts/acceptance-interaction.mjs`：`passed=6 failed=0`。

### 关键文件
- `E:/Ai/Vibecoding_Game/scripts/acceptance-interaction.mjs`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration BE（外部工具包使用规则同步）

### 任务目标
- 将 `ai-game-jam-toolkit` 的可用部分纳入现有协作协议，避免“全盘照搬”造成流程冲突。

### 本轮完成
1. 协作协议补充外部规则：
   - 允许吸收 `prompts/*.md`、`ccg/consensus-gate.md`、`tips/vibecoding-speedrun.md`。
2. 使用边界固化：
   - `consensus-gate` 仅用于架构/重构/复杂 bug，不扩大到日常小改。
   - 明确禁止使用 `git checkout .`。
   - 明确当前项目不做引擎迁移，仅吸收 prompt 与协作方法。

### 关键文件
- `E:/Ai/Vibecoding_Game/docs/ai-collab-protocol.md`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration BF（菜单内剧情立绘可见性修复）

### 任务目标
- 解决“打开游戏内菜单后看不到主角剧情立绘”的体验断层。

### 本轮完成
1. 菜单内新增剧情焦点卡：
   - 在 `inGameMenu` 头部下方新增“剧情立绘 + 名称 + 台词”紧凑卡片。
2. 渲染逻辑复用：
   - `renderStoryPortraitPanel` 改为一份 `storyFocus` 同步驱动“侧栏剧情卡 + 菜单剧情卡”。
3. 主角立绘优先级修复：
   - 玩家说话时优先使用 `playerPortrait.activeKey`，再回退到 `player`。
4. 缓存刷新：
   - 资源版本号升级到 `v=20260328m`，避免浏览器继续加载旧菜单结构。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/ui-panels.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration BD（黄金10分钟：美术需求单拆解）

### 任务目标
- 将“黄金10分钟”涉及的关键精灵与神兽视觉资产，整理为可直接执行的美术需求单。
- 明确程序与美术边界，避免边做边改造成返工。

### 本轮完成
1. 新增美术需求文档：
   - `docs/art-brief-golden10-legendary.md`
2. 需求覆盖：
   - 两大神兽完全体 + 幼体
   - 融合教学素材精灵（地面系 + 有翼系）
   - 吞噬教学“传说兽 + 神剑”关键立绘
   - 开场20秒演出的关键帧（P1）
3. 规则固化：
   - 教学借用体回收、出村后必遇必捕幼体、神兽预设资源优先（非实时生图）。

### 关键文件
- `E:/Ai/Vibecoding_Game/docs/art-brief-golden10-legendary.md`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration BC（发版安全收口：关闭 QA 开关）

### 任务目标
- 避免正式玩家继承 QA 初始资源，确保发版环境公平与稳定。

### 本轮完成
1. 配置收口：
   - 将 `config/balance-config.json` 中 `qa.enabled` 从 `true` 调整为 `false`。
2. 兼容策略：
   - 保留其它 QA 参数（热键/补给/动画倍率）用于后续内测，需时仅重新开启 `qa.enabled` 即可。

### 关键文件
- `E:/Ai/Vibecoding_Game/config/balance-config.json`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration BB（测试协作与关键卡点修复）

### 任务目标
- 与玩家测试 Agent 建立固定沟通规范，提升回归效率。
- 修复主线卡点（家园设施不可见）与战斗易用性问题（缺少道具快捷入口）。
- 加入可控 QA 便利设置，降低自动化与人工测试成本。

### 本轮完成
1. 主线卡点修复：
   - 家园 6 个设施 NPC 从硬编码隐藏改为可见条件判断（主线阶段 >= 1）。
   - 新增 QA 可选项，允许测试环境强制提前显示家园设施。
2. 战斗道具快捷入口：
   - 战斗面板新增 `使用道具` 按钮。
   - 支持“单项直用 / 多项弹出选择”的战斗内道具流程。
   - 战斗中新增 `I` 快捷键打开道具选择。
3. QA 便利配置：
   - `balance-config` 新增 `qa` 配置块（动画倍率、热键、开新档补给、家园设施显示策略）。
   - 新增 `F6` 快捷补给（补球/药品 + 全仓状态恢复）。
4. 协作文档：
   - 新增 `docs/player-test-agent-protocol.md`，沉淀测试节奏、缺陷模板、优先级与回归门禁。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/battle-system.js`
- `E:/Ai/Vibecoding_Game/src/game/ui-panels.js`
- `E:/Ai/Vibecoding_Game/src/game/balance-config.js`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/config/balance-config.json`
- `E:/Ai/Vibecoding_Game/docs/player-test-agent-protocol.md`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration BA（前端设计系统落地第四轮：导航语义与路径提示增强）

### 任务目标
- 进一步降低菜单认知成本，确保玩家随时知道“当前在哪个主分类/子页面”。
- 延续“主分类语义对齐”并增强路径可读性。

### 本轮完成
1. 导航路径提示：
   - 菜单头部新增路径文本（如 `工坊 / 进化工坊`），实时反映当前位置。
2. 主分类完善：
   - 一级导航补齐 `工坊(R)`，与快捷键和二级入口语义对齐。
3. 二级栏逻辑收口：
   - 二级入口只在 `工坊` 主分类下显示，其他主分类自动隐藏。
4. 缓存刷新：
   - 资源版本号升级到 `v=20260328d`。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration AZ（前端设计系统落地第三轮：主分类语义对齐）

### 任务目标
- 修复“一级导航与当前页面语义不一致”的认知问题。
- 让菜单导航符合“主分类 -> 子页”的清晰心智模型。

### 本轮完成
1. 主分类补齐：
   - 一级导航新增 `工坊(R)`，作为 `家园仓库/进化工坊/立绘工坊` 的上层分类。
2. 激活态逻辑重构：
   - 一级导航按“分类”高亮，不再仅按具体面板 ID 比较。
   - 二级导航仅高亮当前子页。
3. 二级栏条件显示：
   - 仅在 `工坊` 分类下展示二级入口；其余分类自动隐藏，减少视觉噪声。
4. 缓存刷新：
   - 资源版本号升级到 `v=20260328c`。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration AY（前端设计系统落地第二轮：菜单信息架构重构）

### 任务目标
- 将菜单从“横向多标签平铺”升级为“一级主导航 + 二级功能入口 + 内容区”的游戏化结构。
- 进一步贴近端游 RPG/宝可梦式菜单心智模型，降低信息拥挤感。

### 本轮完成
1. 菜单骨架重构：
   - 新结构：左侧一级导航（背包/队伍/图鉴/设置）+ 右侧内容区。
   - 二级功能入口（家园仓库/进化工坊/立绘工坊）放在内容区顶部。
2. 事件与状态联动：
   - `world-events.js` 改造菜单点击绑定逻辑，支持一级/二级入口统一切页。
   - 面板标题从统一映射表读取，避免依赖 DOM 查找。
3. 样式模板升级：
   - 新增主导航按钮样式（含快捷键 kicker 与激活态）。
   - 新增内容区与二级入口样式，保留既有业务面板复用。
4. 缓存刷新：
   - 资源版本号升级为 `v=20260328b`，确保浏览器拉取新结构。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration AX（前端设计系统落地第一轮：Token 化 + 菜单模板收口）

### 任务目标
- 将 `docs/ui-style-guide.md` 从规则文档推进到样式层实际落地。
- 优先收口“颜色/按钮/焦点态/菜单尺寸模板”四个高感知差异点。

### 本轮完成
1. Design Tokens 接线：
   - 在 `:root` 新增 `--ds-*` 变量（世界背景、表面层、强调色、文本色、阴影、圆角）。
   - 旧变量映射到新 token，降低一次性全量改造风险。
2. 菜单模板收口（PC）：
   - 游戏菜单从“铺满容器”改为“中尺寸浮层模板”（约 `82%` 高，保留世界可见）。
   - 菜单遮罩透明度与模糊降低，弱化后台页感，强化“仍在游戏中”感知。
3. 组件规范落地：
   - 统一 `action/secondary/mini` 按钮边框、hover、disabled 视觉逻辑。
   - 统一 HUD 快捷按钮色系与对比度。
   - 焦点态改为统一 `--ds-accent-focus`。
4. 响应式补齐：
   - 在窄宽/低高视口下限制菜单高度，避免继续出现“全屏压迫感”。

### 关键文件
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration AU（游戏内菜单重构：从网页卡片到画布内原生菜单）

### 任务目标
- 将功能面板从页面外部卡片彻底重构为“游戏画面内”的原生菜单层。
- 统一 `B/T/Y/R` 与 HUD 点击行为，避免玩家在前 10 分钟内因交互路径分裂而流失。

### 本轮完成
1. 结构重构：
   - 在 `canvas-frame` 内新增 `inGameMenuOverlay`（标题栏 + 标签页 + 内容视窗）。
   - 保留旧 `utility-panel` 业务节点，但在运行时迁移到新菜单视窗，减少逻辑重写风险。
2. 交互统一：
   - `B/T/Y/R` 全部改为打开游戏内菜单对应标签。
   - `Esc` 可立即关闭游戏内菜单。
   - 菜单打开时屏蔽移动与交互输入，避免误操作。
3. 视觉重构：
   - 新增画布内菜单样式（遮罩、标签激活态、独立滚动区）。
   - 移除旧 `body.in-game-ui-panel-open` 方案。
   - 旧 `functionCard` 迁移后自动隐藏，不再作为主交互入口。
4. 缓存刷新：
   - 将 `index.html` 资源版本号升级到 `v=20260328a`，避免浏览器继续加载旧布局。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration AV（PC 前端设计系统 v0.1 制定）

### 任务目标
- 为项目建立统一前端设计系统，覆盖视觉原则、色彩基调、组件规范、布局模板、交互规则。
- 解决“模块各做各的”导致的风格割裂与游戏感不足问题。

### 本轮完成
1. 新增设计系统文档：
   - `docs/ui-style-guide.md`
2. 文档覆盖范围：
   - 视觉原则（沉浸优先、层级清晰、操作导向）
   - 色彩 Token（品牌色、中性色、状态色）
   - 排版/间距/圆角/阴影统一规范
   - 核心组件规范（按钮、Tab、列表、面板、对话框）
   - PC 布局模板（探索 HUD / 系统菜单 / 战斗 HUD / 对话演出）
   - 输入与动效规则（键位映射、时长区间、反馈闭环）
   - 可访问性底线与工程落地规则
3. 执行路线：
   - 文档给出三阶段落地顺序（token 抽离 -> 骨架重构 -> 动效统一）。

### 关键文件
- `E:/Ai/Vibecoding_Game/docs/ui-style-guide.md`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-28 Iteration AW（美术并行协作协议落地）

### 任务目标
- 建立“另一个 AI 做立绘素材与风格设计”时的稳定协作机制。
- 明确沟通路径与记录落点，避免多 AI 并行时信息丢失。

### 本轮完成
1. 新增美术协作文档：
   - `docs/ai-art-collab-protocol.md`
   - 定义角色边界、交接包模板、资源命名与落盘规范。
2. 新增素材记录台账：
   - `docs/art-asset-log.md`
   - 作为每次美术交付的固定登记位置。
3. 固化同步规则：
   - 关键决策/改动摘要写入 `docs/context-log.md`
   - 素材批次细节写入 `docs/art-asset-log.md`

### 关键文件
- `E:/Ai/Vibecoding_Game/docs/ai-art-collab-protocol.md`
- `E:/Ai/Vibecoding_Game/docs/art-asset-log.md`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-26 Iteration AS（早期数值微调：草地等级 & 金币倍率）

### 任务目标
- 仅通过 `config/balance-config.json` 改善 Lv.5 玩家在草地区域的体验，不碰任何 JS 文件。

### 修改内容
| 参数 | 原值 | 新值 | 原因 |
|---|---|---|---|
| `wildLevelOffsetByMap.meadow` | 0 | -2 | 草地基础等级 Lv.4–7，Lv.5 玩家面对 Lv.7 野怪压力过大；偏移后上限降至 Lv.5，可稳定通过 |
| `economy.battleCoinMultiplier` | 1 | 1.2 | 弥补初期补给不足，使金币收益提升 20%，鼓励玩家回城补充物品 |

### 风险点
- 草地若日后设计为"升级刷怪地"，offset -2 会使刷怪效率偏低，届时应还原为 0 并对应调高基础等级。
- battleCoinMultiplier 叠加在 globals.js 的原始奖励值上；若基础奖励已被上调，需评估两者叠加是否导致经济失衡。

### 回滚方法
将 `config/balance-config.json` 中以下字段还原：
```json
"meadow": 0,
"battleCoinMultiplier": 1
```

### 涉及文件
- `config/balance-config.json`（唯一修改文件）

---

## 2026-03-27 Iteration AR（数值解耦模块：外置配置 + 运行时兜底）

### 任务目标
- 将核心可调数值从主玩法逻辑拆分为独立模块，支持并行调参。
- 确保调参错误不会影响主流程可玩性。

### 本轮完成
1. 新增独立数值模块：
   - `src/game/balance-config.js`
   - 提供统一读取接口与运行时校验。
2. 外置配置文件：
   - `config/balance-config.json`
   - 支持野怪等级偏移、训练师等级偏移、商店价格倍率、出售倍率、战斗金币倍率。
3. 运行时容错：
   - 配置加载失败/字段非法自动回退默认值。
   - 允许后续通过 `localStorage(gbit_balance_config_v1)` 做本地覆盖。
4. 接线范围：
   - 野怪等级与训练师等级计算接入平衡配置。
   - 商店购买价、出售价、战斗金币奖励接入倍率。
5. 文档化：
   - 新增 `docs/balance-config.md`，明确调参与回归流程。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/balance-config.js`
- `E:/Ai/Vibecoding_Game/config/balance-config.json`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/battle-system.js`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/docs/balance-config.md`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-27 Iteration AQ（身份系统强化：开局命名链 + 名牌体系 + 命名卡）

### 任务目标
- 按“宝可梦式代入”升级开局与身份表达：
  - 开始菜单恢复四入口。
  - 开局命名扩展为“名称 + 称号 + 口头禅”。
  - 地图角色名牌可视化并增加职业识别。
  - 重要对话支持主角名高亮。
  - 新手战后发放命名卡，商店可购买补充。

### 本轮完成
1. 开始菜单与设置：
   - 恢复 `开始游戏 / 继续游戏 / 选择存档 / 游戏设置` 四入口。
   - 游戏设置新增：
     - 玩家名显示策略：`始终显示 / 靠近 NPC / 仅互动`
     - 默认称号（新开局预填）
     - 默认口头禅（新开局预填）
     - 主角名高亮开关
2. 开局命名链：
   - 点击新游戏后依次弹窗：训练家名称 -> 称号 -> 口头禅。
   - 名称取消会中止新开档；称号/口头禅取消回退到默认值。
   - 新身份写入存档与设置默认名，保证后续称呼一致。
3. 名牌与职业色条：
   - 玩家与 NPC 脚下均显示名牌。
   - NPC 名牌新增职业色条（导师/商店/道馆/反派等），强化识别。
   - 玩家名牌受“显示策略”控制（始终/靠近/仅互动）。
4. 对话沉浸增强：
   - 对话日志新增主角名高亮样式（可在设置开关）。
   - NPC 交互开场对白改为按身份差异化称呼（含称号与口头禅引用）。
5. 命名卡机制：
   - 新手教学战胜利后发放 `命名卡 x1`。
   - 商店新增 `命名卡` 可购买。
   - 背包使用命名卡可重设“名称 + 称号 + 口头禅”。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/ui-panels.js`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/bootstrap-ai.js`
- `E:/Ai/Vibecoding_Game/src/game/battle-system.js`
- `E:/Ai/Vibecoding_Game/styles.css`

## 2026-03-27 Iteration AP（开局命名仪式 + 角色脚下姓名标签）

### 任务目标
- 将命名流程改为“点击开始新游戏后立刻命名”，提升开局代入感。
- 让玩家与 NPC 名称在地图上可见并随移动更新。

### 本轮完成
1. 开始菜单流程调整：
   - 移除开局菜单中的 `游戏设置` 入口与内嵌命名输入区域。
   - 点击 `开始游戏`（含槽位新建）后，弹出命名输入框。
   - 命名取消会中止开档；确认后写入新存档并应用到开局引导。
2. 名称渲染增强：
   - 新增地图角色姓名标签绘制函数。
   - 玩家与所有可见 NPC 脚下显示姓名，并随角色移动实时更新。
3. 交互称呼增强：
   - 与 NPC 交互时增加带主角名的开场称呼行，强化代入。
4. 回归脚本修复：
   - 交互验收脚本新增 `prompt` 自动应答，避免开局命名弹窗导致超时。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/scripts/acceptance-interaction.mjs`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-27 Iteration AO（主角立绘入口统一：仅教学战后）

### 任务目标
- 修复主角立绘存在“双入口”（开始菜单 + 教学战后）导致体验重复的问题。
- 保留开局命名能力，同时将立绘入口统一到教学战完成后。

### 本轮完成
1. 开始菜单设置精简：
   - `游戏设置` 仅保留训练家命名输入。
   - 移除“开局立绘提示词”输入与模板按钮。
2. 开局行为统一：
   - 新开游戏仅应用训练家名称，不再从开始菜单触发立绘生成流程。
3. 教学战后立绘入口增强：
   - 保留原有 6 套模板快捷生成。
   - 新增“自定义生成”选项（手动输入提示词后立即生成）。
   - 保留“稍后再生成”。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-27 Iteration AN（许愿台追踪与领取闭环）

### 任务目标
- 修复“许愿后长时间无反馈/不可领取”的体验断层。
- 将家园许愿台升级为可追踪、可领取、可重试的稳定流程。

### 本轮完成
1. 许愿台菜单升级为四入口：
   - `生成立绘 / 更换立绘 / 许愿列表 / 结束互动`。
2. 新增许愿记录与进度追踪：
   - 记录写入 `progress.homeWishRecords`。
   - 在“许愿列表”展示每条记录的状态与文本进度条。
3. 新增手动领取流程：
   - 当候选立绘完成后，可从“许愿列表”进入“领取立绘”。
   - 领取时支持 `A/B 二选一` 或 `暂不选择`。
4. 许愿提交反馈增强：
   - 明确提示“服务不可用 / 已在进行 / 提交失败 / 已提交可在列表查看”。
5. 数据持久化补强：
   - 图鉴候选数据持久化增加 `taskId` 字段，便于后续追踪扩展。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/bootstrap-ai.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-27 Iteration AM（后备/家园仓库被动回血）

### 任务目标
- 让不在出战位的精灵也能在探索移动中缓慢恢复，减少反复回城整备频率。

### 本轮完成
1. 新增步数驱动的被动回血：
   - 在 `attemptMove` 中接入 `recoverStoredMonstersOnStep()`。
2. 新增回血节奏控制：
   - 每移动 `4` 步触发一次恢复。
   - 每次对后备区与家园仓库精灵恢复 `1 HP`。
3. 安全与兼容处理：
   - 自动补齐旧存档的 `progress.storedRegenTicker`。
   - 仅对 `0 < currentHp < maxHp` 的精灵生效（倒地不自动拉起，满血不重复计算）。
   - 不新增刷屏提示，保证探索节奏干净。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/docs/context-log.md`

## 2026-03-27 Iteration AL（新手反复阵亡保护：整备 + 连败缓冲）

### 任务目标
- 解决“出门被打回城后又残血重来”的坐牢体验。
- 给新手段增加稳定推进的兜底机制。

### 本轮完成
1. 出城整备：
   - 从星辉城进入花冠大道前，自动恢复队伍与后备区状态。
2. 连败保护：
   - 新增 `progress.failStreak`。
   - 连败时普通野怪与部分训练师会自动降级（早期地图生效）。
3. 战败补给：
   - 战败回城后自动发放精灵球、恢复药和避怪保护步数。
   - 同步提示“连败保护已启用”，明确系统在帮玩家稳住节奏。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/bootstrap-ai.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/battle-system.js`

### 验证记录
- `node --check src/game/world-events.js`
- `node --check src/game/battle-system.js`
- `node --check src/game/bootstrap-ai.js`
- `node scripts/acceptance-interaction.mjs` -> `SUMMARY | passed=6 failed=0`

## 2026-03-27 Iteration AK（开局立绘模板补齐 + 教学战后延迟触发）

### 任务目标
- 在“游戏设置”里提供中文可直接使用的主角立绘模板参考。
- 将主角立绘生成时机延后到教学战完成后，避免开局等待打断体验。

### 本轮完成
1. 立绘模板补齐：
   - 新增 6 套中文模板按钮（少年 3 + 少女 3），点击即可填入提示词。
2. 触发时机调整：
   - 新开局不再立刻提交主角立绘生成。
   - 改为完成教学战（`tutorial_aide`）后弹出“模板选择并生成”面板。
3. 保留灵活性：
   - 支持“稍后再生成”，之后仍可在功能面板手动生成主角立绘。

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/battle-system.js`
- `E:/Ai/Vibecoding_Game/src/game/bootstrap-ai.js`

### 验证记录
- `node --check src/game/rendering.js`
- `node --check src/game/world-events.js`
- `node --check src/game/battle-system.js`
- `node --check src/game/bootstrap-ai.js`
- `node --check src/game/globals.js`
- `node scripts/acceptance-interaction.mjs` -> `SUMMARY | passed=6 failed=0`

## 2026-03-27 Iteration AJ（开始界面升级：游戏设置接管命名与开局立绘）

### 任务目标
- 避免命名与立绘使用弹窗交互导致“流程不出现”的问题。
- 将开局自定义并入开始界面，形成稳定的四入口结构。

### 本轮完成
1. 开始界面固定为四入口：
   - `开始游戏 / 继续游戏 / 选择存档 / 游戏设置`
2. 新增“游戏设置”页：
   - 可编辑训练家名称（最多 12 字）
   - 可编辑开局立绘风格提示词
   - 设置持久化到 `gbit_monster_quest_settings_v1`
3. 开局流程改造：
   - 新开存档后不再弹 `prompt`，直接读取设置并自动应用
   - 自动触发主角立绘生成请求

### 关键文件
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`

### 验证记录
- `node --check src/game/rendering.js`
- `node --check src/game/world-events.js`
- `node --check src/game/globals.js`
- `node --check src/game/bootstrap-ai.js`
- `node scripts/acceptance-interaction.mjs` -> `SUMMARY | passed=6 failed=0`

## 2026-03-27 Iteration AI（新手开局体验重构）

### 任务目标
- 修复新手开局体验断层：缺教学战、初始立绘缺失、前两图等级过高、无开局命名流程。

### 本轮完成
1. 开局自定义流程：
   - 新开存档后立即触发训练家命名（最多 12 字）。
   - 同步触发主角立绘自动生成（支持输入风格关键词，自动化环境下走默认值以避免阻塞）。
2. 御三家后教学战回归：
   - 选择初始精灵后立即进入教学战（`tutorial_aide`）。
3. 御三家立绘二选一自动触发：
   - 选定初始精灵后立即调用图鉴候选立绘流程（A/B 二选一）。
4. 前期数值回调：
   - 下调 `花冠大道`、`蒙德草原` 普通/摇草/卷尘遭遇等级区间。
   - 下调草原前置训练师和首馆队伍等级，降低首段挫败感。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/bootstrap-ai.js`

### 验证记录
- `node --check src/game/world-events.js`
- `node --check src/game/globals.js`
- `node --check src/game/bootstrap-ai.js`
- `node --check src/game/rendering.js`
- `node scripts/acceptance-interaction.mjs` -> `SUMMARY | passed=6 failed=0`

## 2026-03-27 Iteration AH（版本体系落地）

### 任务目标
- 建立可持续维护的版本管理规则。
- 给出明确“当前版本”，并让页面显示版本信息。

### 本轮完成
1. 新增版本源文件：
   - `version.json`（单一真源）
2. 新增版本同步脚本：
   - `scripts/sync-version.mjs`
   - 生成 `version.js`（供前端读取 `window.GBIT_VERSION`）
3. 页面接入版本展示：
   - `index.html` 增加 `buildVersion` 显示位
   - `bootstrap-ai.js` 启动时写入版本徽标
4. 版本规则文档化：
   - 新增 `docs/versioning.md`
5. 命令补齐：
   - `npm run version:show`
   - `npm run version:sync`

### 当前版本
- `v0.9.0-demo.1`
- `2026-03-27`
- `Mond Meadow Sprint`

## 2026-03-27 Iteration AG（三槽位演示存档系统落地）

### 任务目标
- 完成可演示的启动存档流程：`开始游戏 / 继续游戏 / 选择存档`。
- 支持给演示同学快速开启“全新存档”且不污染现有进度。
- 保持旧单档数据可迁移，不丢历史进度。

### 本轮完成
1. 存档结构升级为三槽位：
   - 新增 `slot1/slot2/slot3` 存档键与 profile 索引键（记录 `activeSlot/lastSlot` 与每槽元信息）。
   - 元信息包含更新时间、徽章数、地图名、队伍数量、故事阶段。
2. 启动菜单落地：
   - 新增开场 Overlay：`继续游戏`、`开始新游戏`、`选择存档`。
   - 选择存档页支持每槽位“继续此存档 / 新游戏(覆盖)”。
3. 旧存档兼容迁移：
   - 若检测到旧单档 `gbit_monster_quest_save_v1` 且新槽位为空，会自动迁移到 `slot1`。
4. 重置行为对齐新体系：
   - 右下角“重新开始”改为仅清空当前槽位并立即重开，不影响其他槽位。
5. 验收脚本同步：
   - `scripts/acceptance-interaction.mjs` 增加新存档键清理逻辑，并在测试前自动点击“开始新游戏”进入可交互场景。

### 关键文件
- `E:/Ai/Vibecoding_Game/src/game/globals.js`
- `E:/Ai/Vibecoding_Game/src/game/bootstrap-ai.js`
- `E:/Ai/Vibecoding_Game/src/game/rendering.js`
- `E:/Ai/Vibecoding_Game/src/game/world-events.js`
- `E:/Ai/Vibecoding_Game/index.html`
- `E:/Ai/Vibecoding_Game/styles.css`
- `E:/Ai/Vibecoding_Game/scripts/acceptance-interaction.mjs`

### 验证记录
- `node --check src/game/globals.js`
- `node --check src/game/bootstrap-ai.js`
- `node --check src/game/world-events.js`
- `node --check src/game/rendering.js`
- `node --check src/game/ui-panels.js`
- `node --check src/game/battle-system.js`
- `node scripts/acceptance-interaction.mjs` -> `SUMMARY | passed=6 failed=0`

## 2026-03-27 Iteration AF（蒙德草原版本规格锁定）

### 任务目标
- 将“新手村 -> 蒙德草原 -> 草系道馆”的新版规格正式写入规划。
- 把传说遭遇概率与草系/冰系战斗设计要求固化为执行任务。

### 本轮完成
1. 更新规划主文档：
   - `tasks/demo-week-plan.md`
   - 新增体验主线（教学->实践->受挫->引导->掌握）分阶段落地。
2. 写入蒙德草原规则补充：
   - 新增 4 只稀有精灵（命名避免传说化语义）。
   - 草系前期战斗定位锁定为“续航+控节奏”。
   - 冰属性接入需求（克制与抗性）进入版本规格。
3. 写入传说遭遇机制：
   - 道馆前最多遭遇/交手 3 只传说，低概率捕捉。
   - 道馆前“至少遇到 1 只传说”目标概率 >= 80%（基础概率+保底机制）。
   - 道馆通关或草系权能后，森律神使捕捉率提升。
   - 曜辉圣兽与炽脉兽口径统一为同一传说位。
4. 更新任务看板：
   - `tasks/board.md` 新增 `DEMO-006/007/008`，覆盖主线、属性系统、遭遇系统三块执行责任。

### 关键文件
- `E:/Ai/Vibecoding_Game/tasks/demo-week-plan.md`
- `E:/Ai/Vibecoding_Game/tasks/board.md`

## 2026-03-26 Iteration AE（吞噬/融合稳定性收口 + 验收扩展）

### 任务目标
- 将吞噬/融合系统做成可重复回归验证的稳定闭环。
- 补齐“吞噬+回滚”“融合立绘 A/B/暂不选择”的自动化验收覆盖。

### 本轮完成
1. 扩展交互验收脚本 `scripts/acceptance-interaction.mjs`：
   - 融合用例升级为“融合生效 + 立绘二选一流程”联合校验。
   - 新增“吞噬后回滚快照恢复”用例（资源、tier、mode 回归检查）。
   - 新增“融合立绘 A/B/暂不选择”用例（选择结果与关闭弹窗行为）。
2. 验收脚本稳定性增强：
   - 对融合/吞噬相关立绘请求使用脚本内 stub，降低外部 AI 服务波动对回归的影响。
3. 运行锁防重入：
   - `performFusionEvolution/performDevourEvolution` 增加运行锁与按钮禁用联动，避免连点导致重复扣资源。
4. 回滚语义确认：
   - 读档归一化后未进化个体的 `mutation.mode` 为 `none`（非空串），并将其写入验收期望，避免误报。

### 关键文件
- `E:/Ai/Vibecoding_Game/scripts/acceptance-interaction.mjs`
- `E:/Ai/Vibecoding_Game/docs/game-architecture.md`
- `E:/Ai/Vibecoding_Game/docs/system-data-flow.md`
- `E:/Ai/Vibecoding_Game/docs/debugging-guide.md`

### 验证记录
- `node --check scripts/acceptance-interaction.mjs`
- `node scripts/acceptance-interaction.mjs`
  - `SUMMARY | passed=6 failed=0`

## 2026-03-26 Iteration AD（开局模板补放到 skill 目录）

### 任务目标
- 将“项目开局会话模板”补放到 `E:/Ai/Vibecoding_Game/skills/ai-game-skill` 目录内部。
- 避免模板只存在于项目根目录，导致在 skill 目录里看不到。

### 本轮完成
1. 新增文件：
   - `E:/Ai/Vibecoding_Game/skills/ai-game-skill/项目开局会话模板.md`
2. 内容与项目根目录模板保持一致：
   - 提供简短版与强化版新会话开场 prompt
   - 统一指向 `E:/Ai/Vibecoding_Game/skills/ai-game-skill`

### 关键文件
- `E:/Ai/Vibecoding_Game/skills/ai-game-skill/项目开局会话模板.md`

### 验证记录
- 抽查 skill 目录内已存在 `项目开局会话模板.md`。
## 2026-03-26 Iteration AC（Vibecoding 项目开局模板落地）

### 任务目标
- 在 `E:/Ai/Vibecoding_Game` 下提供一个可直接复制使用的新会话开局模板。
- 让 `ai-game-skill` 在新线程中的使用门槛进一步降低。

### 本轮完成
1. 新增文件：
   - `E:/Ai/Vibecoding_Game/项目开局会话模板.md`
2. 模板内容：
   - 提供简短版开场 prompt
   - 提供强化版开场 prompt
   - 统一指向 `E:/Ai/Vibecoding_Game/skills/ai-game-skill`
   - 包含 demo 恢复检查脚本调用方式

### 关键文件
- `E:/Ai/Vibecoding_Game/项目开局会话模板.md`

### 验证记录
- 抽查模板文件已落盘，路径与 skill 使用方式一致。
## 2026-03-26 Iteration AB（新会话使用模板 + skill 分发）

### 任务目标
- 让 `ai-game-skill` 在新会话里更容易被直接拿来用。
- 将主 skill 分发到 `E:/Ai/Vibecoding_Game/skills` 目录。

### 本轮完成
1. 更新主 skill：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
   - 新增 `Use In A New Session` 段落。
2. 新增新会话提示词模板：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/references/new-session-prompt.md`
   - 提供 short / strong 两种开场用法。
3. 分发 skill：
   - 复制至 `E:/Ai/Vibecoding_Game/skills/ai-game-skill`
   - 保留 `agents / references / scripts / SKILL.md` 完整结构。

### 关键文件
- `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/new-session-prompt.md`
- `E:/Ai/Vibecoding_Game/skills/ai-game-skill/SKILL.md`

### 验证记录
- `python C:/Users/cenjy/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/cenjy/.codex/skills/ai-game-skill`
- 抽查 `E:/Ai/Vibecoding_Game/skills/ai-game-skill` 已包含完整目录结构。
## 2026-03-26 Iteration AA（demo 内容基线 + 真实恢复流程验证）

### 任务目标
- 为 `ai-game-skill` 补一份当前 demo 的内容基线。
- 用主 skill 真正跑一轮恢复流程，验证它是否足以支撑新会话快速恢复 demo。

### 本轮完成
1. 新增内容基线 reference：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/references/demo-content-baseline.md`
   - 明确当前 demo 的最低地图集、关键 NPC、基础精灵线与首个道馆战斗节点。
2. 更新主 skill 与快速重建清单：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/references/quickstart-rebuild-checklist.md`
3. 执行真实恢复流程验证：
   - 按 skill 的读取顺序复查 demo 范围、内容基线、模块地图和重建清单。
   - 运行 helper script：
     `node C:/Users/cenjy/.codex/skills/ai-game-skill/scripts/run-demo-recovery-check.mjs --project-root E:/Ai/GBIT_GAME`
4. 同步知识库说明：
   - `docs/game-architecture.md`

### 关键文件
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/demo-content-baseline.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/quickstart-rebuild-checklist.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/scripts/run-demo-recovery-check.mjs`

### 验证记录
- `python C:/Users/cenjy/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/cenjy/.codex/skills/ai-game-skill`
- `run-demo-recovery-check` 结果：
  - `PASS | acceptance-interaction.mjs`
  - `SUMMARY | passed=4 failed=0`
  - `RECOVERY_CHECK_SUMMARY | failed=0`
## 2026-03-26 Iteration Z（ai-game-skill 补强为验收与恢复包）

### 任务目标
- 将 `ai-game-skill` 从知识说明包继续增强为“玩法闭环 + 验收 + 快速恢复检查”的工作包。
- 让新会话不仅能理解项目，还能快速验证 demo 是否处于可恢复状态。

### 本轮完成
1. 新增玩法闭环参考：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/references/gameplay-loop.md`
2. 新增验收清单：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/references/acceptance-checklist.md`
3. 新增 helper script：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/scripts/run-demo-recovery-check.mjs`
   - 可直接检查关键文件存在性，并尝试运行项目已有 `acceptance-interaction.mjs`。
4. 更新主 skill：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
   - 加入玩法闭环、验收和 helper script 的使用说明。
5. 同步项目知识库：
   - `docs/game-architecture.md`
   - `docs/system-data-flow.md`

### 关键文件
- `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/gameplay-loop.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/acceptance-checklist.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/scripts/run-demo-recovery-check.mjs`

### 验证记录
- `python C:/Users/cenjy/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/cenjy/.codex/skills/ai-game-skill`
- 抽查主 skill 已引用新增 references 与 helper script。
## 2026-03-26 Iteration Y（主 skill 重命名并增强为 demo 重建包）

### 任务目标
- 将项目主 skill 统一命名为 `ai-game-skill`。
- 将 skill 从“项目说明包”增强为“短时间可重建 demo 的工作包”。

### 本轮完成
1. 重命名项目主 skill：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
2. 更新 skill 元数据与主说明：
   - `agents/openai.yaml`
   - `SKILL.md`
3. 新增重建导向 references：
   - `rebuild-playbook.md`
   - `quickstart-rebuild-checklist.md`
4. 同步项目知识库引用：
   - `docs/game-architecture.md`
   - `docs/system-data-flow.md`
   - `docs/context-log.md`

### 关键文件
- `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/agents/openai.yaml`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/rebuild-playbook.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/quickstart-rebuild-checklist.md`

### 验证记录
- `python C:/Users/cenjy/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/cenjy/.codex/skills/ai-game-skill`
- 抽查 skill 目录已包含 `SKILL.md + agents/openai.yaml + references/*`，并新增 demo 重建清单与重建流程参考。
## 2026-03-26 Iteration X（项目主 skill 封装世界观与 AI 管线）

### 任务目标
- 将项目的世界观、AI 美术管线、比赛周范围、模块结构与规则整理为可复用的主 skill。
- 让后续新会话不必从零重建项目上下文。

### 本轮完成
1. 新增项目主 skill：
   - `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
2. 新增 5 份 references：
   - `world-lore-core.md`
   - `ai-art-pipeline.md`
   - `demo-scope.md`
   - `module-map.md`
   - `rules-checklist.md`
3. 同步知识库索引：
   - `docs/game-architecture.md`
   - `docs/system-data-flow.md`
4. 说明约定：
   - 将受编码污染的 `docs/world-lore.md` 抽象为干净的 skill reference 供后续实现使用。

### 关键文件
- `C:/Users/cenjy/.codex/skills/ai-game-skill/SKILL.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/world-lore-core.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/ai-art-pipeline.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/demo-scope.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/module-map.md`
- `C:/Users/cenjy/.codex/skills/ai-game-skill/references/rules-checklist.md`

### 验证记录
- `python C:/Users/cenjy/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/cenjy/.codex/skills/ai-game-skill`
- 抽查 skill 目录结构已包含 `SKILL.md + agents/openai.yaml + references/*`。
## 2026-03-26 Iteration W（继承优先级矩阵 + 重启分流 skill）

### 任务目标
- 定义比赛周“保留 / 继承 / 重做 / 暂缓”的统一优先级。
- 对当前项目做一次面向首个道馆 demo 的归类整理。
- 将本轮经验抽象为后续会话可复用的 skill。

### 本轮完成
1. 新增项目分级矩阵：
   - `tasks/inheritance-priority-matrix.md`
   - 定义 `Must Inherit / Recommend Inherit / Optional Inherit / Recommend Rebuild / Defer This Week` 五档。
   - 对 Web 壳子、核心主循环、AI 管线、地图扩量、美术扩量、超大模块等完成本周动作归类。
2. 更新任务看板与知识库索引：
   - `tasks/board.md`
   - `docs/game-architecture.md`
   - `docs/system-data-flow.md`
3. 新增本地 skill：
   - `C:/Users/cenjy/.codex/skills/contest-reset-prioritizer/SKILL.md`
   - `C:/Users/cenjy/.codex/skills/contest-reset-prioritizer/agents/openai.yaml`
   - 用于在新会话中快速执行“重启项目但不从零开始”的 retain/rebuild/defer 判断。

### 关键文件
- `tasks/inheritance-priority-matrix.md`
- `tasks/board.md`
- `docs/game-architecture.md`
- `docs/system-data-flow.md`
- `docs/context-log.md`
- `C:/Users/cenjy/.codex/skills/contest-reset-prioritizer/SKILL.md`

### 验证记录
- `python C:/Users/cenjy/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/cenjy/.codex/skills/contest-reset-prioritizer`
- 抽查 `tasks/inheritance-priority-matrix.md` 已覆盖主要运行时模块与本周动作。
## 2026-03-24 Iteration V（赛事创作导向规则补充）

### 任务目标
- 将赛事方补充说明落到项目规则与竞赛模板。
- 明确“核心体验优先、避免资产堆砌、AI 用于高效表达创意”的执行口径。

### 本轮完成
1. 更新总规则与知识库规则：
   - `rules/project-rules.md`
   - `rules/knowledge-base-rules.md`
2. 更新冲刺执行口径：
   - `tasks/demo-week-plan.md`
   - `tasks/competition-import-quickstart.md`
3. 更新导入脚本模板：
   - `scripts/bootstrap-competition-project.mjs`
   - 在 `COMPLIANCE` 生成模板中加入“核心体验优先”文案与日志字段。
4. 同步已创建的竞赛项目模板：
   - `E:/Ai/GBIT_GAME_CONTEST/COMPLIANCE/third-party-declaration.md`
   - `E:/Ai/GBIT_GAME_CONTEST/COMPLIANCE/creation-journal.md`
   - `E:/Ai/GBIT_GAME_CONTEST/COMPLIANCE/submit-checklist.md`
   - `E:/Ai/GBIT_GAME_CONTEST/README-COMPETITION-BOOTSTRAP.md`

### 关键文件
- `rules/project-rules.md`
- `rules/knowledge-base-rules.md`
- `tasks/demo-week-plan.md`
- `tasks/competition-import-quickstart.md`
- `scripts/bootstrap-competition-project.mjs`
- `docs/context-log.md`

### 验证记录
- `node --check scripts/bootstrap-competition-project.mjs`
- 抽查 `GBIT_GAME_CONTEST/COMPLIANCE` 三个文档已包含“核心体验优先”口径与对应日志项。
## 2026-03-24 Iteration U（比赛公平性规则落盘 + 合规模板升级）

### 任务目标
- 将赛事方最新说明正式落到项目规则与导入模板。
- 保证“赛期落地、AI 赛期重生成、赛前资源声明”可执行、可审计。

### 本轮完成
1. 升级竞赛导入脚本模板：
   - `scripts/bootstrap-competition-project.mjs`
   - `COMPLIANCE` 模板新增 AI 重生成硬约束、证据字段、赛前资源声明字段。
2. 更新导入手册：
   - `tasks/competition-import-quickstart.md`
   - 补充 `--force` 刷新模板方式与公平性必过项。
3. 同步规则与知识库：
   - `rules/project-rules.md`
   - `rules/knowledge-base-rules.md`
   - `docs/game-architecture.md`
   - `docs/system-data-flow.md`
   - `docs/debugging-guide.md`
   - `tasks/demo-week-plan.md`

### 关键文件
- `scripts/bootstrap-competition-project.mjs`
- `tasks/competition-import-quickstart.md`
- `rules/project-rules.md`
- `rules/knowledge-base-rules.md`
- `docs/game-architecture.md`
- `docs/system-data-flow.md`
- `docs/debugging-guide.md`
- `tasks/demo-week-plan.md`

### 验证记录
- `node --check scripts/bootstrap-competition-project.mjs`
- 检查模板文案已包含：
  - 比赛窗口 `2026-03-24 ~ 2026-03-29`
  - AI 产出赛期重生成要求
  - 赛前资源声明与证据字段
  - 每日创作日志证据要求

## 2026-03-24 Iteration T（双体融合主流规则定稿）

### 任务目标
- 将融合系统的复杂度边界正式写入设定。
- 明确“前中期靠双体融合做策略，三体以上属于传说级个例”。

### 本轮完成
1. 更新 `docs/world-lore.md` 的进化体系核心原则：
   - 前中期融合靠少量素材做策略，终局融合才允许完整神兽化
   - 双体融合是现代训练家可稳定掌握的主流形态
   - 三体及以上融合属于传说层级个例，不进入常规培养主流

### 关键文件
- `docs/world-lore.md`

### 验证记录
- 新规则已与既有“同阶融合 95%”“神兽终局开放”“系统复杂度可控”目标对齐。

## 2026-03-24 Iteration S（融合阶段与容量规则补充）

### 任务目标
- 为融合流派补充“同阶主流、低阶更易融合、高阶容量更小”的底层规则。
- 让融合系统在世界观和数值层面同时闭合。

### 本轮完成
1. 更新 `docs/world-lore.md` 的进化体系核心原则：
   - 同阶融合约占全部融合案例的 95%
   - 低阶个体更容易进入融合态
   - 高阶个体更难完美融合
   - 个体境界越高，可承受的融合数量越少
   - 三阶段精灵通常最多只能容纳 2 个融合个体，神兽是例外

### 关键文件
- `docs/world-lore.md`

### 验证记录
- 新规则已与既有“完美融化”“神兽例外”“普通流派与特殊流派共存”原则对齐。

## 2026-03-23 Iteration R（融合稳定性与繁育规则定稿）

### 任务目标
- 将吞噬/融合进化的繁育与长期存在规则压缩进正式设定。
- 重点澄清“长期融合”“完美融化”“吞噬后代回归正常个体”的边界。

### 本轮完成
1. 更新 `docs/world-lore.md`：
   - 境界越强，生育越难
   - 吞噬后代通常回归正常个体，仅低概率保留吞噬痕
   - 融合进化默认长期存在，但不是天然永久
   - 通过持续训练可逐步走向“完美融化”
   - 只有完美融化个体才具备正常繁育资格
   - 神兽级个体不进入常规繁殖体系

### 关键文件
- `docs/world-lore.md`

### 验证记录
- 繁育与融合稳定性规则已与既有“权能试炼”“三条进化道路并存”设定对齐。

## 2026-03-23 Iteration Q（进化体系核心原则定稿）

### 任务目标
- 将用户确认的进化体系核心原则压缩进正式设定。
- 删除过长推演，只保留后续系统设计必须遵守的高优先级规则。

### 本轮完成
1. 更新 `docs/world-lore.md` 的“进化体系核心原则”：
   - 普通进化是世界主流，吞噬与融合需要人工参与
   - 对战生态目标为普通流派与特殊进化流派长期共存
   - 特殊进化更强调素材策略与操作，而非纯数值碾压
   - 三条进化道路都能通向强者，只是代价与终点不同
   - 神兽级特殊进化必须通过试炼与引导完成，普通个体异变上限为准神兽级

### 关键文件
- `docs/world-lore.md`

### 验证记录
- 核心原则已按“尽可能简短”的要求压缩，可直接作为后续剧情、数值和系统规则基线。

## 2026-03-23 Iteration P（权能设定落盘 + 道馆试炼规则定稿）

### 任务目标
- 将“徽章 vs 权能试炼”的核心世界观规则落到正式文档。
- 为后续道馆主线、神兽养成与普通进化平衡提供统一设定基线。

### 本轮完成
1. 新增世界观文档：
   - `docs/world-lore.md`
2. 在文档中明确：
   - 吞噬派 / 融合派 / 自然进化派的关系
   - 权能是古神神性的碎片，而非机械部件
   - 道馆战证明实力，权能试炼验证继承资格
   - 普通进化、特殊进化、神兽复苏三层进化结构
   - 吞噬/融合进化在属性、特性、技能与数值上的平衡原则
3. 更新架构索引：
   - `docs/game-architecture.md` 新增 `docs/world-lore.md`

### 关键文件
- `docs/world-lore.md`（新增）
- `docs/game-architecture.md`

### 验证记录
- 文档已落盘并加入知识库索引，可供后续剧情、系统与数值设计直接引用。

## 2026-03-24 Iteration Q4（竞赛项目快速导入与合规模板）

### 任务目标
- 在比赛正式开始时快速创建新项目，同时满足“来源声明/过程可追溯”的合规要求。

### 本轮完成
1. 新增一键导入脚本：
   - `scripts/bootstrap-competition-project.mjs`
   - 支持 `web-minimal / web-full` 两种导入档位
   - 自动忽略 `.git`、`node_modules`、`.env.local` 等不应导入内容
2. 新增导入说明文档：
   - `tasks/competition-import-quickstart.md`
3. 新增 npm 命令：
   - `npm run contest:bootstrap`
4. 实际创建新项目并验证：
   - 目标目录：`E:\Ai\GBIT_GAME_CONTEST`
   - 自动生成 `COMPLIANCE/` 四件套（manifest/声明模板/日志/提交检查表）

### 关键文件
- `scripts/bootstrap-competition-project.mjs`
- `tasks/competition-import-quickstart.md`
- `package.json`

### 验证记录
- `node --check scripts/bootstrap-competition-project.mjs`
- `node scripts/bootstrap-competition-project.mjs --target ..\GBIT_GAME_CONTEST_SANDBOX --profile web-minimal --dry-run`
- `node scripts/bootstrap-competition-project.mjs --target ..\GBIT_GAME_CONTEST --profile web-minimal --force`
## 2026-03-24 Iteration Q3（比赛窗口调整为 03-24 ~ 03-29）

### 任务目标
- 将 Demo 冲刺窗口从 03-24 ~ 03-31 收敛到比赛窗口 03-24 ~ 03-29。
- 压缩计划节奏，确保冻结与交付在 03-29 当天完成。

### 本轮完成
1. 更新计划窗口：
   - `tasks/demo-week-plan.md` 目标冻结日改为 2026-03-29。
2. 压缩里程碑：
   - 将原 Day6 + Day7 合并为 Day6（03-29）“Polish + Demo Freeze + Hand-off”。
3. 同步口径：
   - `tasks/board.md` 冲刺时间改为 2026-03-24 至 2026-03-29。
   - `rules/project-rules.md`、`docs/game-architecture.md`、`docs/system-data-flow.md` 的 Demo 周日期同步更新。

### 关键文件
- `tasks/demo-week-plan.md`
- `tasks/board.md`
- `rules/project-rules.md`
- `docs/game-architecture.md`
- `docs/system-data-flow.md`

### 验证记录
- 全部 Demo 周文档日期已统一为 `2026-03-24 ~ 2026-03-29`。
## 2026-03-24 Iteration Q2（Demo 周计划与世界观对齐）

### 任务目标
- 将 `world-lore.md` 的核心叙事约束与 `context-log.md` 的现有实现进度合并，形成可执行的一周 demo 日程。

### 本轮完成
1. 更新 `tasks/demo-week-plan.md`：
   - 新增 Lore Guardrails（徽章与权能试炼区分、三进化道路并存、Apex/Legendary 分层）。
   - 在 Day2~Day5 增加剧情与文案落地检查点。
2. 更新 `tasks/board.md`：
   - 新增 `DEMO-004`（叙事对齐任务）。
3. 更新 `rules/project-rules.md`：
   - Demo 周硬约束补充世界观约束，防止开发中出现设定冲突。

### 关键文件
- `tasks/demo-week-plan.md`
- `tasks/board.md`
- `rules/project-rules.md`

### 验证记录
- 计划、看板、规则三处已统一“Web only + first-gym demo + lore guardrails”口径。
## 2026-03-24 Iteration Q（Demo 周范围锁定：Web Only）

### 任务目标
- 锁定一周冲刺方向：仅用 Web 技术栈交付“至少打完一个道馆”的 demo。
- 明确不在本周进行 Godot 迁移，避免引擎切换打断主循环迭代。

### 本轮完成
1. 规则落地：
   - 在 `rules/project-rules.md` 新增 Demo 周硬约束（Web only、禁 Godot、目标闭环）。
2. 计划落地：
   - 新增 `tasks/demo-week-plan.md`（03-24 至 03-31 按天里程碑与验收标准）。
3. 看板重排：
   - 重写 `tasks/board.md`，以 first-gym demo 为唯一冲刺目标并拆分任务。
4. 架构文档同步：
   - 在 `docs/game-architecture.md` 增加 Demo 周技术策略说明。

### 关键文件
- `rules/project-rules.md`
- `tasks/demo-week-plan.md`
- `tasks/board.md`
- `docs/game-architecture.md`

### 验证记录
- 规则、计划、看板、架构文档均已落盘并与本周目标一致。
## 2026-03-20 Iteration N（融合/吞噬进化独立网页计划书）

### 任务目标
- 围绕“融合进化（精灵+元素）/吞噬进化（精灵+精灵）”输出一份可执行计划书。
- 先独立跑通进化核心链路，再回并主游戏，降低主循环风险。

### 本轮完成
1. 新建计划文档：
   - `tasks/fusion-devour-web-plan.md`
2. 在计划中明确：
   - 立项目的、范围边界、MVP 功能清单
   - 独立网页模块拆分（state/rules/image/storage/ui/main）
   - 数据契约与回并兼容策略
   - 里程碑、验收标准、风险对策

### 关键文件
- `tasks/fusion-devour-web-plan.md`（新增）

### 验证记录
- 文档已落盘并纳入任务目录，供后续迭代按里程碑执行。

## 2026-03-20 Iteration O（参考图感新精灵设计 + 实装）

### 任务目标
- 根据用户提供的 4 张参考图，设计一批新精灵并真正加入可玩流程。
- 要求“不是只写文案”，而是完成：数据接入 + 地图遭遇 + 可生成立绘。

### 本轮完成
1. 新增 6 只主题精灵（含进化链）：
   - `cinderpup -> sunfang -> warmaul`
   - `blazedrake`
   - `snowkit -> aurorafang`
2. 新增 6 个配套招式：
   - `lava_claw`、`inferno_halberd`、`verdant_inferno`
   - `frost_arc`、`ember_howl`、`glacial_veil`
3. 完成地图遭遇表接线：
   - `route`、`meadow`、`lake`、`cave`、`deep_cave`、`ridge`、`islet`
4. 调用内网 AI 管线生成新精灵立绘并注册运行时资源：
   - `assets/monsters/cinderpup.png`
   - `assets/monsters/sunfang.png`
   - `assets/monsters/warmaul.png`
   - `assets/monsters/blazedrake.png`
   - `assets/monsters/snowkit.png`
   - `assets/monsters/aurorafang.png`

### 关键文件
- `src/game/globals.js`
- `assets.generated.js`
- `assets/monsters/cinderpup.png`
- `assets/monsters/sunfang.png`
- `assets/monsters/warmaul.png`
- `assets/monsters/blazedrake.png`
- `assets/monsters/snowkit.png`
- `assets/monsters/aurorafang.png`

### 验证记录
- `node --check src/game/globals.js`
- `node scripts/generate-runtime-asset.mjs --type monster --id ... --json`（6 次）
- `node scripts/acceptance-interaction.mjs` -> `passed=4 failed=0`

## 2026-03-20 Iteration P（Apex 地区霸主分层 + 击败奖励）

### 任务目标
- 将指定高阶精灵定义为“地区霸主（Apex）”，与传说精灵分层。
- 增加 Apex 击败奖励，并持久化首次/重复击败记录。

### 本轮完成
1. Apex 标签接入：
   - 在 `speciesData` 为 `sunfang`、`warmaul`、`blazedrake`、`aurorafang` 标记 `isApex: true`。
2. 遭遇与战斗命名接入：
   - `startWildBattle()` 写入 `enemy.isApex`。
   - 战斗标题与开场文案支持“地区霸主 <名称>”。
3. 奖励结算接入：
   - 新增 `grantApexVictoryRewards()`。
   - 首次击败：220 金币 + 月辉之核x1 + 武装之核x1 + 额外精华。
   - 重复击败：90 金币 + 野外口粮x1 + 常规精华。
4. 存档兼容：
   - 初始状态增加 `progress.apexDefeated`。
   - 读档补齐 `progress.apexDefeated`，避免旧档报错。

### 关键文件
- `src/game/globals.js`
- `src/game/world-events.js`
- `src/game/battle-system.js`
- `src/game/bootstrap-ai.js`
- `src/game/rendering.js`

### 验证记录
- `node --check src/game/world-events.js`
- `node --check src/game/battle-system.js`
- `node --check src/game/globals.js`
- `node --check src/game/bootstrap-ai.js`
- `node --check src/game/rendering.js`
- `node scripts/acceptance-interaction.mjs` -> `passed=4 failed=0`

## 2026-03-20 Iteration M（默认切换内网 AIServiceProxy + 本地环境自动加载）

### 任务目标
- 将图像生成默认 provider 切换为吉比特内网 `AISERVICEPROXY`。
- 解决“重启后环境变量丢失导致 AI 面板提示缺少 Key”的问题。
- 保持可维护性：密钥只在本地，配置可复用、可扩展。

### 本轮完成
1. 新增本地环境加载器：
   - 新建 `scripts/load-local-env.mjs`，按 `.env -> .env.local` 顺序补齐环境变量。
   - 不覆盖系统已注入变量，兼容 CI 与本地开发。
2. 接入核心 AI 脚本：
   - `scripts/dev-server.mjs`
   - `scripts/generate-runtime-asset.mjs`
   - `scripts/generate-proxy-character-assets.mjs`
3. 默认 provider 调整：
   - `RUNTIME_IMAGE_PROVIDER` 默认值由 `auto` 调整为 `proxy`。
   - 保留可用 provider 自动回退机制（如仅有 Gemini key 时回退 `gemini-official`）。
4. 本地配置模板与安全边界：
   - 新增 `.env.example`（默认内网 proxy 配置模板）。
   - `.gitignore` 增加 `.env*` 忽略规则（保留 `.env.example`）。
5. 本地运行验证：
   - 重启 `dev-server` 后，`/api/ai/health` 返回 `imageProvider=proxy`、`imageProviderReady=true`。
   - 执行交互验收脚本，`4/4 PASS`。

### 关键文件
- `scripts/load-local-env.mjs`（新增）
- `scripts/dev-server.mjs`
- `scripts/generate-runtime-asset.mjs`
- `scripts/generate-proxy-character-assets.mjs`
- `.env.example`（新增）
- `.gitignore`

### 验证记录
- `Invoke-WebRequest http://127.0.0.1:4310/api/ai/health`
- `node scripts/acceptance-interaction.mjs`

## 2026-03-20 Iteration L（启动服务 + 自动化交互验收）

### 任务目标
- 启动当前游戏页面并完成一轮可复现的交互验收。
- 覆盖上一轮新增的四项关键改动：
  1. NPC 回车交互触发立绘。
  2. 商店分类 + 分页。
  3. 融合进化真实生效反馈。
  4. 首遇图鉴双候选立绘二选一。

### 本轮完成
1. 服务启动与可用性确认：
   - 复用已占用 4310 端口的 `scripts/dev-server.mjs` 进程。
   - `GET /api/ai/health` 返回 `imageProviderReady=true`（gemini-official）。
2. 新增自动化验收脚本：
   - `scripts/acceptance-interaction.mjs`（Puppeteer Core）。
   - 增加浏览器可执行路径探测（Chrome/Edge/Firefox 候选）。
3. 执行交互验收并全部通过：
   - `PASS | NPC interaction auto-portrait`
   - `PASS | Shop category + pagination`
   - `PASS | Fusion evolution effect`
   - `PASS | First encounter dual portrait selection`
   - `SUMMARY | passed=4 failed=0`

### 关键文件
- `scripts/acceptance-interaction.mjs`（新增）
- `package.json`（新增 `puppeteer-core` devDependency）
- `package-lock.json`（新增）

### 验证记录
- `Invoke-WebRequest http://127.0.0.1:4310/api/ai/health`
- `node scripts/acceptance-interaction.mjs`

## 2026-03-19 Iteration K（NPC 交互立绘 + 商店分页 + 融合反馈 + 首遇图鉴定稿）

### 任务目标
- NPC 立绘改为“回车互动触发”可达路径。
- 商店从超长单页改为分类 + 分页。
- 强化融合/吞噬进化反馈，明确属性/特性/技能/立绘任务。
- 新增首遇精灵双候选图鉴立绘与二选一定稿流程。

### 本轮完成
1. NPC 交互自动立绘：
   - `interact()` 增加 `requestNpcPortraitOnInteract(npc.id)` 异步触发。
   - 自动触发支持冷却节流，避免重复排队。
   - 任务完成后强制刷新 `storyFocus` 到目标 NPC，立绘即时显示。
2. 商店分类分页：
   - `openMerchantMainMenu()` 改为分类入口。
   - 新增 `openMerchantCategoryPage(category, pageIndex)`，每页 6 项，支持上一页/下一页。
   - 购买后回到当前分类页继续交易。
3. 融合/吞噬进化完整反馈：
   - 新增并落盘 `mutation.trait`。
   - 日志/对话增加属性、特性、技能变化提示。
   - 进化立绘任务创建后记录 task id 与状态。
4. 首遇图鉴双候选：
   - 首次（及未定稿）野生遭遇触发 `requestFirstEncounterPokedexPortraitChoices`。
   - 自动提交 2 个候选任务（A/B），轮询完成后弹出带缩略图的二选一面板。
   - 选择结果写入 `pokedex.portraits`，候选信息写入 `pokedex.candidates`。
   - `getMonsterArtKeys()` 优先读取图鉴定稿立绘。
5. 存档兼容：
   - 初始状态与读档合并补齐 `pokedex.portraits/candidates`。
   - 变异归一化补齐 `mutation.trait`。

### 关键文件
- `src/game/world-events.js`
- `src/game/bootstrap-ai.js`
- `src/game/ui-panels.js`
- `src/game/rendering.js`
- `src/game/battle-system.js`
- `src/game/evolution-pipeline.js`
- `src/game/globals.js`
- `styles.css`

### 验证记录
- `node --check src/game/bootstrap-ai.js`
- `node --check src/game/world-events.js`
- `node --check src/game/ui-panels.js`
- `node --check src/game/rendering.js`
- `node --check src/game/evolution-pipeline.js`
- `node --check src/game/battle-system.js`
- `node --check src/game/globals.js`

## 2026-03-19 历史迭代摘要
- Iteration J：功能面板滚动可达性修复。
- Iteration I：玩家立绘收藏系统第一期。
- Iteration H：AI 美术管线专项（融合/吞噬统一 skill、进化演出、立绘热更新）。
- Iteration G：地图扩展与训练师链路接线，含石像与避怪丹系统。

## 2026-03-26（新项目复现 + 首个道馆闭环引导增强）

### 本次目标
- 在 `E:/Ai/Vibecoding_Game` 作为全新项目根目录快速复现 web demo。
- 在不破坏已验证战斗/存档壳层的前提下，增强首个道馆闭环的路线清晰度。

### 复现动作
1. 通过 `scripts/bootstrap-competition-project.mjs --profile web-full` 将运行时、脚本、docs/rules/tasks 同步到新根目录。
2. 安装依赖并跑恢复检查与交互验收：
   - `node skills/ai-game-skill/scripts/run-demo-recovery-check.mjs --project-root E:/Ai/Vibecoding_Game`
   - `node scripts/acceptance-interaction.mjs`
3. 当前恢复检查与验收脚本通过。

### 新增内容（首个道馆闭环）
1. 首次离开城镇进入花冠大道时，新增双行路线提示：
   - 先完成 2 次捕捉
   - 再挑战巡路员并回城领道馆通行证
2. 补给员诺亚新增“首个道馆冲刺路线”选项：
   - 根据 `storyStage` 动态给出当前最短路径建议
   - 覆盖：领初始伙伴、2 次捕捉、巡路员战、回城领证、道馆挑战、闭环完成
3. 目标文案微调：
   - `storyStage=2` 明确“巡字标记”定位巡路员
   - `storyStage=4` 明确“赢下徽章并完成首个闭环”

### 关键文件
- `src/game/world-events.js`
- `src/game/ui-panels.js`

## 2026-03-26（Demo 计划执行 - 阶段二：道馆后奖励分支 + 引导强化）

### 本轮计划
1. 在首个道馆闭环后增加“内容可选分支”，提升后续推进策略性。
2. 保持 battle/save 主壳稳定，不引入高风险重构。
3. 强化奖励领取与目标提示，避免玩家在道馆后出现短暂失焦。

### 已完成
1. 首个道馆奖励三选一
   - 新增 `triggerFirstGymRewardChoice()` 与 `grantFirstGymRewardPackage()`
   - 方案：捕捉补给包 / 对战强化包 / 成长资源包
   - 支持“稍后决定”，并可回城找教授再次打开
2. 胜利后引导衔接
   - 击败馆主后标记 `firstGymRewardPending=true`
   - 立即弹出奖励选择（可延后）
   - 馆主与教授对话会继续提示奖励领取路径
3. 目标栏提示
   - `ui-panels.js` 增加道馆后可选目标文案：
     “回城与教授对话领取首个道馆奖励三选一”
4. 存档兼容
   - `createInitialState.flags` 补齐：
     - `firstGymRewardPending`
     - `firstGymRewardClaimed`

### 关键文件
- `src/game/world-events.js`
- `src/game/battle-system.js`
- `src/game/ui-panels.js`
- `src/game/bootstrap-ai.js`

## 2026-03-26（Demo 计划执行 - 阶段三：道馆可选热身战接线）

### 本轮目标
- 为首个道馆闭环补一个“可选热身战”节点，降低直冲馆主的难度波动。
- 保持主线不被强制分叉：不打热身也能直接挑战馆主。

### 已完成
1. 新增试炼官交互接线：
   - `interactGymAide()` 已在 `world-events.js` 落地。
   - 首次进道馆时给出一次性提示（可选热身，不强制）。
2. 新增热身战结算分支：
   - `battle-system.js` 增加 `trainerId === "gym_aide"` 奖励逻辑。
   - 奖励：`super_potion x1 + 80 金币 + Arcane 资源`。
3. 状态与目标文案同步：
   - `bootstrap-ai.js` 新增 `gymAideDefeated`、`gymAideIntroShown` 默认 flags。
   - `ui-panels.js` 的 `storyStage === 4` 目标文案更新为“可选热身提示”。

### 关键文件
- `src/game/world-events.js`
- `src/game/battle-system.js`
- `src/game/bootstrap-ai.js`
- `src/game/ui-panels.js`

## 2026-03-26（仓库调度体验修复：队伍/后备/家园双向流转）

### 本轮目标
- 修复“家园仓库与背包（后备区）/队伍调度不完整”的体验问题。
- 让玩家可以在 UI 内完成常见双向转移，不再被单向流程卡住。

### 已完成
1. 新增调度函数：
   - `movePartyMonsterToHome(index)`
   - `moveHomeMonsterToParty(index)`
2. 现有调度链补全为可用闭环：
   - 队伍 -> 家园
   - 后备区 -> 家园
   - 家园 -> 后备区
   - 家园 -> 队伍
3. 事件接线与 UI 按钮同步：
   - `world-events.js` 增加 `party-to-home`、`home-to-party` 事件处理
   - `ui-panels.js` 在队伍卡和家园卡中新增对应按钮与禁用文案
4. 约束处理：
   - 队伍至少保留 1 只精灵
   - 队伍、后备区、家园容量上限都做前置校验

### 关键文件
- `src/game/rendering.js`
- `src/game/world-events.js`
- `src/game/ui-panels.js`

## 2026-03-26（家园地图扩展：回城/功能台/许愿重绘）

### 本轮目标
- 新增可常驻整备的家园地图，并支持非战斗状态一键回城。
- 在家园内落地恢复、仓库规则、许愿、吞噬、融合、补给六类功能入口。

### 已完成
1. 家园地图与回城路径：
   - `globals.js` 新增 `home` 场景主题与 `maps.home`。
   - `maps.town` 新增 `H` 回家园入口；`home` 内 `v` 返回城镇。
   - `world-events.js` 新增 `H` 键一键回城（仅非战斗场景）。
2. 家园 NPC 交互：
   - 新增恢复泉水、家园仓库、许愿台、吞噬台、融合台、补给台 NPC。
   - 恢复泉水可恢复“队伍 + 后备区”全部状态。
   - 吞噬台/融合台可直接联动进化工坊执行对应进化。
3. 仓库与补给规则：
   - 送入家园仓库时自动回满 HP（队伍->家园、后备->家园）。
   - 家园补给台新增一次性免费补给：精灵球 +10、恢复药 x10、避怪丹 x10。
4. 许愿台立绘能力：
   - 复用图鉴候选立绘生成流程，支持：
     - 为“无立绘”的已捕获精灵补全立绘
     - 对“已有立绘”的精灵执行重生成替换
   - `requestFirstEncounterPokedexPortraitChoices` 增加 `force` 参数以支持覆盖重绘。
5. 存档兼容：
   - 新增 `homeSupplyClaimed` flag 初始值与读档布尔兼容处理。

### 关键文件
- `src/game/globals.js`
- `src/game/world-events.js`
- `src/game/rendering.js`
- `src/game/bootstrap-ai.js`

## 2026-03-26（家园交互改版：从 NPC 改为场景物件）

### 本轮目标
- 修复“吞噬台按 E 直接执行，无选择确认”的体验问题。
- 将家园交互改为物件驱动（泉水/桌子/雕像/宝箱），不再依赖家园 NPC。

### 已完成
1. 家园地图改为物件点位：
   - `Y` 许愿雕像、`C` 仓库箱、`F` 恢复泉水、`G` 融合桌、`X` 吞噬台、`B` 补给宝箱。
2. 交互入口切换：
   - 在 `interact()` 中优先处理 `home` 地图物件 tile 交互。
   - 家园 NPC 改为 `visible: () => false`，不再出现在地图上。
3. 吞噬/融合流程改为“确认菜单”：
   - 按 E 先弹出菜单：
     - 执行
     - 仅打开进化工坊
     - 离开
   - 不再一键直接进化。
4. 家园物件绘制：
   - `rendering.js` 新增家园物件 tile 绘制逻辑，视觉上可区分泉水/雕像/桌子/宝箱/仓库箱。

### 关键文件
- `src/game/globals.js`
- `src/game/world-events.js`
- `src/game/rendering.js`

## 2026-03-26（进化安全改版：可回退 + 自由选素材）

### 本轮目标
- 解决误触吞噬后无法撤回的问题。
- 让吞噬/融合在家园中支持明确的目标与素材选择流程。

### 已完成
1. 吞噬/融合操作历史快照：
   - 在执行前记录队伍、后备区、资源、炼金日志快照。
   - 新增回退能力：可撤销最近一次吞噬/融合。
2. 家园吞噬台交互升级：
   - 流程改为：选择目标 -> 选择素材 -> 二次确认 -> 执行。
   - 增加“回退上一次吞噬/融合”入口（有历史时显示）。
3. 家园融合台交互升级：
   - 流程改为：选择目标 -> 选择元素 -> 二次确认 -> 执行。
   - 同样提供“回退上一次吞噬/融合”入口。

### 关键文件
- `src/game/ui-panels.js`
- `src/game/world-events.js`

## 2026-03-26（世界观对齐：吞噬台/融合台设定化文案）

### 本轮目标
- 依据 world-lore-core，将吞噬台与融合台文案统一为“渊噬/共鸣”叙事。
- 强化“徽章不等于权柄继承”“三路线共存”的世界观表达。

### 已完成
1. 家园进化台命名语义升级：
   - 吞噬侧改为“渊噬祭台”（受体/供体/同化仪式文案）。
   - 融合侧改为“共鸣融合台”（主体/元素/同调阵列文案）。
2. 导标提示文案对齐：
   - Arcane 导标改为“主体 + 元素 + Arcane”稳定共鸣表达。
   - Void 说明改为渊噬仪式资源表达。
3. 炼金师教学文案重写：
   - 新增“徽章证明训练实力，不等于直接继承古神权柄”提示。
   - 新增“三条路线长期共存，策略优先于数值膨胀”提示。

### 关键文件
- `src/game/world-events.js`

## 2026-03-26（机制重构：吞噬=元素渊噬，融合=双精灵融合）

### 用户反馈
- 页面看不到最新更新。
- 机制概念需要明确区分：
  - 吞噬：精灵 + 元素/道具
  - 融合：两只精灵融合

### 已完成
1. 前端缓存强制刷新：
   - `index.html` 将 `styles.css` 与全部脚本资源追加 `?v=20260326e` 版本戳，避免浏览器继续加载旧缓存。
2. 进化工坊 UI 改造：
   - 融合改为 `fusionTargetSelect + fusionPartnerSelect`（主体 + 后备素材精灵）。
   - 吞噬改为 `devourTargetSelect + devourElementSelect`（主体 + 元素）。
3. 机制逻辑改造：
   - `performFusionEvolution`：
     - 消耗 Arcane x1
     - 消耗后备素材精灵（真正双精灵融合）
     - 继承素材类型与技能倾向
   - `performDevourEvolution`：
     - 消耗元素精华 x2 + Void x1
     - 不再吞噬后备精灵
     - 按元素注入渊噬印记与技能
4. 家园交互流程同步：
   - 渊噬祭台：受体 -> 元素 -> 二次确认
   - 共鸣融合台：主体 -> 素材精灵 -> 二次确认
5. 验收脚本同步：
   - `scripts/acceptance-interaction.mjs` 已改为新选择器与新融合路径，回归通过。

### 关键文件
- `index.html`
- `src/game/globals.js`
- `src/game/ui-panels.js`
- `src/game/world-events.js`
- `scripts/acceptance-interaction.mjs`

## 2026-03-26（融合立绘升级：二选一 + 暂不选择）

### 本轮目标
- 融合成功后提供立绘候选选择，而不是直接覆盖。
- 支持“暂不选择”，后续再去许愿台重生成。

### 已完成
1. 融合立绘候选流程：
   - 融合后并行生成 `候选A/候选B` 两张立绘（融合专用 variant）。
   - 弹出选择框：`候选A`、`候选B`、`暂不选择`。
2. 选择行为：
   - 选 A/B：写入 `mutation.portraitKey`，立即作为融合立绘生效。
   - 暂不选择：保持当前立绘不变，并给出“可去许愿台重生成”的提示。
3. 进化立绘请求函数增强：
   - `requestEvolutionMonsterPortrait` 现返回任务结果对象（ok/artKey/src），便于候选弹窗复用。

### 关键文件
- `src/game/ui-panels.js`

## 2026-03-26（知识库治理升级：按规则双写更新）

### 本轮目标
- 按“文档化上下文”规范，将知识库维护流程固化到项目规则与知识库文档中。
- 确保后续每次关键决策都能在架构/数据流/排障/日志中同步留痕。

### 已完成
1. 规则固化：
   - `rules/knowledge-base-rules.md` 新增“知识库维护规范（必须遵守）”与强制更新映射。
2. 架构文档同步：
   - `docs/game-architecture.md` 增补知识库规则文件索引、吞噬/融合新机制、融合立绘二选一机制。
   - 在「已知问题与修复记录」补充：
     - 融合候选“选后无下文”问题与修复
     - 吞噬/融合机制语义重构记录
3. 数据流文档同步：
   - `docs/system-data-flow.md` 增补知识库同步约束与家园进化台当前流程（渊噬/融合/立绘二选一）。
4. 排障文档同步：
   - `docs/debugging-guide.md` 新增：
     - 页面不更新排查（缓存/端口/版本戳）
     - 融合候选选后无下文排查（choice 冲突、面板 toggle、AI 可用性）

### 关键文件
- `rules/knowledge-base-rules.md`
- `docs/game-architecture.md`
- `docs/system-data-flow.md`
- `docs/debugging-guide.md`

## 2026-03-26（导出记录修复：开始/停止控制词匹配放宽）

### 用户反馈
- 导出 skill 提示“没有可导出内容”，即使用户已经输入过开始记录语句。

### 根因
- 导出脚本默认控制词存在编码污染。
- 控制词匹配过于严格（几乎只接受完全等于）。

### 已完成
1. `export_ai_sessions.js` 增加开始/停止控制词 fallback 列表。
2. 控制词解析支持 `| , ， 、` 分隔。
3. 匹配策略升级为规范化 + 宽松匹配（支持自然语句包含控制词）。
4. 覆盖 `isControlMessage` 逻辑，避免旧编码模式影响识别。
5. 实测验证通过：
   - 命令：`node .codex/skills/export-chat-records/scripts/export_ai_sessions.js --workspace "." --ai codex`
   - 结果：成功导出 4 个会话片段。

### 关键文件
- `.codex/skills/export-chat-records/scripts/export_ai_sessions.js`

## 2026-03-26（导出编码修复：Markdown UTF-8 BOM）

### 用户反馈
- 导出的 Markdown 在部分环境中显示中文乱码。

### 根因
- 导出文件虽为 UTF-8，但部分 Windows 编辑器/读取链路会按本地编码误判。

### 已完成
1. 导出脚本改为输出 UTF-8 BOM（`EF BB BF`）。
2. 重新导出并验证文件头确认为 BOM。

### 验证
- 命令：`node .codex/skills/export-chat-records/scripts/export_ai_sessions.js --workspace "." --ai codex`
- 校验：导出文件前 3 字节为 `EF BB BF`（BOM=true）。

### 关键文件
- `.codex/skills/export-chat-records/scripts/export_ai_sessions.js`

## 2026-03-26（导出技能双保险：保留原版副本）

### 目标
- 将用户提供的“未修改版 export-chat-records”作为独立备份并行保留，避免单点风险。

### 已完成
1. 项目内备份：
   - `E:/Ai/Vibecoding_Game/.codex/skills/export-chat-records-vanilla`
2. 全局备份：
   - `C:/Users/cenjy/.codex/skills/export-chat-records-vanilla`
3. 保留策略：
   - 不覆盖现有 `export-chat-records`（当前修复版继续可用）。
   - 原版以 `-vanilla` 独立目录并行保存。

### 关键路径
- `E:/Ai/Vibecoding_Game/.codex/skills/export-chat-records-vanilla/SKILL.md`
- `C:/Users/cenjy/.codex/skills/export-chat-records-vanilla/SKILL.md`

## 2026-03-27（协作协议：限定另一个 AI 仅改数值）

### 目标
- 解决“多 AI 并行开发时改动不同步/越界修改”的风险。
- 明确另一个 AI 的职责仅限数值调优，避免误改玩法逻辑。

### 已完成
1. 新增协作模板文档：
   - `docs/ai-collab-protocol.md`
2. 在文档中固定当前边界：
   - AI-B 仅允许修改 `config/balance-config.json`
   - 禁止修改 `src/game/**/*.js`、`index.html`、`styles.css` 等玩法与界面代码
3. 增加合并门禁脚本示例（基于 `git diff --name-only` 白名单检查）。
4. 增加标准交接模板（目标/参数变更/验证/风险回滚）。
5. 新增可执行门禁脚本：
   - `scripts/check-balance-scope.ps1`

### 备注
- 后续如新增数值配置文件（例如 `config/progression-config.json`），先更新本协议白名单，再允许 AI-B 修改。

## 2026-03-27（等级进化链路：战斗内触发动画 + 立绘异步生成）

### 目标
- 修复“精灵等级进化后没有新立绘”的体验缺口。
- 让进化在战斗内外都立即生效，并插入进化动画。
- 进化后状态回满，同时保留立绘异步生成能力。

### 已完成
1. `grantExperience` 升级为异步流程，并在进化发生时等待进化演出。
2. 新增等级进化展示流程：
   - 进化后立即更新名称/能力值；
   - 进化动画可在战斗中触发（`mode=level`）；
   - 清理战斗状态异常（避免进化后仍残留负面状态）；
   - 进化后恢复满状态。
3. 进化立绘改为自动提交异步任务：
   - 调用图鉴立绘二选一流程；
   - 立绘有延迟时不阻塞战斗，先让数值与形态生效。
4. 资源版本号更新为 `20260327d`，降低浏览器缓存导致的“旧页面”问题。

### 关键文件
- `src/game/battle-system.js`
- `src/game/ui-panels.js`
- `styles.css`
- `index.html`

### 验证
- `node --check src/game/battle-system.js`
- `node --check src/game/ui-panels.js`
- `node scripts/acceptance-interaction.mjs`（`passed=6 failed=0`）

## 2026-03-27（进化体验增强：进度条/刷新入口/慢节奏动画）

### 用户反馈
- 进化后“当场看不到新立绘”体感明显。
- 缺少可视化进度条与“刷新重试”入口。
- 进化动画过快，期待感不足。

### 已完成
1. 进化动画改为三段式（能量汇聚 -> 形态重构 -> 进化完成），总时长提升。
2. 战斗 HUD 新增“进化立绘状态卡”：
   - 显示进度文本与进度条；
   - 提供“刷新进化立绘”按钮；
   - 生成中会自动禁用按钮，避免重复提交。
3. 立绘预览前置：
   - 只要候选图先产出一张，会优先作为怪物立绘预览显示，缩短“无图空窗期”。
4. 新增图鉴立绘任务快照能力（用于计算进度与重试）。
5. 资源版本号升至 `20260327e`，降低缓存导致的旧页面问题。

### 关键文件
- `index.html`
- `styles.css`
- `src/game/globals.js`
- `src/game/ui-panels.js`
- `src/game/world-events.js`
- `src/game/bootstrap-ai.js`
- `src/game/battle-system.js`

## 2026-03-27（教学战放水：三属性首战胜率提升）

### 目标
- 新手教学战（助教艾可）不因属性选择而劝退。
- 将“草/火/水任意开局”教学战胜率提升到 90%+。

### 已完成
1. 仅对 `tutorial_aide` 启用教学保护参数：
   - 玩家伤害倍率上调；
   - 敌方伤害倍率下调。
2. 增加“濒死救援”一次性保底：
   - 玩家首只伙伴倒下时自动回一口血并清除异常状态；
   - 仅本场教学战生效，不影响后续正式战斗。
3. 教学战开场日志追加保护提示，降低新手误解成本。
4. 资源版本号更新到 `20260327f`，确保浏览器拉取最新脚本。

### 关键文件
- `src/game/world-events.js`
- `src/game/battle-system.js`
- `index.html`

## 2026-03-27（开局身份与立绘流程重构）

### 用户需求
- 名字与性别改到第一次和教授雪松对话时自定义。
- 教学战后立绘选择只保留两条路径：
  - 系统默认精美立绘（按性别随机，男 4 / 女 4）
  - 自定义立绘（手动提示词或系统随机提示词）
- 系统随机提示词不少于 30 套。
- 默认口头禅改为可留空（选填）。
- 将 `assets/characters/player_9dc5d6c1.jpg` 纳入系统默认精美立绘池。

### 已完成
1. 新增“雪松登记身份”流程：
   - `storyStage=0` 首次对话时先登记名字 + 性别，再进入初始精灵选择。
2. 新开局流程调整：
   - `startNewGameInSlot` 不再弹开局命名窗口；
   - 开局后由剧情内雪松对话完成身份登记。
3. 教学战后立绘入口重构为两选一：
   - 系统默认精美立绘（按性别随机）
   - 自定义立绘（手动输入 / 随机模板）
4. 新增 30+ 套随机提示词模板（实际 36 套）。
5. 默认口头禅改为可空值，命名卡与设置保存支持空口头禅。
6. 资源版本号更新到 `20260327g`，保证前端强制拉新。

### 关键文件
- `src/game/world-events.js`
- `src/game/rendering.js`
- `src/game/bootstrap-ai.js`
- `index.html`

## 2026-03-27（AI 失效自动降级：本地立绘备用方案）

### 目标
- AI Key 未配置或服务不可用时，确保作品仍可完整试玩、不阻断主流程。

### 已完成
1. 玩家立绘生成失败/服务离线时：
   - 自动应用项目内置主角立绘池（按性别偏好选取）。
2. 图鉴立绘请求失败时：
   - 自动回退到该物种本地立绘（若存在）。
3. 进化立绘请求失败时：
   - 自动回退到进化后物种本地立绘（若存在）。
4. 打包规范文档补充“AI 不可用备用方案”章节。

### 关键文件
- `src/game/bootstrap-ai.js`
- `src/game/ui-panels.js`
- `docs/packaging-spec.md`

## 2026-03-27（新增比赛打包规范文档）

### 目标
- 提前固化“提交流程 + 打包格式 + Key 提醒”规则，降低临门一脚出错概率。

### 已完成
1. 新增提交打包规范：
   - `docs/packaging-spec.md`
2. 文档覆盖：
   - web.zip / exe 双轨策略
   - 命名规则
   - `index.html` 根目录要求
   - 提交材料勾选清单
   - AI 功能需用户自配 Key 的强提醒文案
3. 明确截止时间提醒（2026-03-29 23:59, Asia/Shanghai）。

## 2026-03-27（立绘入口修复 + 存档防丢档升级）

### 目标
- 修复“系统默认精美立绘”缺少可选项的问题，优化输入体验，并降低同事试玩时的存档丢失风险。

### 已完成
1. 主角立绘系统：
   - 教学战后入口从“随机应用”改为“先预览再选择”。
   - 新增系统立绘选择器：展示现成立绘缩略图并可直接应用。
   - 功能面板新增按钮：`选择系统精美立绘`。
2. 输入体验优化：
   - 教授身份登记（名字/性别）从浏览器 `prompt` 改为游戏内卡片输入。
   - 自定义主角提示词从浏览器 `prompt` 改为游戏内输入卡片。
3. 存档系统升级（防丢档）：
   - 每槽位新增备份历史（上限 8）。
   - 覆盖开新档前自动备份当前存档。
   - 存档菜单新增 `恢复最近备份` 一键恢复。
4. 稳定版同步：
   - 已同步到 `E:\Ai\Vibecoding_Game_STABLE_20260327_180710`，公网地址 `http://10.5.31.138:4311/` 可访问。

### 关键文件
- `index.html`
- `styles.css`
- `src/game/globals.js`
- `src/game/ui-panels.js`
- `src/game/world-events.js`
- `src/game/rendering.js`

## 2026-03-27（存档防护第二波：导入导出 + 操作说明 + 覆盖二次确认）

### 目标
- 让同事试玩时更安全可控：可手动备份/迁移存档，误覆盖风险进一步下降，新人可快速看到按键说明。

### 已完成
1. 游戏设置新增存档工具：
   - `导出当前存档`：导出当前槽位 JSON 文件。
   - `导入到当前存档`：从 JSON 导入到当前槽位。
2. 导入安全处理：
   - 导入前若槽位已有进度，会先写入自动备份（`before-import`）再覆盖。
3. 开新档覆盖保护加强：
   - 从单次确认升级为“二次确认”。
   - 覆盖前自动备份逻辑保留。
4. 启动菜单新增 `操作说明`：
   - 集中说明 `↑↓←→/WASD` 移动、`E` 交互、`H` 回城，以及存档保护能力。

### 关键文件
- `index.html`
- `src/game/globals.js`
- `src/game/rendering.js`

## 2026-03-27（P0/P1 收口：草原到道馆主线稳定化 + 演出强化）

### 目标
- 收口“蒙德草原 -> 草系道馆”首个闭环，降低断档与卡关概率，并强化关键剧情演出。

### 已完成
1. 传说遭遇保底（道馆前）：
   - 草原摇动草丛的传说遭遇概率曲线提高（更快触发保底）。
   - 若玩家在领取道馆通行证前仍未遇到任何传说，会由教授触发一次“强制交手”保底遭遇。
2. 主线门槛显性化：
   - 目标栏在 `storyStage=3` 时会明确提示“先完成至少一次传说遭遇”。
3. 草原/道馆入场演出：
   - 首次进入蒙德草原、首次进入道馆分别追加一次性机制提示对白。
4. 道馆前整备演出：
   - 馆主战前新增“试炼前整备”选项，可一次性领取对策补给后再开战。
5. 反派与馆主开场文案强化：
   - 先遣战、执旗战、馆主战的 `intro` 文案统一为更明确的剧情冲突与机制表达。

### 关键文件
- `src/game/world-events.js`
- `src/game/ui-panels.js`
- `src/game/globals.js`
- `src/game/bootstrap-ai.js`

## 2026-03-28（黄金30秒体验优化：首屏可玩 + 交互直觉化）

### 目标
- 降低首屏理解成本，避免玩家在前 30 秒因“看不全/不知道怎么操作”而流失。

### 已完成
1. 首屏布局收紧（100% 缩放可玩）：
   - `canvas-frame` 与 `gameCanvas` 改为按视口高度约束，不再要求浏览器缩到 67% 才能看全主游玩区。
   - 新增 `max-height: 980px` 的紧凑布局策略（隐藏重信息区、压缩间距、提高主画面可见性）。
2. 交互键位直觉化：
   - 新增空格键交互（`Space` 与 `E/Enter` 并行）。
3. 关键提示前置：
   - 顶部状态栏新增固定按键提示（移动/交互/回城）。
   - 开始菜单提示文案追加快捷键说明，减少新玩家试错。

### 关键文件
- `styles.css`
- `index.html`
- `src/game/world-events.js`
- `src/game/rendering.js`

## 2026-03-28（画面内交互 HUD：背包等入口移入游戏视区）

### 目标
- 让“背包/队伍/仓库/进化”入口更像游戏内 UI，而不是仅在画面外侧功能区操作。

### 已完成
1. 新增画面内悬浮 HUD（在 `canvas` 内）：
   - 背包、队伍、仓库、进化四个快捷按钮（支持鼠标点击）。
2. 新增快捷键：
   - `B` 背包、`T` 队伍、`Y` 仓库、`R` 进化工坊。
3. 保留原有外部功能面板作为兼容入口，不影响旧流程。
4. 新增“真正游戏内展开”模式：
   - 通过 HUD 或 `B/T/Y/R` 打开时，功能面板会固定悬浮在游戏画面内。
   - `Esc` 可一键关闭游戏内面板并回到纯画面。

### 关键文件
- `index.html`
- `styles.css`
- `src/game/globals.js`
- `src/game/world-events.js`

## 2026-03-28（开始冒险界面简化：移除底部自定义输入）

### 目标
- 减少首屏表单感，提升“开始冒险”界面的审美与可读性，避免玩家在开局被复杂输入分散注意力。

### 已完成
1. 删除开始界面“游戏设置”页内的自定义输入项：
   - 移除玩家名显示策略、默认称号、默认口头禅、主角名高亮输入与保存按钮。
2. 保留并强化存档工具定位：
   - 设置页仅保留 `导出当前存档 / 导入到当前存档 / 返回主菜单`。
   - 增加简短说明文案，明确这是存档工具页而非开局配置页。
3. 同步代码清理：
   - 删除 `rendering.js` 对上述输入字段的事件绑定与赋值逻辑。
   - 删除 `globals.js` 中对应 DOM 引用，降低后续维护噪音。
4. 交互提示统一：
   - 操作说明文案统一为 `空格 / E / Enter` 可交互。

### 关键文件
- `index.html`
- `styles.css`
- `src/game/rendering.js`
- `src/game/globals.js`

## 2026-03-28（角色素材分层：player 与 npc 目录落地）

### 目标
- 将人物素材从平铺结构升级为分层结构，避免命名冲突并降低后续美术协作成本。

### 已完成
1. 人物素材目录拆分：
   - 玩家素材迁移到 `assets/characters/player/`
   - NPC 素材迁移到 `assets/characters/npc/`
2. 运行时映射同步：
   - 更新 `assets.generated.js` 中 `characters` 全量路径为新目录。
   - 更新 `.ai-portrait-cache.json` 中已缓存的人物路径。
3. 生成与发布链路兼容：
   - `scripts/generate-runtime-asset.mjs`：角色生成自动按 key 分流到 `player/` 或 `npc/`。
   - `scripts/publish-generated-assets.mjs` 与 `scripts/publish-character-assets.mjs`：发布时自动写入新目录并更新 manifest。
   - `functions/api/ai/generate-character.js`：R2 路径调整为 `characters/player/*` 或 `characters/npc/*`。
4. 协作文档修复：
   - 重写 `docs/ai-art-collab-protocol.md`（原文件乱码），给出可执行目录规范与交接模板。

### 注意
- `assets/characters` 根目录中仍可能残留个别旧文件（被本地进程占用时无法立即移除），但运行时已不再依赖根目录路径。

### 关键文件
- `assets.generated.js`
- `.ai-portrait-cache.json`
- `scripts/character-asset-paths.mjs`
- `scripts/generate-runtime-asset.mjs`
- `scripts/publish-generated-assets.mjs`
- `scripts/publish-character-assets.mjs`
- `functions/api/ai/generate-character.js`
- `docs/ai-art-collab-protocol.md`

## 2026-03-28（精灵素材分层：normal/legendary + base/fusion/devour + stage）

### 目标
- 让精灵立绘目录“一眼可读”：区分普通/传说、普通形态/融合/吞噬，并显式区分进化阶段。

### 已完成
1. 新目录规则落地：
   - `assets/monsters/<normal|legendary>/<species_id>/<base|fusion|devour>/stage<0|1|2>/<asset_key>.<ext>`
2. 全量迁移与索引更新：
   - 新增迁移脚本 `scripts/migrate-monster-assets-layout.mjs`，已执行一次。
   - `assets.generated.js` 的 `monsters` 66 条映射全部迁移到新目录。
   - `.ai-portrait-cache.json` 中 44 条 monster 缓存路径已同步。
3. 生成/发布链路兼容新目录：
   - `scripts/monster-asset-paths.mjs` 统一规则。
   - `scripts/generate-runtime-asset.mjs`、`scripts/generate-comfy-asset.mjs`、`scripts/publish-generated-assets.mjs` 已接入。
   - 云端 `functions/api/ai/generate-monster.js` 生成路径同步新结构（R2 目录跟随）。
4. 文档与协作规范更新：
   - `docs/ai-art-collab-protocol.md` 增加精灵目录规范。
   - `README.md` 与 `assets.js` 示例路径更新到新结构。

### 注意
- 旧平铺怪物文件已归档到 `assets/monsters/_legacy_flat/` 作为回退备份；运行时不再依赖该目录。

### 关键文件
- `scripts/monster-asset-paths.mjs`
- `scripts/migrate-monster-assets-layout.mjs`
- `scripts/generate-runtime-asset.mjs`
- `scripts/generate-comfy-asset.mjs`
- `scripts/publish-generated-assets.mjs`
- `functions/api/ai/generate-monster.js`
- `assets.generated.js`
- `.ai-portrait-cache.json`
- `docs/ai-art-collab-protocol.md`
- `README.md`

## 2026-03-28（黄金10分钟：开局序章触发修复与回归）

### 目标
- 确保玩家点击“开始游戏”后，黄金10分钟序章立即启动，不再出现“直接落在城镇、需要手动找教授才触发”的断档体验。

### 已完成
1. 修复开局触发链路：
   - 在 `startNewGameInSlot()` 完成加载后，主动调用 `startNewPlayerOnboarding()`。
   - 结果：新开档立刻弹出“神兽序章（黄金10分钟开场）”选择框。
2. 回归验证（Playwright 烟测）：
   - 验证可进入序章 → 流派选择 → 镜前身份登记 → 立绘选择。
   - 验证序章完成后关键标记可写入存档：`goldenPrologueCompleted=true`、`goldenPathChosen=true`、`playerIdentityReady=true`。
3. 缓存版本升级：
   - `index.html` 静态资源版本从 `20260328g` 升级到 `20260328h`，避免浏览器缓存导致“修复已提交但页面仍旧旧逻辑”。

### 注意
- 覆盖已有存档开新档会触发二次确认弹窗；自动化测试需显式 `accept` 才能进入新流程。
- 目前已完成“序章立即触发”修复；“完整链路（领初始精灵→出村→神兽幼体必遇必得）”仍建议做一轮人工实机回归。

### 关键文件
- `src/game/rendering.js`
- `index.html`

## 2026-03-28（馆主立绘接入修复）

### 目标
- 让道馆馆主阿斯特拉在剧情肖像面板中稳定显示专属立绘。

### 已完成
1. 资源映射补齐：
   - 在 `assets.js` 的 `manualAssets.characters` 新增 `leader -> assets/characters/npc/leader.jpg`。
2. 对白说话人识别增强：
   - `inferDialogueSpeaker` 与 `stripSpeakerPrefix` 增加“忽略空白字符”的匹配逻辑。
   - 解决 `馆主 阿斯特拉`（配置名）与 `馆主阿斯特拉:`（对白文本）空格不一致导致无法命中 speaker 的问题。
3. 缓存版本升级：
   - `index.html` 资源版本从 `20260328h` 升级至 `20260328i`，确保前端立即拉到新映射与新逻辑。

### 验证
- 资源存在校验：`GBIT_ASSETS.characters.leader` 已可用。
- 页面注入对白验证：`馆主阿斯特拉: ...` 可正确解析为馆主，肖像面板显示 `leader.jpg`。

### 关键文件
- `assets.js`
- `src/game/globals.js`
- `index.html`

## 2026-03-28（黄金10分钟演出重构：神兽立绘过场 + 手把手流派教学）

### 目标
- 解决开场神兽战“只有文字、没有画面”的体验问题，并让流派选择后真正可体验融合/吞噬流程，最后自然过渡到镜前登记。

### 已完成
1. 新增序章专用演出层（宝可梦式台词框）：
   - 在主舞台增加 `prologueCinematicOverlay`（双立绘 + 说话人名牌 + 台词气泡 + 提示角标）。
   - 神兽序章改为帧式演出，支持左右焦点切换与场景状态（开场/对峙/碎裂）。
2. 流派教学改为“可点击分步骤”：
   - 融合流：主体确认 → 素材确认 → 演示进化 → 结果立绘确认（3 步）。
   - 吞噬流：受体确认 → 权能注入 → 演示进化 → 结果立绘确认（3 步）。
   - 每步都带图，明确“不是文字讲解，而是手把手操作”。
3. 补齐“将胜未胜 → 梦境碎裂 → 镜前苏醒”过渡：
   - 新增终盘过渡镜头，展示压制、空间裂纹、白光吞没、镜前苏醒四段。
   - 过场结束后自动进入 `梦醒镜前：登记你的训练家身份`。
4. 选择 UI 对称优化：
   - `choice-options` 改为按选项数自适应网格（1/2/3/4 档），修复双选时右侧留白导致的不对称。

### 验证
- Playwright 烟测确认：
  - 开场神兽序章已显示双立绘与台词框；
  - 流派选择为双栏对称；
  - 融合路径 3 步教学每步均有立绘；
  - 过渡后进入镜前登记，演出层自动关闭。
- 缓存版本升级：
  - `index.html` 资源版本从 `20260328i` 升级为 `20260328k`。

### 关键文件
- `index.html`
- `styles.css`
- `src/game/globals.js`
- `src/game/ui-panels.js`
- `src/game/world-events.js`
