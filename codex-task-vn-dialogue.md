# Task: 给 GBIT Monster Quest 加明日方舟风格视觉小说对话系统

## 项目背景
这是一个纯前端宝可梦风页游（GBIT Monster Quest），用 Canvas 渲染地图 + HTML DOM 做 UI。
当前对话系统是简单的文本日志（`addDialogue()` 写入 `state.dialogue` 数组，`renderDialogueLog()` 渲染到 `#dialogueLog`）。

需要升级为**明日方舟风格双立绘对话系统**：两个角色立绘左右对峙，说话方高亮，打字机效果，选项分支。

## 关键文件
- `index.html` — 主页面，需要加 VN 对话层 DOM
- `styles.css` — 样式，需要加 VN 相关 CSS
- `src/game/ui-panels.js` — 现有 UI 面板，已有 `renderStoryPortraitPanel()`
- `src/game/globals.js` — 全局状态，已有 `state.storyFocus`, `createStoryFocus()`, NPC 定义
- `src/game/world-events.js` — 世界事件/剧情触发，调用 `addDialogue()`
- `src/game/rendering.js` — Canvas 渲染层

## 实现要求

### 1. 新增 VN 对话层（DOM overlay，不改 Canvas）
在 `index.html` 加一个全屏 overlay `#vn-dialogue-layer`，包含：
- 左右两个立绘容器（`.vn-char-left`, `.vn-char-right`）
- 底部对话框（角色名 + 对话文本 + 翻页提示）
- 选项容器

### 2. 伪 L2D 呼吸动画（纯 CSS）
- 立绘容器加 `breathing` 动画���`translateY(-3px) scale(1.005)` 周期 4s
- 说话方：`brightness(1.0)` + 前移 3%
- 沉默方：`brightness(0.4) saturate(0.5)` + 缩小 `scale(0.95)` + 后退

### 3. 打字机效果
- 逐字显示，40ms/字
- 点击或按空格跳过（直接显示全文）
- 全文显示后出现 `▼` 翻页提示
- 再次点击进入下一句

### 4. 选项分支
- 对话行可携带 `choices` 数组
- 选项用按钮列表，hover 时高亮 + 右移 5px
- 点击后隐藏选项，继续对应分支

### 5. 接入现有系统
- 新增 `showVNDialogue(script)` 全局函数
  - `script` 是数组：`[{ position: "left"|"right", name: "角色名", text: "对话", portrait: "speciesId或npcId", choices: [...] }]`
  - 播放期间暂停玩家移动（设 `state.vnActive = true`）
  - 播放结束恢复移动，调用可选的 `onComplete` 回调
- 在 `world-events.js` 的关键剧情点（领取初始伙伴、道馆挑战前）替换原来的 `addDialogue()` 为 `showVNDialogue()`
- 立绘优先从 `assets.generated.js` 的 AI 生成资源加载，fallback 用现有 `storyPortrait` 系统的 emoji/文字占位

### 6. 样式要求
- 配色跟现有 `styles.css` 一致（用已有 CSS 变量或从现有面板取色）
- 对话框背景用半透明渐变（`rgba(0,0,0,0.85)`）
- 角色名用金色高亮 `#ffcc00`
- 字体继承游戏现有字体设置
- 移动端适配：立绘缩小，对话框字号调整

### 7. 不要做的事
- 不要改 Canvas 渲染逻辑
- 不要引入新的 npm 依赖
- 不要改战斗系统
- 不要删除现有的 `addDialogue` / `renderDialogueLog` — VN 层是增量叠加
- 不要加 Live2D SDK

## 验证
- 打开 index.html 能看到游戏正常运行
- 在浏览器 console 执行 `showVNDialogue(demoScript)` 能看到双立绘对话
- 打字机效果正常，点击能跳过/翻页
- 选项能点击并走分支
- 对话结束后玩家可以正常移动
