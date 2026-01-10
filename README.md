# Job Hunter Web

这是一个用于自动化抓取 **Boss直聘** 岗位信息的本地全栈 Web 工具。它帮助求职者批量收集职位描述(JD)、薪资、公司背景等信息，并支持导出为 Excel/CSV 进行分析。

## ✨ 功能特性 (Features)

### V1.0 - 数据采集

* **批量采集**: 支持一次性粘贴多条职位详情页链接，后台自动排队抓取。
* **抗反爬设计**:
  * **模拟真人**: 使用 Playwright 完整浏览器模式 (Headful) 运行，自动滚动加载页面。
  * **人工介入**: 遇到安全验证（滑块/验证码）时，可在弹出的浏览器中手动完成验证，程序会自动恢复采集。
  * **智能兜底**: 针对公司名、招聘者等易变字段，实现了多重提取策略。
* **数据管理**:
  * **实时看板**: 在 Web 界面实时查看任务状态（队列、成功、失败）。
  * **失败重试**: 针对网络波动等原因失败的任务，支持一键重新加入队列重试。
  * **高级筛选**: 支持按公司名称筛选职位，支持自定义列显示/隐藏。
  * **批量管理**: 支持勾选多条记录批量删除。
  * **一键导出**: 完美支持导出为带 BOM 头的 CSV 文件，**Excel 直接打开不乱码**。

<img width="832" height="815" alt="截屏2026-01-10 下午9 55 48" src="https://github.com/user-attachments/assets/a359081b-f85b-44a7-bfe5-6e988de80954" />

### V2.0 - 岗位追踪 🆕

* **追踪列表**: 从岗位列表勾选添加到独立的追踪列表，不污染原始数据。
* **状态流转**: 待投递 → 已投递 → 一面 → 二面 → 三面 → 待开奖 → Offer/拒绝/放弃
* **行内编辑**: 直接在表格中修改状态、优先级、投递时间、面试时间、备注。
* **撤销删除**: 30秒内可撤销误删的追踪记录。

<img width="1088" height="834" alt="截屏2026-01-10 下午9 56 33" src="https://github.com/user-attachments/assets/cea42789-24b8-447c-8697-a316a0cb9f7e" />


## 🛠️ 技术栈 (Tech Stack)

* **Frontend**: React 18 + Vite + TailwindCSS v4
* **Backend**: Python FastAPI
* **Automation**: Playwright (Python)
* **Data**: Local JSON Store

## 🚀 快速开始 (Quick Start)

### 1. 环境准备 (Prerequisites)

请确保您的电脑已安装：

* [Python 3.10+](https://www.python.org/)
* [Node.js 18+](https://nodejs.org/)

### 2. 后端启动 (Backend)

在项目根目录下：

```bash
# 1. 安装 Python 依赖
pip install -r requirements.txt

# 2. 安装 Playwright 浏览器内核 (仅首次需要)
playwright install chromium

# 3. 创建数据文件 (仅首次需要)
echo "[]" > job_details.json
echo "[]" > tracked_jobs.json

# 4. 启动 API 服务器
cd server
python3 main.py
```

### 3. 前端启动 (Frontend)

新开一个终端窗口：

```bash
cd front

# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

## 📖 使用指南 (Usage Guide)

1. **提交链接**: 打开 Web 页面，将 Boss直聘的职位链接粘贴到输入框中（每行一个），点击“开始采集”。
2. **观察浏览器**: 后端会自动弹出一个 Chrome 窗口。**请勿关闭此窗口！**
    * 程序会自动访问链接并滚动页面。
    * ⚠️ **如果遇到验证码**: 请直接在弹出的窗口中手动完成滑块验证。验证通过后，程序会自动检测到并继续执行后续逻辑。
3. **查看结果**: 采集成功的数据会实时显示在下方的表格中。
4. **导出数据**: 点击右上角的 **"Export CSV"** 按钮下载表格，可直接用 Excel 打开。
5. **批量删除**: 勾选表格左侧的复选框，点击出现的 **"Delete Selected"** 按钮即可批量删除旧数据。

## ⚠️ 常见问题 (Troubleshooting)

* **Q: 为什么采集失败显示 "document.body is null"?**
  * A: 通常是因为页面未完全加载或被反爬拦截。请检查弹出的浏览器是否显示了验证码。解决验证码后，重新提交任务即可。
* **Q: 为什么公司名称为空？**
  * A: 我们在最新版中修复了此问题。如果仍遇到，请确保您获取了最新的 `scraper.py` 代码，并尝试手动打开该链接确认页面结构是否有变化。
* **Q: Excel 打开 CSV 乱码？**
  * A: 请使用我们网页上的 "Export CSV" 按钮，它已自动添加 UTF-8 BOM 头，完美兼容 Excel。不要直接打开 `job_details.json`。

## 📝 许可证 (License)

MIT License
