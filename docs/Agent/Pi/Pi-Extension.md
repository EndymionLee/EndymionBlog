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



### Extension 事件参考手册

所有事件通过 `pi.on(event, handler)` 订阅。

返回值的意义：有返回值的事件可以**干预 Pi 的默认行为**（如取消操作、修改数据、替换结果）。无返回值的事件是**只读通知**，只能监听不能改变流程。

#### project_trust — 项目信任决策

**触发时机**：Pi 判断是否信任项目时。

**返回值意义**：插件可以代替 Pi 的信任弹窗做决策。

```typescript
pi.on("project_trust", async (event, ctx) => {
  // event.cwd — 项目路径
  return { trusted: "yes" as const, remember: true };
});
```

| 返回值字段 | 类型              | 说明                     |
| ---------- | ----------------- | ------------------------ |
| `trusted`  | `"yes"            | "no"                     |
| `remember` | `boolean`（可选） | 记住此选择，下次不再弹窗 |

#### resources_discover — 资源路径发现

**触发时机**：会话启动后，Pi 收集扩展、技能、提示模板等资源时。

**返回值意义**：插件可以贡献自己的资源路径，让 Pi 加载。

```typescript
pi.on("resources_discover", async (event, ctx) => {
  // event.reason — "startup" | "reload"
  return {
    skillPaths: ["/path/to/skills"],
    promptPaths: ["/path/to/prompts"],
    themePaths: ["/path/to/themes"],
  };
});
```

| 返回值字段    | 类型               | 说明         |
| ------------- | ------------------ | ------------ |
| `skillPaths`  | `string[]`（可选） | 技能文件路径 |
| `promptPaths` | `string[]`（可选） | 提示模板路径 |
| `themePaths`  | `string[]`（可选） | 主题文件路径 |

#### session_start — 会话启动通知

**触发时机**：会话启动、恢复或重载时。

**返回值意义**：无。只能监听不能干预。

`event.reason` 取值：`"startup"`（首次启动）、`"reload"`（/reload 后）、`"new"`（/new 后）、`"resume"`（切换会话后）、`"fork"`（分支后）

```typescript
pi.on("session_start", async (event, ctx) => {
  console.log("会话启动，原因:", event.reason);
  ctx.ui.notify("扩展已加载！", "info");
});
```

#### session_info_changed — 会话名称变更

**触发时机**：用户用 `/name` 或 `pi.setSessionName()` 修改会话显示名称时。

**返回值意义**：无。

```typescript
pi.on("session_info_changed", async (event, ctx) => {
  // event.name — 新名称
});
```

#### session_before_switch — 切换会话前

**触发时机**：执行 `/new` 或 `/resume` 切换会话之前。

**返回值意义**：可以取消切换。

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  // event.reason — "new" | "resume"
  // event.targetSessionFile — 目标会话文件（resume 时有值）
  if (event.reason === "new") {
    const ok = await ctx.ui.confirm("确定？", "丢弃当前对话？");
    if (!ok) return { cancel: true };
  }
});
```

| 返回值字段 | 类型              | 说明          |
| ---------- | ----------------- | ------------- |
| `cancel`   | `boolean`（可选） | true=取消切换 |

#### session_before_fork — 分支前

**触发时机**：执行 `/fork` 或 `/clone` 之前。

**返回值意义**：可以取消分支操作。

```typescript
pi.on("session_before_fork", async (event, ctx) => {
  // event.entryId — 选中的条目
  // event.position — "before"(/fork) | "at"(/clone)
  return { cancel: true };
});
```

| 返回值字段                | 类型              | 说明          |
| ------------------------- | ----------------- | ------------- |
| `cancel`                  | `boolean`（可选） | true=取消分支 |
| `skipConversationRestore` | `boolean`（可选） | 跳过对话恢复  |

#### session_before_compact — 压缩前

**触发时机**：自动或手动压缩上下文之前。

