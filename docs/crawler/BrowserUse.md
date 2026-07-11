---
title: Browser Use（agent爬虫）
tags:
  - browser-automation
  - scraping
  - python
date: 2026-06-21
---



# Browser Use 使用教程 — 从入门到做应用

---

## 一、环境搭建

### 安装

```bash
# 创建虚拟环境
uv venv --python 3.12
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装核心库
uv add "browser-use[core]"

# 安装浏览器
uv run browser-use install
```

### 验证安装

```python
from browser_use import Agent
print('OK')
```

### API Key 配置

创建 `.env`:

```env
# 选一个即可
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
```

---

## 二、核心 API

### 2.1 Agent — 智能体

Agent 是最核心的类。它接收任务，驱动浏览器完成。

```python
from browser_use import Agent

agent = Agent(
    task="完成什么任务",     # 自然语言描述
    llm=llm,               # LLM 实例
    browser=browser,       # 浏览器（可选，不传则自动创建）
    use_vision=True,       # 是否用截图视觉
    max_failures=5,        # 连续失败几次后停止
)

result = await agent.run(max_steps=50)
```

**同步调用**（不需要自己写 asyncio）：

```python
agent.run_sync()
```

### 2.2 BrowserSession — 浏览器会话

管理浏览器窗口、CDP 连接、事件。

```python
from browser_use import BrowserSession

browser = BrowserSession(
    headless=False,                     # 显示窗口
    keep_alive=True,                    # Agent 结束后保留
    channel='chrome',                   # 用系统 Chrome
    window_size={'width': 1280, 'height': 720},
    captcha_solver=True,                # 验证码处理
)
```

### 2.3 ActionResult — 工具返回值

所有工具必须返回 `ActionResult`：

```python
from browser_use import ActionResult

# 成功返回
ActionResult(extracted_content='给LLM看的结果')

# 带长文本（LLM 只看摘要，全量存记忆）
ActionResult(
    extracted_content='已提取 10000 字符',
    long_term_memory='完整内容...',
)

# 错误
ActionResult(error='失败原因')
```

---

## 三、各种 LLM 的接入

### OpenAI (官方推荐)

```python
from browser_use.llm.openai.chat import ChatOpenAI

llm = ChatOpenAI(
    model='gpt-4o',
    api_key='...',
    temperature=0.2,
)
```

### Anthropic Claude

```python
from browser_use.llm.anthropic.chat import ChatAnthropic

llm = ChatAnthropic(
    model='claude-sonnet-4-20250514',
    api_key='...',
    max_tokens=8192,
)
```

### DeepSeek (便宜，需适配)

> DeepSeek 不支持 `response_format=json_schema`，需要用 `json_object` 模式。

```python
from browser_use.llm.openai.chat import ChatOpenAI

# 直接使用会报错，因为 browser-use 默认传 json_schema
# 需要自定义 ainvoke，见 deepseek_llm.py

llm = ChatOpenAI(
    model='deepseek-chat',
    api_key='...',
    base_url='https://api.deepseek.com',
    temperature=0.0,
)
```

完整适配代码见 `deepseek_llm.py`，核心思路：

```
response_format=json_schema  →  DeepSeek 不支持 → 报 400
                   ↓
dont_force_structured_output=True   →  不传 response_format
add_schema_to_system_prompt=True    →  schema 放 system prompt
                   ↓
模型输出可能带 markdown 或截断 → 客户端 Pydantic 验证 + 清理
                   ↓
改用 json_object 模式 → DeepSeek 支持，强制输出 JSON
```

### Google Gemini

```python
from browser_use.llm.google.chat import ChatGoogle

llm = ChatGoogle(model='gemini-2.5-pro', api_key='...')
```

### Ollama (本地模型)

```python
from browser_use.llm.ollama.chat import ChatOllama

llm = ChatOllama(model='llama3', num_ctx=8192)
```

---

## 四、Agent 任务编写技巧

### 4.1 好任务 vs 差任务

```
好的:
  "打开 github.com，在搜索框输入 browser-use，回车，
   点击第一个结果，读取 star 数并返回。"

差的:
  "帮我看看 browser-use 的 star 数"
```

### 4.2 处理不确定性

```
  "打开 https://example.com。
   如果有年龄验证弹窗，点击确认。
   如果出现广告，关闭它。
   等待内容加载完成，然后提取正文。"
```

### 4.3 常见场景模板

**搜索 + 提取信息：**

