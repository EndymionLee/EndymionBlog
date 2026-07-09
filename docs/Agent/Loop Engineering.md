---
title: Loop Engineering
date: 2026-03-12
---
# Loop Engineering：从 Prompt 设计到循环设计

## 概述

Loop Engineering（循环工程）是 2026 年在 Agent 开发领域迅速流行起来的概念。核心思想是：

> **不再只设计 Prompt，而是设计 Agent 如何持续工作。**

它被认为是 Prompt Engineering 之后的下一个重要能力。Claude Code 团队、OpenAI 社区以及 Google 工程师的讨论将其推向了前台。([Business Insider](https://www.businessinsider.com/what-are-loops-ai-engineering-tips-2026-6))

---

## 为什么需要 Loop Engineering？

### 传统模式：人在回路中

传统使用 LLM 的方式：

```text
人 → Prompt → LLM → Answer
```

例如：

```text
人：帮我写一个爬虫
LLM：这里是代码
人：修改一下
LLM：修改后的代码
```

整个过程是 `Human → Prompt → LLM → Prompt → LLM`，**人一直在中间**。

### Agent 模式：机器自主循环

以 Claude Code、Codex 为代表的 Agent 工具改变了这一点：

```text
Goal: 实现一个小说网站爬虫

Agent →
    分析任务
    生成代码
    运行
    测试
    发现错误
    修改
    重新运行
    ...
    直到完成
```

人只说一句"完成这个项目"，剩下几十轮 Prompt 全是 Agent 自己生成。

结论：**Prompt 不是不重要了，而是变成 Agent 内部自己生成。人真正要设计的是 Agent 怎么循环工作。**

---

## Loop 是什么？

本质就是一个工作循环：

```text
while not Done:
    Observe()
    Think()
    Use Tools()
    Verify()
    Update Memory()
    Decide Next Step()
```

用修复 Bug 来举例：

```text
任务：修复仓库 Bug

Loop：
① 找 Bug
② 创建计划
③ 修改代码
④ 编译
⑤ 测试
⑥ 失败？→ 继续修改 → 回到 ③
⑦ 成功？→ 结束
```

整个就是一个 Loop。

---

## Prompt Engineering vs Loop Engineering

**以前：**

```text
Prompt → 模型
```

**现在：**

```text
Loop → Prompt → 模型
```

Prompt 只是 Loop 的一个节点。

```text
Loop
 ├── Prompt
 ├── Tool
 ├── Memory
 ├── Judge
 └── Retry
```

Prompt 只占其中约 20%。

---

## 一个 Coding Agent Loop 实例

以 Cursor、Claude Code 的工作流程为例：

```text
读取 TODO
    ↓
生成 Plan
    ↓
修改文件
    ↓
运行 pytest
    ↓
失败？ → 修复 → 再次 pytest
    ↓
成功 → Git Commit → 结束
```

真正循环的核心是 `Read → Code → Test → Fix → Repeat`，而不是 `Prompt → Answer`。

---

## Loop 的核心模块

一个完整的 Agent Loop 通常包含以下模块：

### ① Trigger（触发）

什么条件下启动 Loop：

```text
Git Push
每天晚上定时
收到 Issue
收到邮件
```

### ② Goal（目标）

Agent 一直执行，直到目标满足：

```text
修复 Issue #123
更新 README
同步 RSS
整理小说数据库
```

### ③ Planner（规划）

Agent 自主拆解任务：

```text
任务 → 子任务1 → 子任务2 → 子任务3
```

甚至派发到子 Agent：

```text
Main Agent
 ├── SubAgent A
 ├── SubAgent B
 └── SubAgent C
```

### ④ Action（执行）

调用各类工具：

```text
Shell / Python / Git / Browser / MCP / Database
```

### ⑤ Verify（验证）— 最关键的一环

验证机制是整个 Loop 的瓶颈：

```text
pytest
lint
benchmark
单元测试
截图比较
LLM Review
```

> **模型不是瓶颈，Verifier 才是瓶颈。**
>
> 如果不会判断结果是否正确，再聪明的 Agent 也可能无限循环或重复犯同样的错误。([AI Builder Club](https://www.aibuilderclub.com/blog/loop-engineering-guide-2026))

### ⑥ Retry（重试）

失败后的恢复策略：

```text
失败 → 重新规划 → 继续执行 → 直到 Done
```

---

## 为什么 Loop Engineering 最近突然火了？

三个主要原因：

1. **Claude Code 团队**：负责人提到几乎不再亲自写 Prompt，而是写让 Agent 自己工作的 Loop。([Business Insider](https://www.businessinsider.com/what-are-loops-ai-engineering-tips-2026-6))
2. **主流工具转型**：OpenAI Codex、Claude Code 等工具越来越强调 Goal 驱动，让 Agent 自主完成任务，而非每一步等待人工输入。([Business Insider](https://www.businessinsider.com/what-are-loops-ai-engineering-tips-2026-6))
3. **工程实践发现**：Prompt 已不是主要瓶颈，真正影响效果的是任务拆解、工具调用、验证机制和停止条件——也就是整个控制流程。([LangChain](https://www.langchain.com/blog/the-art-of-loop-engineering))

---

## 举例：小说爬虫 Agent 的设计对比

### Prompt Engineering 方式

```text
Prompt：帮我写番茄小说爬虫
```

结束。一次调用，一次结果。

### Loop Engineering 方式

```text
while True:
    ↓
获取任务
    ↓
读取配置
    ↓
发现平台
    ↓
调用对应 Spider
    ↓
下载小说
    ↓
去重
    ↓
存数据库
    ↓
校验章节
    ↓
缺章节？ → 重新抓
    ↓
更新 Index
    ↓
生成日志
    ↓
发送通知
    ↓
等待下一次
```

这里真正设计的是**整个工作流**，而不是某一句 Prompt。

---

## 参考来源

- [Business Insider: Forget prompt engineering, &#39;Loop engineering&#39; is all the rage now](https://www.businessinsider.com/what-are-loops-ai-engineering-tips-2026-6)
- [AI Builder Club: Loop Engineering Guide (2026)](https://www.aibuilderclub.com/blog/loop-engineering-guide-2026)
- [LangChain: The Art of Loop Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering)
