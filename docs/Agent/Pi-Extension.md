---
title: Pi-Extension
date: 2026-07-10
---

## 一、Pi Extension 介绍

Extension 是：

> **往 Pi Runtime 里面插功能。**

例如：

```
Pi Runtime

├── Tool
├── Prompt
├── Skill
├── Slash Command
├── Event
├── UI
├── Hook
├── Settings
└── Authentication
```

这些都可以通过 Extension 增加。



举几个实际例子

### ① 增加 Tool

例如：

```
Browser Tool
↓
Extension注册
↓
Agent可以调用
```

### ② 增加 Slash Command

例如：

```
/deploy
/review
/release
```

不是修改源码。

而是：

```
Extension
↓
注册Command
```

### ③ 监听 Runtime 生命周期（Hook）

作用：

监听 Runtime 生命周期。

例如：

```
Session Start

Tool Call

Provider Request

Provider Response

Session Shutdown
```

流程：

```
Agent
↓
事件
↓
Hook
↓
你的代码
```

适合：

- 日志
- 埋点
- 权限
- Token统计
- 安全控制



### ④ 修改 UI

例如：

```
Tool执行中...

显示Loading

显示颜色

显示进度
```

都可以通过 Extension。

### ⑤ 加新的配置

例如：

```
settings.json
↓
my-plugin.enable=true
```

Extension 可以读取自己的配置。

### ⑥ MCP

以后如果：

```
MCP
↓
注册
↓
Agent
```

也完全可以放进 Extension。



## 二、为什么要设计 Extension？

因为 Pi 想做到：

> **核心 Runtime 永远不要改。**

例如：

以前：

```
Pi
↓
加Git
↓
改源码
↓
重新发布
```

现在：

```
Git Extension
↓
安装
↓
完成
```

Runtime 完全不用动。

这就是插件化。



它其实是在分三层：

```
Application（你的产品）
↓
Extension（插件）
↓
Pi Runtime
```

Runtime 提供：

- Agent Loop
- Session
- Tool Calling
- Workflow
- Memory
- Event

Extension 提供：

- Tool
- Command
- Prompt
- Skill
- UI
- Hook
- 配置

Application 提供：

- 小说业务
- AI IDE
- Research
- Browser
- 商业逻辑



## 三、Pi Extension API

```
Extension

├── Tool
├── Prompt
├── Command
├── Skill
├── Event(Hook)
└── Config
```

说明：

> 一个 Extension 可以只包含 Tool，也可以同时包含 Prompt、Skill、Hook 等多个能力，它们共同组成一个完整插件。

目录

```
code-review-extension/

├── src/
│   ├── index.ts
│   ├── tools/
│   │      review.ts
│   ├── commands/
│   │      review.ts
│   └── hooks.ts
│
├── skills/
│   └── code-review/
│          SKILL.md
│
├── package.json
└── tsconfig.json
```



### 第一步：入口

```
// src/index.ts

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerReviewTool } from "./tools/review";
import { registerReviewCommand } from "./commands/review";

export default function (pi: ExtensionAPI) {

    console.log("Code Review Extension Loaded");

    registerReviewTool(pi);

    registerReviewCommand(pi);

    pi.on("session_start", async (_, ctx) => {

        ctx.ui.notify(
            "Code Review Extension Ready",
            "info"
        );

    });

}
```

整个插件就是一个入口。



### 第二步：注册 Tool

```
// tools/review.ts

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerReviewTool(pi: ExtensionAPI){

    pi.registerTool({

        name:"code_review",

        description:"Review source code",

        parameters:{

            type:"object",

            properties:{

                file:{
                    type:"string"
                }

            }

        },

        async execute({file}){

            const fs = await import("fs/promises");

            const content = await fs.readFile(file,"utf8");

            return{

                content:[

                    {

                        type:"text",

                        text:content

                    }

                ]

            }

        }

    });

}
```

以后 Agent：

```
帮我分析 src/main.ts
```

模型可以自己：

```
Tool Calling

↓

code_review

↓

返回源码

↓

开始分析
```



### 第三步：注册 Slash Command

```
// commands/review.ts

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerReviewCommand(pi:ExtensionAPI){

    pi.registerCommand({

        name:"review",

        description:"Review current project",

        async execute(args,ctx){

            await ctx.session.prompt(

`请Review整个项目。

重点：

1.

Bug

2.

Code Style

3.

Architecture

4.

Performance

5.

Security`

            );

        }

    });

}
```

以后：

```
/review
```

直接开始 Review。



### 第四步：监听 Hook

```
pi.on("tool_call",async(event)=>{

    console.log(

        "[Tool]",

        event.toolName

    );

});
```

例如：

```
Tool

↓

bash

↓

tool_call

↓

打印日志
```

以后：

这里可以：

- OpenTelemetry
- Langfuse
- ELK
- 埋点

全部放这里。



### 第五步：Skill

```
skills/

code-review/

SKILL.md
---
name: code-review

description: Review source code, detect bugs, improve architecture, and optimize performance.
---

# Code Review

Always check:

- Bug
- Security
- Performance
- Readability
- Naming
- Architecture
```

以后：

Agent：

发现：

```
Review

↓

自动加载 Skill
```



### 第六步：运行以后发生什么？

假设：

```
/review
```

整个流程：

```
                用户

                  │

                  ▼

              /review

                  │

                  ▼

         registerCommand()

                  │

                  ▼

     session.prompt(...)

                  │

                  ▼

              Agent

                  │

          加载Skill

                  │

                  ▼

       Tool Calling

                  │

                  ▼

      code_review Tool

                  │

                  ▼

          返回源码

                  │

                  ▼

             Claude
```