```python
task = (
    '打开 https://www.google.com.\n'
    '在搜索框输入 "browser-use github".\n'
    '点击第一个搜索结果.\n'
    '读取页面的 star 数量.\n'
    '调用 done 返回结果.\n'
)
```

**表单填写：**

```python
task = (
    '打开 https://example.com/login.\n'
    '输入用户名: admin\n'
    '输入密码: 123456\n'
    '点击登录按钮.\n'
    '等待跳转到后台.\n'
)
```

**多页面操作：**

```python
task = (
    '打开 Gmail.\n'
    '搜索标题包含 "report" 的邮件.\n'
    '打开最新的那封.\n'
    '下载附件.\n'
)
```

### 4.4 max_steps 怎么设

| 任务复杂度 | max_steps | 说明 |
|:---:|:---:|:---|
| 打开页面 + 读内容 | 5-10 | 导航、处理弹窗、提取 |
| 搜索 + 提取 | 10-20 | 导航、输入、点击、读结果 |
| 多步骤流程 | 20-50 | 登录、翻页、填表 |
| 复杂交互 | 50+ | 多页面、上传下载 |

---

## 五、自定义 Tools — 扩展 Agent 能力

### 5.1 为什么需要自定义工具

内置工具只能做通用操作（点击、输入、导航）。自定义工具可以：

- 执行 JavaScript 直接操作页面
- 调用外部 API
- 读写文件
- 执行任意 Python 代码

### 5.2 基本模式

```python
from pydantic import BaseModel, Field
from browser_use import ActionResult
from browser_use.tools.service import Tools

# 1. 定义参数
class MyAction(BaseModel):
    url: str = Field(..., description='URL')

# 2. 创建工具集
tools = Tools()

# 3. 注册动作
@tools.action('动作描述', param_model=MyAction)
async def my_action(params: MyAction, browser_session):
    # 使用 browser_session 操作浏览器
    page = await browser_session.must_get_current_page()
    result = await page.evaluate('() => document.title')
    return ActionResult(extracted_content=result)

# 4. 传给 Agent
agent = Agent(..., tools=tools)
```

### 5.3 常用注入参数

| 参数 | 类型 | 用途 |
|:---|:---|:---|
| `browser_session` | BrowserSession | 浏览器操作 |
| `page_extraction_llm` | BaseChatModel | 内容提取 LLM |
| `file_system` | FileSystem | 文件读写 |
| `available_file_paths` | list[str] | 允许的文件路径 |
| `cdp_client` | CDPClient | 直接 CDP 命令 |

### 5.4 实用工具示例

**提取正文 (0 token)：**

```python
class ExtractTextAction(BaseModel):
    css_selector: str = Field(
        default='.content, #content, article',
        description='CSS 选择器，逗号分隔'
    )

@tools.action('提取页面可见文本', param_model=ExtractTextAction)
async def extract_text(params, browser_session):
    page = await browser_session.must_get_current_page()
    js = '(s) => { for (const sel of s) { const el = document.querySelector(sel); if (el && el.innerText.trim().length > 100) return el.innerText; } return null; }'
    text = await page.evaluate(js, [s.strip() for s in params.css_selector.split(',')])
    if not text:
        text = await page.evaluate('() => document.body.innerText')
    text = text.strip()
    with open('extracted.md', 'w', encoding='utf-8') as f:
        f.write(text)
    return ActionResult(extracted_content=f'已保存 ({len(text)} 字符)')
```

**保存文件：**

```python
class SaveToFileAction(BaseModel):
    content: str = Field(..., description='内容')
    filename: str = Field(default='output.md', description='文件名')

@tools.action('将内容保存到文件', param_model=SaveToFileAction)
async def save_file(params, file_system):
    path = file_system.write(params.filename, params.content)
    return ActionResult(extracted_content=f'已保存到 {path}')
```

**执行 JavaScript：**

```python
class RunJSAction(BaseModel):
    code: str = Field(..., description='JavaScript 代码')

@tools.action('在页面执行 JS', param_model=RunJSAction)
async def run_js(params, browser_session):
    page = await browser_session.must_get_current_page()
    result = await page.evaluate(f'() => {{ {params.code} }}')
    return ActionResult(extracted_content=str(result))
```

---

## 六、浏览器配置

### 6.1 基础配置

```python
browser = BrowserSession(
    headless=False,           # True=无头模式
    keep_alive=True,          # 保持连接
    channel='chrome',         # 用 Chrome / msedge / chromium
    window_size={'width': 1280, 'height': 720},
)
```

### 6.2 反检测