**返回值意义**：可以取消压缩，或提供自定义压缩摘要。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  // event.reason — "manual" | "threshold" | "overflow"
  // event.willRetry — 压缩后是否自动重试

  return { cancel: true }; // 取消压缩

  // 或提供自定义压缩结果：
  return {
    compaction: {
      summary: "用户和助手讨论了项目架构...", // 自定义摘要
      firstKeptEntryId: "xxx",
      tokensBefore: 5000,
    },
  };
});
```

| 返回值字段   | 类型                       | 说明                            |
| ------------ | -------------------------- | ------------------------------- |
| `cancel`     | `boolean`（可选）          | true=取消压缩                   |
| `compaction` | `CompactionResult`（可选） | 用自己的摘要代替 Pi 的 LLM 压缩 |

#### session_compact — 压缩完成

**触发时机**：压缩执行完成后。

**返回值意义**：无。只能监听。

```typescript
pi.on("session_compact", async (event, ctx) => {
  // event.compactionEntry — 压缩条目
  // event.fromExtension — 是否由扩展提供摘要
  // event.reason — 压缩原因
  // event.willRetry — 是否重试
});
```

#### session_shutdown — 会话关闭

**触发时机**：会话运行时被销毁时（退出、重载、切换、分支）。

**返回值意义**：无。用于清理插件占用的资源。

`event.reason` 取值：`"quit"`（退出）、`"reload"`（重载）、`"new"`（新会话）、`"resume"`（切换）、`"fork"`（分支）

```typescript
pi.on("session_shutdown", async (event, ctx) => {
  // 关闭插件占用的资源
  await fileWatcher?.close();
  await tempFilesCleanup();
});
```

#### session_before_tree / session_tree — 树导航

**触发时机**：用户用 `/tree` 在会话树中导航之前/之后。

**返回值意义**：before 可以取消或自定义摘要。after 只能监听。

```typescript
// 导航前：可取消或自定义摘要
pi.on("session_before_tree", async (event, ctx) => {
  return { cancel: true };
  // 或：
  return {
    summary: { summary: "...摘要...", details: {} },
    customInstructions: "专注最近的错误修复",
    label: "bug-fix-checkpoint",
  };
});

// 导航后：只通知
pi.on("session_tree", async (event, ctx) => {
  // event.newLeafId, event.oldLeafId — 导航前后的节点
});
```

| 返回值字段            | 类型              | 说明                                        |
| --------------------- | ----------------- | ------------------------------------------- |
| `cancel`              | `boolean`（可选） | true=取消导航                               |
| `summary`             | `object`（可选）  | 用自己的摘要代替 LLM 生成的                 |
| `customInstructions`  | `string`（可选）  | 覆盖摘要生成的指令                          |
| `replaceInstructions` | `boolean`（可选） | true=用 customInstructions 完全替换默认指令 |
| `label`               | `string`（可选）  | 给摘要条目打标签                            |

#### before_agent_start — Agent 开始前

**触发时机**：用户提交 prompt 后，Agent 循环开始之前。

**返回值意义**：可以注入自定义消息（会进入 LLM 上下文）或替换本次系统提示。

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // event.prompt — 用户输入
  // event.images — 图片附件
  // event.systemPrompt — 当前系统提示
  // event.systemPromptOptions — 系统提示的原始构建数据

  return {
    // 注入自定义消息到 LLM 上下文
    message: {
      customType: "reminder",
      content: "提醒：回答尽量简洁",
      display: false, // true=TUI 显示, false=隐藏
    },
    // 替换本次系统提示（多个扩展会链式追加）
    systemPrompt: event.systemPrompt + "\n\n额外规则：用中文回答",
  };
});
```

| 返回值字段     | 类型                    | 说明                          |
| -------------- | ----------------------- | ----------------------------- |
| `message`      | `CustomMessage`（可选） | 注入到 LLM 上下文的自定义消息 |
| `systemPrompt` | `string`（可选）        | 替换本次系统提示              |

#### agent_start / agent_end / agent_settled — Agent 生命周期

**触发时机**：Agent 开始处理、完成本轮回合、完全空闲。

**返回值意义**：无。只能监听。

```typescript
pi.on("agent_start", async (_event, ctx) => {
  ctx.ui.setStatus("agent", "工作中...");
});

pi.on("agent_end", async (event, ctx) => {
  // event.messages — 本轮新增的消息
});

pi.on("agent_settled", async (_event, ctx) => {
  // 所有处理（含重试、压缩、队列后续）都完成了
  ctx.ui.setStatus("agent", undefined);
});
```

#### turn_start / turn_end — 回合生命周期

**触发时机**：每次 LLM 调用 + 工具调用构成一个回合。

**返回值意义**：无。只能监听。

