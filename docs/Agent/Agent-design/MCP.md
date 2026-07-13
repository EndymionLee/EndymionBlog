---
title: MCP
date: 2026-03-12
---



# MCP 理解：从一个简单 Server 看懂 MCP 的本质

# 一、先看代码

```python
from mcp.server.fastmcp import FastMCP
import math

mcp = FastMCP("MCP学习")


@mcp.tool()
def add(a: float, b: float) -> float:
    """两数相加"""
    return a + b


@mcp.tool()
def calc(expr: str) -> str:
    """计算数学表达式"""
    ...


@mcp.tool()
def weather(city: str) -> str:
    """查询城市天气"""
    ...
```

启动：

```python
mcp.run(transport="stdio")
```

------

# 二、一句话理解这个程序

这个程序本质上就是：

> 把三个 Python 函数暴露给大模型调用。

即：

```text
add
calc
weather
```

全部变成：

```text
MCP Tool
```

------

# 三、它到底是什么？

你可以把它理解成：

```text
普通软件
        ↓
MCP Server
        ↓
LLM 可以操作的软件
```

------

# 四、整个系统结构

```text
用户
 ↓
LLM
 ↓
MCP Client
 ↓
JSON-RPC
 ↓
你的 MCP Server
 ↓
Python 函数
```

例如：

```text
用户：
北京天气怎么样？
```

流程：

```text
LLM
 ↓
weather("北京")
 ↓
返回结果
 ↓
组织语言回答用户
```

------

# 五、MCP Server 干了什么？

创建：

```python
mcp = FastMCP("MCP学习")
```

相当于：

```text
创建一个 MCP 服务。
```

里面注册了：

```text
add
calc
weather
```

最终：

```text
MCP Server
├── add
├── calc
└── weather
```

------

# 六、@mcp.tool() 做了什么？

很多人以为：

```python
@mcp.tool()
```

只是个装饰器。

实际上它做了三件事：

------

## ① 注册函数

```text
add
calc
weather
```

全部加入工具列表。

------

## ② 自动生成 Schema

例如：

```json
{
  "name": "add",
  "description": "两数相加",
  "parameters": {
    "a": "number",
    "b": "number"
  }
}
```

LLM 才知道：

```text
这个工具叫什么？
参数是什么？
返回什么？
```

------

## ③ 暴露成 JSON-RPC 接口

变成：

```text
tools/list
tools/call
```

供 MCP Client 调用。

------

# 七、LLM 怎么知道有哪些工具？

MCP Client 会先发送：

```json
{
  "method": "tools/list"
}
```

你的 Server 返回：

```json
{
  "tools": [
    {
      "name": "add",
      "description": "两数相加"
    },
    {
      "name": "calc",
      "description": "计算表达式"
    },
    {
      "name": "weather",
      "description": "查询天气"
    }
  ]
}
```

然后：

```text
LLM 知道了：

我现在拥有三个工具。
```

------

# 八、调用 add 工具

用户：

```text
3+5是多少？
```

LLM：

```text
有一个 add 工具。
```

于是发送：

```json
{
  "method": "tools/call",
  "params": {
    "name": "add",
    "arguments": {
      "a": 3,
      "b": 5
    }
  }
}
```

Server：

```python
add(3, 5)
```

返回：

```json
{
  "result": 8
}
```

LLM：

```text
3+5=8。
```

------

# 九、调用 weather 工具

用户：

```text
北京天气怎么样？
```

LLM：

```json
{
  "method": "tools/call",
  "params": {
    "name": "weather",
    "arguments": {
      "city": "北京"
    }
  }
}
```

Server：

```python
weather("北京")
```

返回：

```json
{
  "温度": 28,
  "天气": "晴"
}
```

LLM：

```text
北京当前天气晴，温度28℃。
```

------

# 十、调用 calc 工具

用户：

```text
sqrt(16)+10
```

LLM：

```json
{
  "method": "tools/call",
  "params": {
    "name": "calc",
    "arguments": {
      "expr": "sqrt(16)+10"
    }
  }
}
```

Server：

```python
calc("sqrt(16)+10")
```

返回：

```text
14
```

LLM：

```text
结果是14。
```

------

# 十一、整个调用流程图

```text
用户
 ↓
LLM
 ↓
MCP Client
 ↓
tools/call
 ↓
MCP Server
 ↓
Python函数
 ↓
返回结果
 ↓
LLM
 ↓
用户
```

------

# 十二、这里面有 Agent 吗？

没有。

这里只有：

```text
LLM
+
MCP Server
```

------

如果是 Agent：

```text
Planner
 ↓
Worker Agent
 ↓
MCP Client
 ↓
MCP Server
```

MCP 只是 Agent 获得能力的一种方式。

------

# 十三、MCP 与 FastAPI 的区别

## FastAPI

```python
@app.post("/add")
def add(a, b):
    return a+b
```

作用：

```text
给程序调用。
```

------

## MCP

```python
@mcp.tool()
def add(a, b):
    return a+b
```

作用：

```text
给大模型调用。
```

------

# 十四、最重要的理解

很多人以为：

```text
MCP = Function Calling
```

其实不完全对。

MCP：

```text
Function Calling
+
标准协议
+
工具发现
+
资源管理
+
Prompt管理
+
上下文共享
```

比普通 Function Calling 更强。

------

# 十五、如果做成小说翻译软件

例如：

```python
@mcp.tool()
def open_book(path):
    ...

@mcp.tool()
def translate_chapter(chapter_id):
    ...

@mcp.tool()
def export_epub():
    ...
```

那么：

```text
Claude
Codex
Cursor
你的 Agent Runtime
```

全部都可以操作软件。

------

# 十六、真正理解 MCP

```text
MCP 不是模型。

MCP 也不是 Agent。

MCP 是一种标准协议，
它允许软件把自己的能力暴露给 AI，
让 AI 像调用 API 一样操作软件。
```

或者：

```text
普通软件：
人点击按钮。

MCP 软件：
AI 点击按钮。
```

------

# 十七、总结

```text
@mcp.tool()
=
把 Python 函数包装成 AI 可以调用的工具。

MCP Server
=
把整个软件包装成 AI 可以操作的软件。

MCP
=
AI 世界的 USB 协议。
```