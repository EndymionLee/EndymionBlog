---
title: Pi-Extension
date: 2026-07-10
---
# Pi Extension 开发

> 来源：https://pi.dev/docs/latest/extensions

---

## 什么是 Extension

Extension 是 TypeScript 模块，运行在 Pi 的扩展系统中。它不需要编译，直接写 `.ts` 文件放到指定目录即可。

Extension 可以做的事情：

- 注册自定义工具给 LLM 调用
- 监听生命周期事件（拦截工具调用、修改上下文、定制压缩等）
- 添加自定义命令（如 `/mycommand`）
- 与用户交互（选择框、确认框、输入框、通知）
- 注册快捷键和 CLI 参数
- 动态注册 LLM 提供商

---

## 快速开始

创建一个 `.ts` 文件（比如放在 `~/.pi/agent/extensions/` 或项目 `.pi/extensions/` 下）：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // 1. 监听事件
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("扩展已加载！", "info");
  });

  // 2. 注册工具
  pi.registerTool({
    name: "greet",
    label: "问候",
    description: "向某人打招呼",
    parameters: Type.Object({
      name: Type.String({ description: "名字" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `你好，${params.name}！` }],
        details: {},
      };
    },
  });

  // 3. 注册命令
  pi.registerCommand("hello", {
    description: "打招呼",
    handler: async (args, ctx) => {
      ctx.ui.notify(`你好 ${args || "世界"}！`, "info");
    },
  });
}
```

测试运行：`pi -e ./my-extension.ts`

---

## 存放位置

| 位置                                  | 作用范围           | 自动发现           |
| ------------------------------------- | ------------------ | ------------------ |
| `~/.pi/agent/extensions/*.ts`       | 全局（所有项目）   | 是                 |
| `~/.pi/agent/extensions/*/index.ts` | 全局（子目录）     | 是                 |
| `.pi/extensions/*.ts`               | 项目本地           | 是（项目受信任后） |
| `.pi/extensions/*/index.ts`         | 项目本地（子目录） | 是                 |

也支持通过 `settings.json` 添加 npm 包或 git 仓库源：

```json
{
  "packages": ["npm:@foo/bar@1.0.0"],
  "extensions": ["/path/to/extension.ts"]
}
```

---

## 事件系统

Extension 最强大的能力是**监听和干预 Pi 的每个环节**。

### 完整事件流

```
pi 启动
  │
  ├─► session_start
  ├─► resources_discover
  │
  ▼
用户发送 prompt
  │
  ├─► input — 拦截/转换用户输入
  ├─► before_agent_start — 注入消息、修改系统提示
  ├─► agent_start / agent_end
  ├─► message_start / message_update / message_end
  │
  │   LLM 可能调工具：
  │     ├─► tool_call — 可阻止执行
  │     ├─► tool_execution_start/update/end
  │     ├─► tool_result — 可修改结果
  │
  └─► agent_settled — 完全完成
```

### 常用事件

**拦截危险命令：**

```typescript
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash" && event.input.command.includes("rm -rf")) {
    const ok = await ctx.ui.confirm("危险操作！", "允许吗？");
    if (!ok) return { block: true, reason: "用户拒绝" };
  }
});
```

**修改用户输入：**

```typescript
pi.on("input", async (event, ctx) => {
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };  // 不发给 LLM
  }
  return { action: "continue" };
});
```

**注入额外上下文：**

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  return {
    message: {
      customType: "my-ext",
      content: "额外的上下文信息",
      display: true,
    },
  };
});
```

**修改工具执行结果：**

```typescript
pi.on("tool_result", async (event, ctx) => {
  // 在工具结果发给 LLM 之前修改它
  return { content: [...], details: {...}, isError: false };
});
```

---

## ExtensionContext

所有事件处理器都会收到 `ctx: ExtensionContext`，提供这些能力：

**用户交互：**

```typescript
ctx.ui.select("选择", ["选项1", "选项2"])       // 选择器
ctx.ui.confirm("标题", "确定吗？")                // 确认框
ctx.ui.input("标题", "占位符")                    // 输入框
ctx.ui.notify("消息", "info")                     // 通知
ctx.ui.editor("标题", "预填文本")                 // 多行编辑器
ctx.ui.setStatus("key", "文本")                   // 设置状态栏
ctx.ui.setWidget("key", ["行1", "行2"])           // 编辑区上方显示
```

**运行信息：**

```typescript
ctx.mode        // "tui" | "rpc" | "print"
ctx.hasUI       // 是否有交互界面
ctx.cwd         // 当前工作目录
```

**会话控制：**

```typescript
ctx.isIdle()               // Agent 是否空闲
ctx.abort()                // 中止
ctx.shutdown()             // 请求关机
ctx.compact({...})         // 触发压缩
ctx.getSystemPrompt()      // 获取当前系统提示
```

