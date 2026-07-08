---
title: Agentic RL
date: 2026-07-04
---



**Agentic RL（Agentic Reinforcement Learning，智能体强化学习）** 是 2026 年 AI 圈非常热门的概念，它可以理解为：

> **用强化学习训练 AI Agent 的整个行为过程，而不是只训练它回答一句话。**

它是 Reinforcement Learning（RL）在 Agent 时代的发展方向。

------

## 为什么会有 Agentic RL？

先看三个时代。

### 第一代：预测下一个 Token

GPT 最初训练目标是：

```
输入：
今天天气很

预测：
好
```

训练目标：

```
P(next token)
```

模型只学习：

> 如何把下一句话预测正确。

------

### 第二代：RLHF

后来加入了强化学习。

例如：

```
用户：
写一个 Python 排序

模型A：
代码正确

模型B：
代码有 bug
```

人工打分：

```
A：10分

B：2分
```

模型不断优化：

```
Prompt

↓

Answer

↓

Reward
```

奖励的是：

**一次回答。**

------

### 第三代：Agent

现在变成：

```
目标：

修复整个仓库
```

Agent 会：

```
分析

↓

列计划

↓

调用工具

↓

修改代码

↓

运行测试

↓

继续修改

↓

Git Commit
```

这里已经不是：

```
Prompt

↓

Answer
```

而是：

```
Goal

↓

很多很多 Action
```

于是问题来了：

**奖励应该给谁？**

不是某一句话。

而是：

整个过程。

------

# Agentic RL 的核心

以前 RL：

```
State

↓

LLM

↓

Answer

↓

Reward
```

现在：

```
State

↓

Agent

↓

Action1

↓

Action2

↓

Action3

↓

......

↓

Goal 达成

↓

Reward
```

奖励的是：

整个 Trajectory（轨迹）。

------

## 一个 Coding Agent 举例

例如：

目标：

```
修复 Issue #52
```

Agent：

```
① 看 Issue

↓

② 找代码

↓

③ 修改

↓

④ pytest

↓

失败

↓

⑤ 修改

↓

pytest

↓

成功

↓

Commit
```

最后：

```
Tests 全过

+1 Reward
```

或者：

```
死循环

-1 Reward
```

RL 学的是：

整个循环。

不是：

```
print("hello")
```

是不是漂亮。

------

# 和传统 RL 有什么区别？

传统 RL：

```
Agent

↓

左

右

上

下
```

例如：

机器人。

Agentic RL：

```
Action：

Search()

Open()

Read()

Write()

Shell()

Python()

Browser()

Git()

MCP()
```

Action 不再是：

```
Left
Right
```

变成了：高层行为。

------

## 状态(State)

传统：

```
机器人位置
```

Agentic：

```
Memory

Context

History

Workspace

Files

Logs

Tool Output
```

状态非常大。

甚至：

几十万 Token。

------

## Action

传统：

```
Move Left
```

Agent：

```
Run Shell

Read File

Call API

Edit Code

Search

Delegate
```

------

## Reward

以前：

```
到了终点

+100
```

现在：

可能很多指标：

```
Tests Pass

+50

Lint Pass

+10

速度快

+5

Token 少

+3

Bug 少

+20
```

甚至：

```
用户满意

+100
```

------

# 为什么 Agentic RL 难？

最大的问题：

**Reward 非常稀疏（Sparse Reward）。**

例如：

```
Agent

↓

改代码

↓

改代码

↓

改代码

↓

40分钟

↓

Tests Pass
```

只有最后：

```
+1
```

前面：

不知道哪些 Action 有贡献。

这就是 RL 最大难点。

------

## 所以出现 Process Reward

不再是最后给奖励，变成了每一步。

例如：

```
Read README

+0.2

找到 Bug

+0.8

修改正确文件

+1

运行测试

+0.5

修复成功

+5
```

整个过程都有反馈。

------

# 为什么最近突然火？

主要原因有几个：

第一，越来越多的模型已经不只是聊天，而是在完成复杂任务，例如编程、科研、浏览网页等，一个任务可能持续几十甚至几百步。

第二，大家发现仅靠监督微调（SFT）和 RLHF 很难让 Agent 学会长期规划、合理使用工具和自我纠错，这些能力更适合通过强化学习优化整个决策过程。

第三，一些前沿模型（包括 OpenAI、Anthropic、Google DeepMind 等方向）都在探索让模型在真实或模拟环境中反复尝试，通过任务完成情况而不是单次回答质量来学习 Agent 能力。

------

# 和 Loop Engineering 的关系

**Loop Engineering**：

```
while not Done:

Observe

Think

Act

Verify

Retry
```

这是：

**Agent 的运行框架。**

而 Agentic RL：

就是训练：

```
这个 Loop 怎么跑最好。
```

例如：

Loop：

```
Read

↓

Code

↓

Test

↓

Fix

↓

Repeat
```

Agentic RL 学的是：

- 应该先读哪个文件？
- 什么时候调用搜索工具？
- 测试失败后继续修改还是重新规划？
- 什么时候应该停止？
- 如何减少无效循环？

因此，两者的关系可以概括为：

- **Loop Engineering**：设计 Agent 的执行流程（工程问题）。
- **Agentic RL**：通过强化学习优化这个执行流程中的决策策略（训练问题）。

------

## 结合AI Coding Agent

假设正在开发一个 Coding Agent。

Loop 是：

```
Receive Task
      │
      ▼
Plan
      │
      ▼
Read Files
      │
      ▼
Edit Code
      │
      ▼
Run Tests
      │
      ▼
Pass?
 ┌────┴────┐
 │         │
No        Yes
 │         │
 ▼         ▼
Replan   Finish
```

如果加入 Agentic RL，训练目标可能变成：

- 更快找到需要修改的文件（减少无关搜索）
- 更少产生无效修改（提高一次修改成功率）
- 更智能地选择工具（何时用 Shell、何时搜索、何时让子 Agent 工作）
- 避免陷入死循环（学会及时重新规划或终止）
- 在完成任务的同时减少时间和 Token 消耗

总结：

> Agentic RL 决定 Agent 在这个流程中“如何做决策才能获得最高长期收益”。偏机器学习与强化学习。