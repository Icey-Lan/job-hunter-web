# Product Requirements Document (PRD) - Job Hunter Web

## 1. 产品概述 (Product Overview)

**Job Hunter Web** 是一个本地部署的自动化招聘数据采集与管理工具。它旨在帮助求职者通过自动化手段，从招聘网站（当前聚焦 Boss直聘）批量获取职位详情，建立个人的本地职位数据库，以便进行深度分析、横向对比或利用 AI 辅助优化简历。

## 2. 用户目标 (User Goals)

* **效率提升**: 消除手动复制粘贴职位描述（JD）的繁琐重复劳动。
* **数据沉淀**: 将零散的网页信息结构化为表格数据（CSV/Excel），便于筛选和排序。
* **面试准备**: 获取完整的职位描述、招聘方偏好和公司背景，为面试做针对性准备。

## 3. 功能需求 (Functional Requirements)

### 3.1. 核心采集引擎 (Core Scraper)

* **多策略字段提取**: 针对 Boss直聘 复杂的 DOM 结构（特别是公司名、招聘者信息），采用 Selector、Attribute 和遍历兜底等多重策略，确保字段完整性。
* **抗反爬机制 (Anti-bot)**:
  * 以 `Headful`（有头模式）运行浏览器，模拟真实用户。
  * 实现自动滚动懒加载，确保 `document.body.scrollHeight` 内的所有动态内容被渲染。
  * 随机等待间隔 (2-4秒)，降低被封控概率。
  * **人工介入模式**: 当遇到图形验证码或滑块时，允许用户在弹出的浏览器窗口中手动完成验证，程序检测到页面加载完成后自动继续。

### 3.2. 任务管理 (Task Management)

* **批量提交**: 支持用户一次性粘贴多个职位链接。
* **去重队列**: 自动过滤重复提交的链接，通过内存队列 (FIFO) 串行调度任务。
* **状态追踪**: 实时跟踪每个任务的状态（Pending, Processing, Completed, Failed）并记录错误日志。

### 3.3. 前端交互 (User Interface)

* **任务看板**: 实时显示当前队列长度、成功/失败统计。
* **数据表格**:
  * 支持全字段展示（职位、薪资、公司、地址、经验、学历、标签、各类福利等）。
  * **批量操作**: 支持勾选多条记录进行批量删除。
* **数据导出**:
  * **CSV 导出**: 自动处理 UTF-8 BOM 编码，确保 Microsoft Excel 打开不乱码。

### 3.4. 岗位追踪 (Job Tracking) 🆕 V2.0

* **追踪列表**: 独立于原始采集数据的追踪管理区，支持用户主动管理感兴趣的岗位。
* **状态流转 (Pipeline)**:
  * `待投递` → `已投递` → `一面` → `二面` → `三面` → `待开奖` → `Offer` / `拒绝` / `放弃`
* **行内编辑**: 支持直接在表格中修改状态(下拉)、优先级(下拉)、投递时间(日期选择)、面试时间(日期选择)、备注(文本)。
* **撤销删除**: 从追踪列表删除后 30 秒内可撤销恢复。
* **数据隔离**: 追踪数据存储在独立的 `tracked_jobs.json` 文件中，不污染原始采集数据。

## 4. 技术架构 (Technical Architecture)

### 4.1. 技术栈

* **Frontend**: React 18, Vite, TailwindCSS v4, Lucide React (Icons).
* **Backend**: Python 3.10+, FastAPI (Asynchronous Web Framework).
* **Automation**: Playwright (Python async API).
* **Database**: 本地 JSON 文件存储:
  * `job_details.json` - 原始采集数据
  * `tracked_jobs.json` - 追踪列表数据

### 4.2. 数据流

1. 用户在前端提交 URL -> API `/api/tasks/submit` -> 后端去重 -> 入队 `asyncio.Queue`。
2. 后台 Worker (`TaskProcessor`) 轮询队列 -> 唤起 Playwright -> 访问页面 -> 执行 JS 注入提取数据。
3. 提取成功 -> 更新内存 Task 状态 -> 原子写入 `job_details.json`。
4. 前端轮询 `/api/tasks/status` & `/api/jobs` -> 更新 UI。
5. **追踪流程**: 用户勾选岗位 -> 点击"添加追踪" -> API `/api/track/add` -> 写入 `tracked_jobs.json`。