---

## 注册工具

```typescript
pi.registerTool({
  name: "my_tool",
  label: "我的工具",
  description: "这个工具做什么（LLM 看到这段描述来决定是否调用）",
  parameters: Type.Object({
    input: Type.String({ description: "输入值" }),
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return {
      content: [{ type: "text", text: `结果: ${params.input}` }],
      details: {},
    };
  },
});
```

- 工具可以随时注册（不限于扩展工厂函数），注册后立即可用
- 可以和内置工具同名来覆盖它（如 `name: "bash"`）
- 修改文件的工具建议使用 `withFileMutationQueue()` 共享文件锁
- `execute` 中 throw error → 标记为失败；正常 return → 标记为成功

---

## 注册命令

```typescript
pi.registerCommand("deploy", {
  description: "部署到环境",
  getArgumentCompletions: (prefix) => {
    return ["dev", "staging", "prod"]
      .filter(e => e.startsWith(prefix))
      .map(e => ({ value: e, label: e }));
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`部署到: ${args}`, "info");
  },
});
```

---

## 注册快捷键

```typescript
pi.registerShortcut("ctrl+shift+p", {
  description: "切换模式",
  handler: async (ctx) => { ctx.ui.notify("已切换！"); },
});
```

---

## 注册 CLI 参数

```typescript
pi.registerFlag("plan", {
  description: "以计划模式启动",
  type: "boolean",
  default: false,
});

if (pi.getFlag("plan")) {
  // 计划模式
}
```

---

## 持久化与恢复

**存储自定义数据（不发给 LLM）：**

```typescript
pi.appendEntry("my-state", { count: 42 });

// 恢复
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === "my-state") {
      // 从 entry.data 恢复状态
    }
  }
});
```

**发送自定义消息（会发给 LLM）：**

```typescript
pi.sendMessage({
  customType: "my-ext",
  content: "上下文消息",
  display: true,
}, { triggerTurn: true, deliverAs: "steer" });
```

---

## 跨扩展通信

```typescript
// 扩展 A 发送
pi.events.emit("my:event", { data: 123 });

// 扩展 B 接收
pi.events.on("my:event", (data) => { console.log(data); });
```

---

## 注册 Provider

```typescript
pi.registerProvider("local-model", {
  baseUrl: "http://localhost:1234/v1",
  apiKey: "$LOCAL_API_KEY",
  api: "openai-completions",
  models: [{
    id: "my-model", name: "My Model",
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000, maxTokens: 4096,
  }],
});
```

---

## PiExample 实战

在项目 `.pi/extensions/` 下创建一个日志扩展：

```typescript
// .pi/extensions/logger.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  const logDir = join(process.cwd(), ".logs");
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

  pi.on("message_end", async (event) => {
    if (event.message.role === "user") {
      const text = extractText(event.message);
      if (text) {
        const ts = new Date().toISOString().slice(0, 10);
        appendFileSync(join(logDir, `${ts}.log`),
          `[${new Date().toLocaleTimeString()}] 用户: ${text}\n`, "utf-8");
      }
    }
  });

  pi.registerCommand("logs", {
    description: "查看今日日志",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`日志目录: ${logDir}`, "info");
    },
  });
}

function extractText(msg: any): string | null {
  if (!msg.content) return null;
  if (typeof msg.content === "string") return msg.content;
  const texts = msg.content.filter((c: any) => c.type === "text").map((c: any) => c.text);
  return texts.length > 0 ? texts.join("") : null;
}
```

放到 `.pi/extensions/logger.ts` 后，Pi 会自动加载它。每次用户说话，都会被记录到 `.logs/` 目录下的文件中。

---

## 扩展加载

| 方式                               | 扩展文件放哪              | 路径解析基准           |
| ---------------------------------- | ------------------------- | ---------------------- |
| 方式一：`additionalExtensionPaths` | 任意位置                  | 项目根目录（cwd）      |
| 方式二：`.pi/extensions/` 自动发现 | `.pi/extensions/`         | `.pi/extensions/` 目录 |
| 方式三：`settings.json` 配置       | `.pi/extensions/hello.ts` | **相对于 `.pi/` 目录** |

### 一：additionalExtensionPaths指定扩展文件

```typescript
/**
 * 演示：通过 SDK 加载多个扩展文件
 *
 * 关键点：扩展工厂函数需要 bindExtensions 才会执行。
 * 不加这步，扩展里的 registerTool()、registerCommand() 都不会生效。
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";

async function main() {
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: getAgentDir(),
    additionalExtensionPaths: [
      "extensions/hello.ts",
      "extensions/guard.ts",
      "extensions/input-transform.ts",
      "extensions/context-inject.ts",
      "extensions/memo.ts",
    ],
  });
  await loader.reload();

  const { session } = await createAgentSession({
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
  });

  // ★ 这一步最重要：扩展工厂函数在这里才真正执行
  await session.bindExtensions({});

  console.log("已加载 5 个扩展：hello, guard, input-transform, context-inject, memo\n");
  console.log("已注册工具:", session.getAllTools().map((t) => t.name).join(", "));
  console.log("");

  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt("调用 hello 工具，name=小红，帮我向小红打个招呼");
  session.dispose();
}

main().catch(console.error);


```

