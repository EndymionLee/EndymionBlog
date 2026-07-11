---
title: Playwright
tags:
  - playwright
  - browser-automation
  - scraping
  - python
date: 2026-06-19
---
# Playwright 教程

## 一、认识 Playwright

Playwright = 用代码控制浏览器的工具。打开网页、点按钮、填表单、取数据、截图、保存 PDF，所有需要 JS 渲染的页面都能处理。

对比 `requests`：

```text
requests.get(url)：只拿到 HTML 源码，JS 渲染的内容拿不到
Playwright：打开真实浏览器，JS 执行完再拿数据
```

### 安装

```bash
pip install playwright
playwright install chromium
```

### 基础用法

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)  # headless=True 不显示窗口
    page = browser.new_page()
    page.goto("https://example.com")
    page.wait_for_load_state("networkidle")

    title = page.title()
    content = page.content()
    text = page.inner_text("body")
    page.screenshot(path="screenshot.png")

    browser.close()
```

### 常用操作

```python
# 点击
page.click("button#submit")
page.click("text=登录")

# 填表单
page.fill("input#username", "myuser")
page.fill("input#password", "mypass")

# 选下拉框
page.select_option("select#city", "北京")

# 等待
page.wait_for_selector("div.result")        # 等元素出现
page.wait_for_timeout(2000)                 # 等 2 秒

# 滚动
page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

# 获取属性
href = page.get_attribute("a.link", "href")
```

### 提取数据

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://news.ycombinator.com")

    # CSS 选择器提取
    titles = page.query_selector_all(".titleline > a")
    for t in titles:
        print(t.inner_text(), t.get_attribute("href"))

    # 直接在浏览器中执行 JS
    data = page.evaluate("""
        () => Array.from(document.querySelectorAll('.item')).map(el => ({
            title: el.querySelector('.title').innerText,
            url: el.querySelector('a').href,
        }))
    """)

    browser.close()
```

### 异步版本

```python
from playwright.async_api import async_playwright
import asyncio


async def scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://example.com")
        text = await page.inner_text("body")
        await browser.close()
        return text


result = asyncio.run(scrape())
```

### 反检测

```python
browser = p.chromium.launch(
    headless=False,            # 有头模式更像真人
    slow_mo=100,               # 操作慢一点
)

# 模拟移动端
iphone = p.devices["iPhone 13"]
page = browser.new_page(**iphone)

# 注入反检测脚本
page.add_init_script("""
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
""")
```

---
## 二、Cookie 与登录态

### 方式 1：手动注入 cookie

```python
from playwright.async_api import async_playwright


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()

        await context.add_cookies([
            {
                "name": "sessionid",
                "value": "xxxxxx",
                "domain": ".example.com",
                "path": "/"
            }
        ])

        page = await context.new_page()
        await page.goto("https://example.com")
        await browser.close()
```

### 方式 2：保存/读取完整登录态（推荐）

登录一次，保存状态：

```python
async def save_state():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto("https://example.com/login")
        await page.wait_for_timeout(30000)           # 手动登录
        await context.storage_state(path="state.json")  # 保存 cookie + localStorage
        await browser.close()
```

复用登录态：

```python
async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(storage_state="state.json")
        page = await context.new_page()
        await page.goto("https://example.com")
        await browser.close()
```

这个方式是工程标准方案：cookie + localStorage + session 全保留，抗反爬更强，最稳定。

### 方式 3：直接设置 HTTP headers

```python
context = await browser.new_context(
    extra_http_headers={
        "cookie": "sessionid=xxxx; token=yyyy"
    }
)
```

---