```typescript
pi.on("turn_start", async (event, ctx) => {
  // event.turnIndex — 回合序号
});

pi.on("turn_end", async (event, ctx) => {
  // event.message — 助手回复
  // event.toolResults — 本回合工具结果
});
```

#### message_start / message_update / message_end — 消息生命周期

**触发时机**：一条消息从开始到完成的整个过程。

**返回值意义**：只有 `message_end` 可以替换完成的消息（必须保持 role 不变）。

```typescript
// 流式文本更新（最常用的事件）
pi.on("message_update", async (event, ctx) => {
  // event.message — 当前累积的完整消息
  // event.assistantMessageEvent — 增量类型：
  //   text_delta — 文本增量（delta 字段）
  //   thinking_delta — 思考过程
  //   toolcall_delta — 工具调用参数
  if (event.assistantMessageEvent?.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

// 消息完成：可以替换最终消息
pi.on("message_end", async (event, ctx) => {
  // event.message — 完成的消息
  if (event.message.role !== "assistant") return;
  return {
    message: {
      ...event.message,
      usage: { ...event.message.usage, cost: { total: 0.123 } },
    },
  };
});
```

#### tool_execution_start / tool_execution_update / tool_execution_end — 工具执行

**触发时机**：工具从开始执行到完成的整个过程。

**返回值意义**：无。只能监听。

```typescript
pi.on("tool_execution_start", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args
  ctx.ui.setStatus("tool", `正在使用: ${event.toolName}`);
});

pi.on("tool_execution_update", async (event, ctx) => {
  // event.partialResult — 累积的进度数据
});

pi.on("tool_execution_end", async (event, ctx) => {
  // event.result — 完整结果
  // event.isError — 是否出错
  ctx.ui.setStatus("tool", undefined);
});
```

#### context — 修改 LLM 上下文

**触发时机**：每次 LLM 调用之前，消息已转换但尚未发送。

**返回值意义**：可以修改发给 LLM 的消息列表。`event.messages` 是深拷贝，修改它不影响原始会话。

```typescript
pi.on("context", async (event, ctx) => {
  // event.messages — 将发给 LLM 的消息（深拷贝）
  const filtered = event.messages.filter(m => !shouldPrune(m));
  return { messages: filtered };
});
```

| 返回值字段 | 类型                     | 说明                |
| ---------- | ------------------------ | ------------------- |
| `messages` | `AgentMessage[]`（可选） | 替换发给 LLM 的消息 |

#### before_provider_headers — 修改 HTTP 头

**触发时机**：HTTP 请求头已组装完毕，即将发送。

**返回值意义**：无。直接在 `event.headers` 上原地修改。

```typescript
pi.on("before_provider_headers", (event, ctx) => {
  event.headers["x-custom"] = "value";  // 添加头
  event.headers["X-OpenRouter-Title"] = null; // 删除头（设为 null）
});
```

#### before_provider_request — 修改 Provider 请求

**触发时机**：Provider 专用载荷已构建完成，即将发送。

**返回值意义**：返回新值替换整个请求载荷。返回 `undefined` 保持原样。

```typescript
pi.on("before_provider_request", async (event, ctx) => {
  return modifiedPayload; // 替换请求载荷
});
```

#### after_provider_response — Provider 响应

**触发时机**：收到 HTTP 响应后，流式内容消费之前。

**返回值意义**：无。只能监听。

```typescript
pi.on("after_provider_response", (event, ctx) => {
  // event.status — HTTP 状态码
  // event.headers — 响应头
  if (event.status === 429) {
    console.log("被限流", event.headers["retry-after"]);
  }
});
```

#### model_select / thinking_level_select — 模型/思考级别变更

**触发时机**：模型或思考级别被修改时。

**返回值意义**：无。只能监听。

```typescript
pi.on("model_select", async (event, ctx) => {
  // event.model — 新模型
  // event.previousModel — 旧模型
  // event.source — "set" | "cycle" | "restore"
  ctx.ui.setStatus("model", `${event.model.provider}/${event.model.id}`);
});

pi.on("thinking_level_select", async (event, ctx) => {
  // event.level — 新级别
  // event.previousLevel — 旧级别
});
```

#### tool_call — 工具调用前（可阻止）

**触发时机**：LLM 请求调用工具时，参数已验证但尚未执行。

**返回值意义**：可以阻止工具执行。如需修改参数，直接在 `event.input` 上原地修改。