### 方法二：.pi/extensions/ 自动发自动扫描&加载

```
/**
 * 演示：自动发现 Extension（方式二）
 *
 * 不写 additionalExtensionPaths，让 DefaultResourceLoader
 * 自动扫描 .pi/extensions/ 目录。
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

async function main() {
  // 不传 additionalExtensionPaths，自动发现 .pi/extensions/
  const loader = new DefaultResourceLoader({
    cwd: projectRoot,
    agentDir: getAgentDir(),
  });
  await loader.reload();

  const { session } = await createAgentSession({
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
  });

  // 执行扩展工厂函数
  await session.bindExtensions({});

  console.log("已注册工具:", session.getAllTools().map((t) => t.name).join(", "));
  console.log("");

  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt("调用 hello 工具，name=小红，向小红打招呼");
  session.dispose();
}

main().catch(console.error);

```

### 方法三：settings.json 配置

创建.pi\settings.json

| 方式三：`settings.json` 配置 | `.pi/extensions/hello.ts` | **相对于 `.pi/` 目录** |
| ---------------------------- | ------------------------- | ---------------------- |

```
{
  "extensions": [
    "extensions/hello.ts" //相当于.pi/extensions/hello.ts
  ]
}
```

```typescript
/**
 * 演示：settings.json 配置加载（方式三）
 *
 * 扩展路径配在 .pi/settings.json 中。
 * 注意：路径是相对于 .pi/ 目录解析的，不是项目根目录。
 * 所以 "extensions/hello.ts" = .pi/extensions/hello.ts
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

async function main() {
  // 创建 SettingsManager，它会从 .pi/settings.json 读取配置
  const settingsManager = SettingsManager.create(projectRoot);

  const loader = new DefaultResourceLoader({
    cwd: projectRoot,
    agentDir: getAgentDir(),
    settingsManager,  // ← 传入 settingsManager，自动读取 extensions 配置
  });
  await loader.reload();

  const { session } = await createAgentSession({
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
  });

  await session.bindExtensions({});

  console.log("已注册工具:", session.getAllTools().map((t) => t.name).join(", "));
  console.log("");

  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt("调用 hello 工具，name=小红，向小红打招呼");
  session.dispose();
}

main().catch(console.error);


```



### 注意一

全部方法都要 await session.bindExtensions({});



### 注意二

方式一、二有本质区别：

**方式二（自动发现）：** 扫目录，**全部加载**

```
.pi/extensions/
├── hello.ts     ← 自动加载
├── secret.ts    ← 也自动加载
└── debug.ts     ← 也自动加载
```

没法选，放进去就加载。

**方式三（settings.json）：** **精确指定**加载哪些

```json
{
  "extensions": [
    "extensions/hello.ts"     ← 只加载这一个
  ]
}
```

`.pi/extensions/` 下就算有 10 个文件，也只加载 settings 里列出来的。

另外 settings.json 可以指向**任意位置**的文件：

```json
{
  "extensions": [
    "extensions/hello.ts",
    "C:/shared/team-extension.ts",       ← 绝对路径
    "../other-project/ext/greeting.ts"   ← 项目外
  ]
}
```

方式二只能扫 `.pi/extensions/` 这一个目录。所以方式三更灵活，方式二更简单。





## 注意事项

1. **不要从工厂函数启动后台资源**（进程、socket、文件监听器等），应推迟到 `session_start` 或命令/工具/事件中启动
2. **Extension 有完整的系统权限**，只安装可信来源的扩展
3. **cmd 模式**下 `ctx.hasUI` 为 `false`，对话框方法会抛异常，需要先检查
4. **事件处理器的返回值**决定是否覆盖默认行为（如 `tool_call` 返回 `{ block: true }` 阻止执行）
5. **修改文件的工具**应使用 `withFileMutationQueue()` 确保和内置工具共享文件锁
6. **State 管理**建议存在 tool result 的 `details` 中，这样才能正确支持分支
7. Extension 的加载分为两个阶段：**Discovery（发现）**：DefaultResourceLoader 根据 additionalExtensionPaths 或 Package 找到扩展文件。**Binding（绑定）**：调用 session.bindExtensions() 后，Pi 才会执行每个扩展的 export default(pi)，真正注册 Tool、Command、Hook、Provider 等能力。




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
