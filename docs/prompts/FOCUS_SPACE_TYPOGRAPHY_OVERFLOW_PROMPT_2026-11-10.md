# Focus Space 字体、计时器数字与页面溢出修复 Prompt

> 版本：2026-11-10  
> 目标分支：\`docs/typography-overflow-refinement-2026-11-10\`（本文件所在文档分支）  
> 工程基线参考：\`feature/cloudbase-auth-foundation\`  
> 本任务性质：仅限字体、计时器数字溢出、桌面页面滚动与内容渐进展示；不做 UI 重设计。

## 1. 任务目标

基于当前 Focus Space 实际工作区，修复以下问题：

1. Timer 的 Flip Clock 数字宽度/高度不匹配，出现数字被挤压、超出色块、裁切或显示不完整。
2. 全站字体观感过于紧凑，当前字形和字间距不够舒展。
3. 桌面工作台右侧出现浏览器级纵向滚动条，导致工作台不能在首屏完整呈现。
4. 当 Tasks、Schedule、Focus Journey 等组件内容过多时，不允许通过拉长整页来展示；应在卡片内显示有限预览，并通过「View all / Show more」打开独立的完整内容视图。

最高要求：**保留当前页面整体风格、布局、卡片位置、配色、组件尺寸关系、功能和交互。仅进行字体、数字显示和溢出展示方式的必要修改。**

## 2. 工程基线与保护要求

GitHub 仓库：

https://github.com/hydelynye-ui/Focus-Space

当前已核实的远端分支：

- \`main\`：\`0f95576a51202255c06e86d234aba489d5f5dfb8\`
- \`feature/cloudbase-auth-foundation\`：\`3023c803ef213e405ceb7ba9aee6403017104cf8\`

注意：以上是已核实的远端 Commit，不代表一定等于用户当前腾讯云线上版本或本地最新工作区。**必须先检查 Antigravity 当前打开的实际项目目录、Git 分支、HEAD、工作区状态及部署来源。不得假定 GitHub 远端分支就是线上最新版本。**

开始前执行只读检查：

\`\`\`bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -5 --oneline --decorate
git diff --stat
git ls-files --others --exclude-standard
\`\`\`

必须遵守：

- 不得将 \`main\` 强行覆盖到当前工作区。
- 不得丢弃、覆盖或清理任何未提交修改和未跟踪文件。
- 不得执行 \`git reset --hard\`、\`git clean\`、强制 checkout 或 force push。
- 不得修改或删除现有业务功能。
- 不得更改 localStorage Key、IndexedDB 数据库名、Object Stores、数据版本和持久化协议。
- 不得清空 localStorage 或 IndexedDB。
- 不得执行 PostgreSQL / CloudBase SQL 迁移。
- 不得修改邮箱认证、Guest 模式、CloudBase 配置或数据同步逻辑。
- 不得升级 Vite、CloudBase SDK、Node 依赖或重建技术栈。
- 不得直接向 \`main\` 提交。
- 不得在未经检查和验证的情况下覆盖线上静态托管文件。

如果本地工作区与远端分支存在差异，先保留现有工作区，以实际正在使用的最新代码为准；不要从旧 Commit 重建覆盖。

## 3. 技术约束

当前已知工程采用：

- Vite 6.3.5
- 原生 JavaScript ES Modules
- HTML5 / CSS3
- CloudBase JS SDK 3.11.0
- localStorage / IndexedDB
- PWA / Service Worker

主要检查文件：

- \`public/index.html\`
- \`public/app.js\`
- \`public/styles.css\`
- \`static/assets/\`
- \`static/manifest.webmanifest\`
- \`static/sw.js\`
- \`scripts/\`
- \`vite.config.js\`
- \`package.json\`
- \`package-lock.json\`

必须先检查真实 DOM、CSS 选择器、布局计算和事件绑定。以下选择器是此前检查远端版本时发现的排查入口，不代表线上最新版本一定完全相同：

- \`.flip-panel\`
- Timer 数字容器及 Flip Clock 相关选择器
- \`.main-content\`
- 工作台根容器
- \`.schedule-list\`
- \`.task-list\`
- 各组件的内容容器和现有弹窗

不得凭选择器名称猜测并直接覆盖代码。

## 4. 字体优化

### 4.1 字体方向

参考 Dribbble 上现代效率工具、Dashboard、Planner 产品的字体气质：清晰、舒展、克制、易读，避免过度几何化、过度压缩或过度装饰。

优先使用 **Manrope** 作为全站主字体。可在本地对比 Plus Jakarta Sans，但最终只保留一种主字体，不要同时混用多种风格相近的字体。

字体来源：

https://fonts.google.com/specimen/Manrope

要求：

- 优先采用合法开源的 WOFF2 字体文件。
- 优先使用可覆盖常用字重的 Variable Font。
- 放置在项目现有静态资源体系中，例如 \`static/assets/fonts/\`。
- 使用 \`@font-face\` 本地加载。
- 设置合理的 \`font-weight\` 范围和 \`font-display: swap\`。
- 保留字体许可证文件。
- 不依赖 Google Fonts 在线 CDN，不新增运行时网络字体依赖。
- 不要只修改 CSS 的 font-family 名称却没有提供真实字体文件。
- 如果无法取得合法字体文件，不得放入来源不明的字体；先保留系统字体回退并报告阻碍。

建议字体栈：

\`\`\`css
font-family: "Manrope", ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
\`\`\`

### 4.2 字体层级

只统一字体表现，不改变现有组件布局。

检查并适度优化：

- 页面问候标题
- 组件标题
- 正文和辅助说明
- Schedule 时间、标题和描述
- Tasks 文本
- Notes 输入区域
- 按钮
- 小型 eyebrow / section label
- Clock 时间
- Timer 数字

建议：

- 正文保持自然字距，不要全局使用明显负字间距。
- 主标题可使用轻微负字距，但避免大幅压缩。
- 组件标题采用清晰的 Medium / Semibold。
- 辅助文字保持足够对比度和行高。
- 英文大写小标签可以保留少量正字间距。
- 不要为了“现代感”把所有文字都加粗。
- 不改变现有品牌色、背景色、卡片色、阴影、圆角和图标。

正文行高可参考 1.45–1.65，最终以当前组件实际高度和截图为准。

数字、时间、统计数据优先启用：

\`\`\`css
font-variant-numeric: tabular-nums lining-nums;
font-feature-settings: "tnum" 1, "lnum" 1;
\`\`\`

不能让数字宽度随每秒变化而抖动。

## 5. Timer / Flip Clock 数字溢出修复

### 5.1 根因排查

重点检查：

- Flip Clock 单个数字面板的实际宽度、高度。
- 字体字号、字重、字间距。
- 数字行高和垂直对齐。
- 冒号是否独立占位。
- 父容器的 \`min-width\`、\`overflow\` 和 Grid/Flex 约束。
- 动画切换时上下翻页层的裁切边界。
- 不同视口下的缩放计算。

此前远端 CSS 中曾出现 Flip 面板宽度约 50–66px、字号最大约 64px、负字间距较大的组合；必须重新检查当前真实代码，不要机械照搬或只调小字号。

### 5.2 修复要求

- \`25:00\`、\`05:00\`、\`00:00\`、\`59:59\` 等完整时间必须稳定显示。
- 每个数字必须完整位于自身面板内部。
- 不允许数字越过色块边缘。
- 不允许数字被左右裁切或上下裁切。
- 不允许冒号挤压相邻数字。
- 不允许计时器开始、暂停、倒计时或切换样式时布局跳动。
- 保留当前 Flip Clock 的卡片式视觉效果，不改成另一种计时器设计。
- 不改变 Timer 计时逻辑、计时精度、开始/暂停/重置行为。
- 不改变用户当前选中的计时器样式。

### 5.3 实现方向

根据真实 DOM 结构选择合适实现：

- 让数字容器使用可计算的 Grid/Flex 布局。
- 为数字面板设置与字体度量匹配的宽高。
- 使用 \`min-width: 0\`、\`max-width: 100%\` 等约束时，确保不会压缩数字到不可读。
- 对计时器整体宽度使用合理的响应式约束。
- 字体大小可使用 \`clamp()\`，但必须同时考虑数字面板宽度和高度。
- 冒号应作为独立、稳定的布局单元。
- 仅在 Flip 动画内部使用必要的裁切，不要通过父级全局 \`overflow:hidden\` 掩盖溢出。
- 若不同计时器样式共用组件，必须分别验证 Minimal digital、Circular timer、Flip clock 等样式。

不要仅仅把字号调小来掩盖问题。应从字体度量、数字容器、面板尺寸和父级布局共同修复。

## 6. 桌面端页面禁止浏览器级纵向滚动

### 6.1 目标

桌面端工作台应完整保持在浏览器首屏可视高度内。

要求：

- 页面右侧不出现浏览器级纵向滚动条。
- 页面不出现横向滚动条。
- 顶部导航、侧边栏、工作台内容保持原有位置和视觉关系。
- 不因字体变化导致卡片意外撑高页面。
- 不通过简单裁切整个工作区来假装没有滚动条。
- 不隐藏用户无法再访问的内容。

重点排查：

- \`html\`
- \`body\`
- 页面 App Shell
- Topbar
- Sidebar
- \`.main-content\`
- Workspace 根容器
- Grid / Flex 子项的 \`min-height\`、\`min-width\`
- 组件自身的 \`overflow\`

此前远端版本中 \`body\` 虽然有 \`overflow:hidden\`，但 \`.main-content\` 仍可能使用 \`overflow:auto\`。必须在当前工作区重新检查实际滚动容器。

### 6.2 桌面布局约束

- 桌面 App Shell 使用视口高度约束，考虑浏览器实际可视高度。
- 优先使用 \`100dvh\`，并为不支持的浏览器保留 \`100vh\` 回退。
- Topbar 高度保持现有设计。
- 主内容区域高度根据 Topbar 和 Sidebar 结构计算。
- Grid / Flex 子项正确使用 \`min-height: 0\` 和 \`min-width: 0\`。
- 不要让内容自然高度无限撑开整个页面。
- 不要随意改变组件当前列数、卡片位置、尺寸比例和间距。
- 不要用 transform 或整体缩放来强行塞入页面。

**仅桌面端执行页面级不滚动约束。** 移动端仍需保留合理的纵向触摸滚动，不得为了隐藏桌面滚动条而锁死手机页面。

## 7. 内容超出时采用渐进展示

当组件内部内容超出预览容量时，不允许把整个工作台撑高。采用“卡片预览 + 点击查看全部”的方式。

### 7.1 Tasks

- 卡片默认展示有限数量的任务。
- 优先展示未完成任务。
- 超出部分不直接撑高卡片。
- 卡片底部保留清晰的 \`View all tasks\` 或 \`Show more\` 入口。
- 点击后打开现有任务完整视图；如果当前没有独立视图，则新增轻量 Modal / Drawer。
- 完整视图内部允许滚动，但不得带动浏览器页面或工作台滚动。
- 保留任务新增、编辑、完成、删除、分类、排序等现有功能。
- 不得隐藏或删除任何任务数据。

### 7.2 Schedule

- 卡片默认显示有限数量的最近日程。
- 超出部分不撑高卡片。
- 保留现有时间、红色时间节点、标题和描述样式。
- 保留 \`Open calendar\` 入口。
- 点击后展示完整日程或现有日历视图。
- 如果打开的是 Modal / Drawer，允许面板内部滚动。
- 不得丢失日程，不得修改时间或自动删除过期记录。
- 红色节点必须继续与各自日程正确对应。

### 7.3 Notes

- 首页 Quick Capture 保持当前卡片布局和输入体验。
- 输入内容不能因为卡片高度固定而丢失或无法访问。
- 长笔记通过展开编辑视图、弹窗或现有 Notes 页面查看。
- 不得在首页直接显示无限增长的长文本。
- 自动保存机制和原有字数限制必须保持。
- 不得改变笔记存储结构。

### 7.4 Focus Journey / 历史记录

- 默认只显示有限条目或摘要。
- 使用 \`Show more\` / \`View history\` 查看完整历史。
- 完整列表在独立面板内滚动。
- 不得删除历史专注记录。

### 7.5 其他组件

Timer、Clock、Focus rhythm 等组件应保留当前卡片完整展示，不应因无关列表过长而撑高页面。

如果某个组件本身有长文本，应在组件内部提供展开入口。

### 7.6 展开面板交互

- 优先复用项目现有 Modal / Drawer / Overlay。
- 若需新增，保持现有视觉语言。
- 展开面板内部可滚动。
- 关闭后回到原工作台，不改变原组件顺序、尺寸和内容。
- 支持关闭按钮、Esc 键和合理的焦点管理。
- 不得创建嵌套多个滚动容器导致滚动冲突。
- 打开/关闭不得改变工作区持久化数据。

## 8. 不允许修改的内容

本轮只处理：

1. 字体文件及字体 CSS。
2. 字体字距、字重、行高。
3. Timer 数字布局和溢出。
4. 桌面端页面级滚动。
5. Tasks / Schedule / Notes / Journey 的渐进展示入口和必要的展开视图。

明确禁止：

- 不重设计首页。
- 不改变背景、主题色、卡片颜色、圆角、阴影和图标。
- 不调整 Sidebar 信息架构。
- 不改变组件排序和默认尺寸。
- 不改变 Scenes、Focus Ritual、Focus Reflection 的功能。
- 不改变 Timer 的业务逻辑。
- 不改变 Clock 的业务逻辑。
- 不修改 CloudBase 认证和配置。
- 不修改数据库表、SQL、RLS、Function、Trigger。
- 不改变 localStorage / IndexedDB Key 和数据模型。
- 不引入 React、Vue、TypeScript 或其他框架。
- 不安装新的 UI 组件库。
- 不做移动端整体重构。
- 不删除现有用户数据或场景资源。

如果某项要求必须改变数据结构或既有业务逻辑才能实现，先停止并说明原因，不得自行扩大修改范围。

## 9. 验收测试

### 9.1 Timer 数字

至少测试：

- 25:00
- 05:00
- 00:00
- 59:59
- 10:00:00（如果当前计时器支持小时显示）
- Minimal digital
- Circular timer
- Flip clock

检查不同宽度和不同高度下数字均完整显示。

### 9.2 桌面端视口

至少测试：

- 1920 × 1080
- 1440 × 900
- 1366 × 768
- 1280 × 720

检查：

- 浏览器右侧无页面级纵向滚动条。
- 无横向滚动条。
- Topbar、Sidebar、Workspace 不被裁切。
- 卡片不重叠。
- Timer 数字不溢出。
- 页面内容不会因字体加载前后发生明显布局跳动。

### 9.3 内容渐进展示

分别准备：

- Tasks：0、3、5、10、20 条。
- Schedule：0、1、3、5、8 条。
- Notes：空内容、短文本、长文本。
- Focus Journey：0、5、10、20 条历史记录。

检查默认卡片高度保持稳定；点击入口可访问全部内容；面板关闭后原工作台状态不变。

### 9.4 功能回归

确认：

- Timer 开始、暂停、重置。
- Flip Clock 样式切换。
- Tasks 新增、完成、编辑。
- Schedule 新增、修改、查看。
- Notes 输入和自动保存。
- Focus Journey 历史记录。
- Clock 正常显示。
- Scenes 正常切换。
- Guest workspace 正常。
- 邮箱认证入口正常。
- 页面刷新后原数据仍然存在。
- localStorage 和 IndexedDB 未被清空或重建。

### 9.5 移动端回归

本轮不重做移动端，但必须检查：

- 390 × 844
- 375 × 812

确认没有横向溢出，Timer 数字不裁切，Modal 可操作，页面仍可自然纵向触摸滚动。

## 10. 构建与质量检查

先读取当前 \`package.json\`，只执行实际存在的脚本。

当前已知脚本包括：

\`\`\`bash
npm ci
npm run build
npm run check:deploy
npm run typecheck
npm run lint
npm run check:lock
npm run check:auth
git diff --check
\`\`\`

若当前工作区新增或存在其他检查脚本，按实际情况执行。不存在的脚本不得伪造通过结果。

检查：

- 字体文件真实存在并成功加载。
- 构建后的 CSS 引用了正确字体路径。
- 字体没有外部 CDN 依赖。
- 图片、场景壁纸、PWA Manifest 和 Service Worker 正常。
- 构建输出 \`dist/\` 完整。
- 不存在 JS Console Error。
- 不存在资源 404。
- 不存在新增的无关依赖。

## 11. GitHub 更新要求

本次不要直接向 \`main\` 推送。

以当前实际工作区为基准创建独立开发分支：

\`\`\`text
feature/typography-overflow-refinement
\`\`\`

如果分支已存在，先检查其 HEAD 和工作区状态，不得覆盖已有提交。

提交前检查：

\`\`\`bash
git status --short
git diff --check
git diff --stat
git diff
\`\`\`

只提交本任务相关文件，不提交：

- .env / .env.local
- 真实密钥
- node_modules
- 浏览器数据
- 无关临时文件
- 未经确认的 dist 或其他生成文件

提交信息建议：

\`\`\`text
fix: refine typography, timer fit, and workspace overflow
\`\`\`

推送开发分支后创建 Pull Request，目标分支使用项目当前确认的开发基线分支，而不是自动合并到 main。

PR 必须说明：

- 修改范围。
- 修改文件。
- 字体来源及许可证。
- Timer 溢出修复。
- 页面滚动修复。
- 各组件渐进展示实现。
- 测试结果。
- 桌面端和移动端截图。
- 未完成项目。

不得自动合并 PR。

## 12. 腾讯云部署边界

现有线上地址：

https://focus-space-d5gmg1bimc422765f-1525079590.tcloudbaseapp.com/

本轮先完成代码修改、测试和 GitHub 开发分支更新。

只有在以下条件全部满足后，才允许更新线上静态托管：

1. 确认本地代码就是当前线上版本的正确后继版本。
2. 确认构建通过。
3. 确认功能回归通过。
4. 保留当前线上版本的回滚副本。
5. 确认部署工具和腾讯云账号权限。
6. 用户明确授权发布本次版本。

如果缺少部署权限或无法核实线上版本来源，只交付构建产物和部署说明，不得声称已经发布。

## 13. 最终交付报告

必须提供：

1. 实际工程根目录、分支和 HEAD。
2. 修改前 Git 状态。
3. 修改文件清单。
4. 字体来源、许可证和加载验证。
5. Timer 数字溢出修复说明。
6. 桌面端页面级滚动修复说明。
7. Tasks / Schedule / Notes / Journey 渐进展示说明。
8. npm 构建和检查结果。
9. 浏览器功能回归结果。
10. 桌面端截图。
11. 移动端回归截图。
12. Git Diff。
13. 新开发分支和 Commit SHA。
14. Pull Request 链接。
15. 是否已部署线上、线上访问验证结果。
16. 未完成事项和风险。

最终验收标准：

**保持 Focus Space 当前页面的形式和内容不变，让字体更舒展、Timer 数字完整显示、桌面端页面不出现浏览器级滚动条，并让超出组件预览范围的内容通过点击展开访问。**