## 5. 待办特性 / 后续规划 (Roadmap)

* [ ] **Cookie 持久化**: 保存浏览器 Context 状态文件，避免每次重启服务都需要重新扫码登录。
* [ ] **代理 IP 池支持**: 集成第三方代理服务，进一步降低高频访问的风控风险。
* [ ] **AI 简历分析**: 集成 LLM (Gemini/OpenAI)，根据采集到的 JD 自动生成匹配度报告或简历修改建议。
* [ ] **可视化图表**: 添加薪资分布直方图、技能词云等分析图表。

## 6. 已知限制 (Known Limitations)

* **强依赖 DOM 结构**: 如果目标网站大幅改版 CSS 类名，采集器可能失效，需要重新适配 Selectors。
* **验证码拦截**: 本地工具无法自动破解复杂的滑块验证码，必须依赖用户人工辅助。

## 7. 技术挑战与复盘 (Technical Challenges & Lessons)

### 7.1. 前端层级遮挡大作战 (The Z-Index War)

* **问题现象**: 在实现“冻结列” (Sticky Columns) 和“表头下拉菜单”时，下拉菜单经常被其他冻结单元格遮挡，导致选项不可见。
* **根本原因 (Root Cause)**:
  * **Stacking Context（堆叠上下文）**: CSS 中 `position: sticky` 会创建新的堆叠上下文。
  * **DOM 顺序**: 后面的元素默认覆盖前面的元素（若 z-index 相同）。表格 Body 的 Sticky 单元格 (`z-10`) 在 DOM 中位于 Header (`z-20`) 之后，且层级配置不当导致穿透。
  * **容器隔离**: 表格上方的 Toolbar 设置了 `backdrop-blur`，隐式创建了隔离的上下文，导致其子元素（如下拉菜单）无法覆盖表格内容。
* **解决方案 (Solution)**:
  * **精细化分层**: 建立严格的 Z-Index 规范。
    * Body Sticky Cells: `z-10`
    * Header Sticky Cells: `z-30` (高于 Body)
    * Header Dropdown: `z-60` (最高优先级)
  * **容器提升**: 为 Toolbar 容器显式添加 `relative z-50`，强制其层级高于整个表格 (`table container`)，从而让下拉菜单彻底摆脱表格内容的遮挡。

### 7.2. 后端任务队列死锁 (Async Queue Deadlock)

* **问题现象**: 爬虫在运行一段时间后，新提交的任务停留在 `Pending` 状态，不再执行，也无报错日志。
* **根本原因**:
  * `TaskManager` 使用 `is_running` 标志位控制 Worker 启动。
  * 在 `process_queue` 主循环中，若发生非预期异常（如浏览器启动失败、Scraper 代码 Bug），进程崩溃退出但未重置 `is_running = False`。
  * 导致后续调用 `add_tasks` 时，系统误以为 Worker 仍在运行，从而不再启动新的 Worker，形成死锁。
* **解决方案**:
  * **防御性编程**: 将整个 Worker 逻辑包裹在 `try...finally` 块中。
  * **强制复位**: 无论 Worker 是正常结束还是崩溃退出，都在 `finally` 块中强制将 `is_running` 置为 `False`。确保下一次任务提交能正常唤醒 Worker。

### 7.3. 复杂表格布局优化 (Complex Table Layout)

* **问题**: 既要展示多达 15+ 个字段，又要保持页面不拥挤，且核心信息（岗位、公司）不能在滚动时丢失。
* **解决方案**:
  * **多列冻结 (Multi-Column Sticky)**: 利用 `left` 属性的累加计算，同时冻结前两列（岗位、公司）和最后一列（操作）。需要精确计算每一列的宽度并在 CSS 中硬编码 `left: 200px` 等偏移量。
  * **智能换行**: 摒弃简单的 `truncate`（截断），改用 `min-width` + `whitespace-normal`，允许内容换行，利用垂直空间换取水平空间的紧凑度。
  * **动态渲染**: 只有当列被“开启”时才注入 DOM，减少渲染负担。