```python
browser = BrowserSession(
    channel='chrome',         # 系统 Chrome > Chromium
    args=[                    # 额外启动参数
        '--disable-blink-features=AutomationControlled',
    ],
    ignore_default_args=[     # 去掉自动化标记
        '--enable-automation',
    ],
)
```

### 6.3 远程浏览器

```python
browser = BrowserSession(
    cdp_url='http://localhost:9222',  # 连已有浏览器
)
```

### 6.4 用户数据目录（保持登录态）

```python
browser = BrowserSession(
    user_data_dir='./chrome_profile',  # 保存 cookies 登录态
)
```

---

## 七、做应用：完整项目结构

### 7.1 推荐项目结构

```
my-app/
├── main.py                 # 入口
├── llm_adapter.py          # LLM 适配（如 deepseek）
├── tools.py                # 自定义工具
├── crawlers/               # 爬虫类
│   ├── novel_crawler.py
│   └── ...
├── .env                    # API Key
├── pyproject.toml
└── README.md
```

### 7.2 应用模式 1：Agent 导航 + CDP 提取

适合：内容提取、爬虫

```
Agent 3-5 步导航 + 处理弹窗
        ↓
调用自定义工具 → CDP/JS 直接提取
        ↓
保存结果到文件
```

代码结构：

```python
# tools.py
@tools.action('提取正文', param_model=ExtractTextAction)
async def extract_text(params, browser_session):
    # CDP 直接提取，0 token
    ...

# main.py
agent = Agent(task='打开 URL，处理弹窗，提取内容', llm=llm, browser=browser, tools=tools)
await agent.run(max_steps=10)
```

### 7.3 应用模式 2：纯 Agent 驱动

适合：需要理解页面内容的场景

```
Agent 全程 LLM 驱动
  每步: 看页面 → 决策 → 执行 → 循环
```

```python
agent = Agent(
    task='浏览网页，理解内容，回答问题',
    llm=llm,
    use_vision=True,   # 开启视觉理解
)
await agent.run(max_steps=30)
```

### 7.4 应用模式 3：混合

适合：复杂工作流

```
阶段 1: Agent 导航到页面
阶段 2: CDP 提取结构化数据
阶段 3: LLM 分析提取结果
阶段 4: Agent 执行后续操作
```

```python
# 导航
agent1 = Agent(task='登录并打开报表页', llm=llm)
await agent1.run(max_steps=10)

# 提取
page = await browser.must_get_current_page()
data = await page.evaluate('() => /* 提取报表数据 */')

# 分析
agent2 = Agent(task=f'分析这份数据: {data[:2000]}', llm=llm)
```

---

## 八、常见问题

### 8.1 DeepSeek 报 400 错误

> DeepSeek 不支持 `response_format=json_schema`。
>
> 解决：用 `dont_force_structured_output=True` + `json_object` 模式，见 `deepseek_llm.py`。

### 8.2 内容被截断

> `max_clickable_elements_length=40000` 限制 DOM 文本长度。
>
> 解决：不用加大这个值，而是用 CDP 直接提取（`page.evaluate`），0 token 且无长度限制。

### 8.3 Agent 卡住不动

> 检查 `max_failures` 和 `use_vision`。如果页面没有变化，Agent 可能陷入循环。
>
> 解决：task 中明确告诉 Agent "如果没变化就等待"。

### 8.4 浏览器被关闭

> Agent 执行完后默认关闭浏览器。
>
> 解决：`BrowserSession(headless=False, keep_alive=True)`。

### 8.5 Cloudflare 安全验证

> Browser Use 已隐藏自动化标记，但 Cloudflare 仍可能拦截。
>
> 解决：
> - 使用 `channel='chrome'`（系统 Chrome）
> - task 中写"如果遇到验证，等待 5-10 秒"
> - 如果频繁触发，考虑降低请求频率

### 8.6 Token 消耗太大

> 每个 step 把整个 DOM 发给 LLM。
>
> 解决：
> - `use_vision=False` 省截图 token
> - 用自定义工具替代 LLM 操作（如 JS 提取）
> - 降低 `max_clickable_elements_length`
> - 用 DeepSeek 替代 OpenAI（价格约 1/20）

---

## 总结

| 你想做什么 | 用什么方式 |
|:---|:---|
| 提取静态页面内容 | `requests` + `BeautifulSoup`，0 token |
| 提取 JS 渲染的页面内容 | `NovelCrawler`（Agent 导航 + CDP 提取） |
| 搜索 + 提取信息 | Agent 全程驱动 |
| 表单填写 / 登录 | Agent 驱动 |
| 复杂工作流 | 混合模式 |