```typescript
pi.on("tool_call", async (event, ctx) => {
  // event.toolName — 工具名
  // event.input — 工具参数（可原地修改）

  // 阻止危险命令
  if (event.toolName === "bash" && event.input.command.includes("rm -rf")) {
    return { block: true, reason: "危险命令已阻止" };
  }

  // 修改参数
  if (event.toolName === "bash") {
    event.input.command = `source ~/.profile\n${event.input.command}`;
  }
});
```

| 返回值字段 | 类型              | 说明                   |
| ---------- | ----------------- | ---------------------- |
| `block`    | `boolean`（可选） | true=阻止工具执行      |
| `reason`   | `string`（可选）  | 阻止原因（显示给 LLM） |

#### tool_result — 工具结果处理（可修改）

**触发时机**：工具执行完成后，结果发给 LLM 之前。

**返回值意义**：可以修改工具的结果内容、附加数据或错误标记。多个处理器链式执行，每个看到的是上一个修改后的结果。

```typescript
pi.on("tool_result", async (event, ctx) => {
  // event.content — 结果内容
  // event.details — 附加数据
  // event.isError — 是否错误

  return {
    content: [{ type: "text", text: "被扩展修改的结果" }],
    details: { modified: true },
    isError: false,
  };
});
```

| 返回值字段 | 类型                                      | 说明         |
| ---------- | ----------------------------------------- | ------------ |
| `content`  | `(TextContent \| ImageContent)[]`（可选） | 替换结果内容 |
| `details`  | `unknown`（可选）                         | 替换附加数据 |
| `isError`  | `boolean`（可选）                         | 覆盖错误标记 |

#### user_bash — 用户执行 bash

**触发时机**：用户在交互模式下用 `!` 或 `!!` 执行命令时。

**返回值意义**：可以提供自定义执行器（如 SSH 远程执行）或直接返回结果。

```typescript
pi.on("user_bash", async (event, ctx) => {
  // 方式 1：提供自定义执行器
  return { operations: remoteBashOps };

  // 方式 2：直接返回结果
  return { result: { output: "done", exitCode: 0, cancelled: false, truncated: false } };
});
```

| 返回值字段   | 类型                     | 说明                   |
| ------------ | ------------------------ | ---------------------- |
| `operations` | `BashOperations`（可选） | 自定义执行器（如 SSH） |
| `result`     | `BashResult`（可选）     | 直接替换执行结果       |

#### input — 用户输入拦截

**触发时机**：用户输入消息后，在扩展命令检查之后、skill/template 展开之前。

**返回值意义**：决定输入的处理方式——放行、修改、或自己处理。

```typescript
pi.on("input", async (event, ctx) => {
  // event.text — 原始输入
  // event.images — 图片
  // event.source — "interactive" | "rpc" | "extension"
  // event.streamingBehavior — 流式行为

  return { action: "continue" };        // 正常放行（默认）
  return { action: "handled" };          // 扩展已处理，不发给 LLM
  return { action: "transform",
           text: "修改后的文本" };        // 修改内容后发给 LLM
});
```

| 返回值                                   | 说明                    |
| ---------------------------------------- | ----------------------- |
| `{ action: "continue" }`                 | 正常放行（默认行为）    |
| `{ action: "handled" }`                  | 扩展已处理，不发给 LLM  |
| `{ action: "transform", text, images? }` | 修改文本/图片后发给 LLM |

#### 事件分类速查

```
可干预流程（有返回值）：
  project_trust          → 决定项目信任
  resources_discover     → 贡献资源路径
  session_before_switch  → 取消会话切换
  session_before_fork    → 取消分支
  session_before_compact → 取消/自定义压缩
  session_before_tree    → 取消/自定义树导航摘要
  before_agent_start     → 注入消息/替换系统提示
  message_end            → 替换最终消息
  context                → 修改 LLM 上下文
  before_provider_request → 替换 Provider 请求
  tool_call              → 阻止工具执行
  tool_result            → 修改工具结果
  user_bash              → 替换 bash 执行器/结果
  input                  → 拦截/转换用户输入

只读通知（无返回值）：
  session_start / session_info_changed / session_compact
  session_shutdown / session_tree
  agent_start / agent_end / agent_settled
  turn_start / turn_end
  message_start / message_update
  tool_execution_start / tool_execution_update / tool_execution_end
  before_provider_headers / after_provider_response
  model_select / thinking_level_select
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
