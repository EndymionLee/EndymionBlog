---
title: Pi SDK 参考手册
date: 2026-07-9
---



# Pi SDK 参考手册

SDK 提供对 Pi 代理功能的编程接口，用于将 Pi 嵌入其他应用、构建自定义界面或集成到自动化工作流中。

- 构建自定义 UI（Web、桌面、移动端）
- 将代理功能集成到现有应用
- 创建带代理推理的自动化流水线
- 以编程方式测试代理行为

> 来源：https://pi.dev/docs/latest/sdk

---

## 安装

```bash
npm install @earendil-works/pi-coding-agent
```

SDK 已包含在主包中，无需单独安装其他依赖。

---

## 快速入门

使用 SDK 的基本流程是：初始化认证存储和模型注册表，调用 `createAgentSession()` 创建会话，订阅事件监听输出，然后调用 `session.prompt()` 发送提示。

```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});

// 订阅事件，监听流式文本输出
session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("当前目录有哪些文件？");
```

`createAgentSession()` 是最主要的工厂函数。它使用 `ResourceLoader` 加载扩展、技能、提示模板、主题和上下文文件。不传参数时使用 `DefaultResourceLoader` 进行标准发现。

---

## createAgentSession()

### 最小用法

最简单的用法是不传任何参数，使用全部默认配置：

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();
```

这会自动发现项目中的扩展、技能和上下文文件，从环境变量中读取 API Key 并自动选择可用的模型。

### 返回值

```typescript
const result = await createAgentSession({ /* options */ });
// result.session: AgentSession        — 会话实例
// result.extensionsResult.extensions  — 加载的扩展列表
// result.extensionsResult.errors      — 扩展加载错误
// result.modelFallbackMessage         — 模型回退时的警告信息
```

---

## AgentSession

### 属性

```typescript
session.sessionId          // string — 会话唯一标识
session.sessionFile        // string | undefined — 会话文件路径
session.model              // Model | undefined — 当前使用的模型
session.thinkingLevel      // ThinkingLevel — 当前思考级别
session.messages           // AgentMessage[] — 对话历史
session.isStreaming        // boolean — 是否正在流式输出
session.agent              // Agent — 底层 Agent 实例
```

### 核心方法

**prompt()** — 发送提示并等待完成：

```typescript
// 基本用法
await session.prompt("帮我写一个排序函数");

// 带图片
await session.prompt("这张图里有什么？", {
  images: [{ type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } }],
});

// 流式过程中排队
await session.prompt("停下来做这个", { streamingBehavior: "steer" });
```

**prompt() 的处理逻辑：**

- 扩展命令（以 `/` 开头）立即执行，即使在流式过程中
- 文件提示模板（`.md` 文件）在发送前展开为内容
- 流式过程中调用 `prompt()` 时**必须**指定 `streamingBehavior`，否则抛出错误
- `preflightResult` 回调在 prompt 被接受（`true`）或拒绝（`false`）时触发

**steer() 和 followUp()** — 流式过程中的消息队列：

```typescript
// steer: 在当前助手回合完成工具调用后交付，优先级高
await session.steer("新的指令");

// followUp: 等待代理完全停止后交付，优先级低
await session.followUp("完成后也做这个");
```

两者都会展开文件提示模板，但扩展命令会报错（扩展命令不能排队）。

**模型控制：**

```typescript
await session.setModel(newModel);        // 切换模型
session.setThinkingLevel("high");        // 设置思考级别
await session.cycleModel();              // 循环切换下一模型
session.cycleThinkingLevel();            // 循环切换思考级别
```

**状态操作：**

```typescript
// 替换消息历史（拷贝顶层数组）
session.agent.state.messages = newMessages;

// 替换工具列表（拷贝顶层数组）
session.agent.state.tools = newTools;

// 等待代理完成
await session.agent.waitForIdle();
```

**导航与压缩：**

```typescript
// 在会话树中导航至指定节点
await session.navigateTree(targetId, { summarize: true });

// 手动压缩上下文
await session.compact("保留关键决策信息");
session.abortCompaction();

// 中断当前操作
await session.abort();

// 清理资源
session.dispose();
```

---

## createAgentSessionRuntime() 和 AgentSessionRuntime

当需要替换当前会话并重建运行时状态时（如 newSession、switchSession、fork、import），使用运行时 API。这是 Pi 内置的交互模式、打印模式和 RPC 模式所使用的同一层。

```typescript
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const createRuntime: CreateAgentSessionRuntimeFactory = async ({ cwd, sessionManager, sessionStartEvent }) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics,
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd()),
});
```

**重要行为：**

- `runtime.session` 在执行 `newSession()`、`switchSession()`、`fork()` 后会**改变**
- 事件订阅绑定到具体的 `AgentSession`，替换后需要**重新订阅**
- 如果使用扩展，新会话需要重新调用 `session.bindExtensions()`
- 创建失败时诊断信息在 `runtime.diagnostics` 中

```typescript
let session = runtime.session;
let unsub = session.subscribe(handler);

await runtime.newSession();       // 会话已替换

unsub();                          // 取消旧订阅
session = runtime.session;        // 获取新会话
unsub = session.subscribe(handler); // 重新订阅
```

---

## 事件参考

通过 `session.subscribe()` 接收流式输出和生命周期通知：

```typescript
session.subscribe((event) => {
  switch (event.type) {

    // 流式文本 — 最常用的事件
    case "message_update":
      if (event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
      if (event.assistantMessageEvent.type === "thinking_delta") {
        // 思考过程（启用思考时）
      }
      break;

    // 工具执行
    case "tool_execution_start":
      console.log(`工具: ${event.toolName}`);
      break;
    case "tool_execution_update":
      // 流式工具输出
      break;
    case "tool_execution_end":
      console.log(`结果: ${event.isError ? "错误" : "成功"}`);
      break;

    // 消息生命周期
    case "message_start": break;
    case "message_end": break;

    // 代理生命周期
    case "agent_start": break;
    case "agent_end":
      // event.messages 包含本轮新消息
      break;

    // 回合生命周期（一次 LLM 响应 + 工具调用）
    case "turn_start": break;
    case "turn_end":
      // event.message: 助手响应
      // event.toolResults: 工具结果
      break;

    // 会话事件
    case "queue_update":
      console.log("待处理:", event.steering, event.followUp);
      break;
    case "compaction_start": case "compaction_end": break;
    case "auto_retry_start": case "auto_retry_end": break;
  }
});
```

---

## 选项参考

### 工作目录

```typescript
const { session } = await createAgentSession({
  cwd: process.cwd(),       // 默认
  agentDir: "~/.pi/agent",  // 默认
});
```

**cwd** 用于发现项目级资源：
- `.pi/extensions/` — 项目扩展
- `.pi/skills/` — 项目技能
- `.pi/prompts/` — 项目提示
- `AGENTS.md` — 上下文文件（从 cwd 向上查找）

**agentDir** 用于全局级配置：
- `~/.pi/agent/extensions/` — 全局扩展
- `~/.pi/agent/skills/` — 全局技能
- `~/.pi/agent/settings.json` — 设置
- `~/.pi/agent/auth.json` — 凭证
- `~/.pi/agent/models.json` — 自定义模型
- `~/.pi/agent/sessions/` — 会话

传入自定义 `ResourceLoader` 后，cwd 和 agentDir 不再控制资源发现，但仍影响会话命名和工具路径解析。

### 模型选择

模型通过 `getModel()`（内置模型）或 `modelRegistry.find()`（含自定义模型）获取。

```typescript
import { getModel } from "@earendil-works/pi-ai/compat";
import { AuthStorage, createAgentSession, ModelRegistry } from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

// 方式 1: 按提供商/ID 查找内置模型
const opus = getModel("anthropic", "claude-opus-4-5");

// 方式 2: 通过注册表查找（包含 models.json 中的自定义模型）
const customModel = modelRegistry.find("my-provider", "my-model");

// 方式 3: 从已配置 API Key 的模型中挑选
const available = await modelRegistry.getAvailable();
console.log(available.map((m) => `${m.provider}/${m.id}`));

if (available.length > 0) {
  const { session } = await createAgentSession({
    model: available[0],
    thinkingLevel: "medium",  // off, low, medium, high
    authStorage,
    modelRegistry,
  });
}
```

**思考级别：** `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`

**模型选择回退顺序：**
1. 尝试从会话恢复（续签时）
2. 使用设置中的默认模型
3. 回退到第一个可用模型

**scopedModels** 用于限定模型循环范围：

```typescript
const { session } = await createAgentSession({
  scopedModels: [
    { model: opus, thinkingLevel: "high" },
    { model: haiku, thinkingLevel: "off" },
  ],
});
```

### API Key 和认证

API Key 的解析优先级：
1. **运行时覆盖**（`setRuntimeApiKey`，不写入磁盘）
2. **auth.json 中的凭证**
3. **环境变量**（`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`DEEPSEEK_API_KEY` 等）
4. **models.json 中的自定义回退**

```typescript
// 默认位置 (~/.pi/agent/auth.json)
const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

// 自定义位置
const customAuth = AuthStorage.create("/my/app/auth.json");
const customRegistry = ModelRegistry.create(customAuth, "/my/app/models.json");

// 运行时注入（不持久化）
authStorage.setRuntimeApiKey("anthropic", "sk-my-temp-key");

// 仅内置模型（不加载 models.json）
const simpleRegistry = ModelRegistry.inMemory(authStorage);
```

### 系统提示

通过 `ResourceLoader` 覆盖系统提示：

```typescript
import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  systemPromptOverride: () => "你是一个有用的助手。回答问题简洁准确。",
  appendSystemPromptOverride: () => [],  // 清除默认追加内容
});
await loader.reload();

const { session } = await createAgentSession({
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
});
```

### 工具控制

内置工具：`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`
默认启用：`read`、`bash`、`edit`、`write`

```typescript
// 只读模式（禁用 edit/write）
const { session } = await createAgentSession({
  tools: ["read", "grep", "find", "ls"],
});

// 禁用全部工具
const { session } = await createAgentSession({ noTools: "all" });

// 禁用内置工具，保留扩展工具
const { session } = await createAgentSession({ noTools: "builtin" });

// 排除特定工具
const { session } = await createAgentSession({
  excludeTools: ["ask_question"],
});
```

传入自定义 `cwd` 时，`createAgentSession()` 会针对该目录构建内置工具。

### 自定义工具

使用 `defineTool()` 定义自定义工具。参数 Schema 使用 TypeBox 定义。

```typescript
import { Type } from "typebox";
import { createAgentSession, defineTool } from "@earendil-works/pi-coding-agent";

const myTool = defineTool({
  name: "get_time",
  label: "获取时间",
  description: "获取当前日期和时间",
  parameters: Type.Object({
    format: Type.Optional(Type.Union([Type.Literal("full"), Type.Literal("date"), Type.Literal("time")])),
  }),
  execute: async (_toolCallId, params) => ({
    content: [{ type: "text", text: new Date().toLocaleString("zh-CN") }],
    details: {},
  }),
});

const { session } = await createAgentSession({
  customTools: [myTool],
  tools: ["read", "bash", "get_time"],  // 显式启用
});
```

自定义工具通过 `customTools` 数组传入，会与扩展注册的工具合并。如果传入了 `tools`，需要在列表中包含自定义工具的名称才能启用。

### 扩展

扩展由 `ResourceLoader` 自动发现（扫描 `~/.pi/agent/extensions/`、`.pi/extensions/` 等）。也可以通过选项手动加载：

```typescript
import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  additionalExtensionPaths: ["./my-extension.ts"],
  extensionFactories: [
    (pi) => {
      pi.on("agent_start", () => console.log("[扩展] Agent 启动"));
      pi.on("tool_call", async (event) => {
        console.log(`工具: ${event.toolName}`);
        return undefined; // 返回 { block: true } 阻止执行
      });
    },
  ],
});
await loader.reload();

const { session } = await createAgentSession({
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
});
```

**命名内联扩展：**

```typescript
import type { InlineExtension } from "@earendil-works/pi-coding-agent";

const myExt: InlineExtension = {
  name: "my-logger",
  factory: (pi) => { pi.on("agent_start", () => console.log("start")); },
};
```

默认显示为 `<inline:1>`，命名后显示为 `<inline:my-logger>`。

**事件总线：** 扩展可通过 `pi.events` 通信。创建共享的 `eventBus` 传递给 `DefaultResourceLoader`，从外部发射或监听事件。

### Skills

通过 `Skill` 接口定义，使用 `skillsOverride` 选项添加：

```typescript
const customSkill: Skill = {
  name: "my-skill",
  description: "自定义项目指令",
  filePath: "/virtual/SKILL.md",
  baseDir: "/virtual",
  sourceInfo: createSyntheticSourceInfo("/virtual/SKILL.md", { source: "sdk" }),
  disableModelInvocation: false,
};

const loader = new DefaultResourceLoader({
  skillsOverride: (current) => ({
    skills: [...current.skills, customSkill],
    diagnostics: current.diagnostics,
  }),
});
await loader.reload();
```

### 斜杠命令

通过 `PromptTemplate` 接口定义，使用 `promptsOverride` 添加：

```typescript
const deployCmd: PromptTemplate = {
  name: "deploy",
  description: "部署应用",
  source: "(custom)",
  content: "# 部署\n\n1. 构建\n2. 测试\n3. 部署",
};

const loader = new DefaultResourceLoader({
  promptsOverride: (current) => ({
    prompts: [...current.prompts, deployCmd],
    diagnostics: current.diagnostics,
  }),
});
await loader.reload();
```

### 上下文文件

通过 `agentsFilesOverride` 添加虚拟上下文文件：

```typescript
const loader = new DefaultResourceLoader({
  agentsFilesOverride: (current) => ({
    agentsFiles: [
      ...current.agentsFiles,
      { path: "/virtual/AGENTS.md", content: "# 指南\n\n- 保持简洁" },
    ],
  }),
});
await loader.reload();
```

---

## 会话管理

### 会话工厂

```typescript
// 内存会话（不持久化）
SessionManager.inMemory();

// 新建持久会话
SessionManager.create(process.cwd());

// 续签最近会话
SessionManager.continueRecent(process.cwd());

// 打开指定文件
SessionManager.open("/path/to/session.jsonl");

// 列出会话
const localSessions = await SessionManager.list(process.cwd());
const allSessions = await SessionManager.listAll();
```

### 树 API

会话使用树形结构，通过 `id`/`parentId` 链接，支持原地分支。

```typescript
const sm = SessionManager.open("/path/to/session.jsonl");

sm.getEntries();               // 所有条目
sm.getTree();                  // 完整树结构
sm.getBranch();                // 当前路径（根到叶）
sm.getLeafEntry();             // 当前叶节点
sm.getEntry(id);               // 按 ID 查找
sm.getChildren(id);            // 直接子节点

sm.getLabel(id);               // 获取标签
sm.appendLabelChange(id, "标记");

sm.branch(entryId);            // 分支到指定条目
sm.branchWithSummary(id, "摘要...");
sm.createBranchedSession(leafId);  // 提取路径为新文件
```

---

## 设置管理

设置从两个位置加载并合并：全局（`~/.pi/agent/settings.json`）和项目（`<cwd>/.pi/settings.json`）。项目覆盖全局，嵌套对象合并键值。

```typescript
// 从文件加载
const settings = SettingsManager.create(process.cwd());

// 覆盖特定设置
settings.applyOverrides({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 5 },
});

// 写入并等待持久化
settings.setDefaultThinkingLevel("low");
await settings.flush();

// 处理 I/O 错误（SDK 默认不打印）
const errors = settings.drainErrors();
for (const { scope, error } of errors) {
  console.warn(`设置错误 (${scope}): ${error.message}`);
}

// 测试用：纯内存模式
const testSettings = SettingsManager.inMemory({
  compaction: { enabled: false },
  retry: { enabled: false },
});
```

---

## ResourceLoader

`DefaultResourceLoader` 用于发现扩展、技能、提示、主题和上下文文件。创建后需调用 `await loader.reload()`。

```typescript
import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({ cwd: process.cwd(), agentDir: getAgentDir() });
await loader.reload();

loader.getExtensions();       // 扩展列表
loader.getSkills();           // 技能列表
loader.getPrompts();          // 提示模板列表
loader.getThemes();           // 主题列表
loader.getAgentsFiles();      // 上下文文件列表
```

---

## 运行模式

### InteractiveMode

完整的 TUI 交互模式，包含编辑器、聊天历史和所有内置命令：

```typescript
import { InteractiveMode, /* ... */ } from "@earendil-works/pi-coding-agent";
const mode = new InteractiveMode(runtime, { initialMessage: "你好" });
await mode.run();
```

### runPrintMode

单次运行模式：发送提示、输出结果、退出：

```typescript
import { runPrintMode } from "@earendil-works/pi-coding-agent";
await runPrintMode(runtime, { mode: "text", initialMessage: "你好" });
```

### runRpcMode

JSON-RPC 模式，用于子进程集成：

```typescript
import { runRpcMode } from "@earendil-works/pi-coding-agent";
await runRpcMode(runtime);
```

也支持 CLI 方式启动：

```bash
pi --mode rpc --no-session
```

**SDK 适用场景：** 类型安全、同进程、直接访问代理状态、程序化工具/扩展定制

**RPC 适用场景：** 跨语言集成、进程隔离、语言无关的客户端

---

## 完整示例

以下示例组合了认证存储、模型注册表、自定义工具、设置管理器、资源加载器，覆盖了完整的 SDK 使用模式：

```typescript
import { getModel } from "@earendil-works/pi-ai/compat";
import { Type } from "typebox";
import {
  AuthStorage, createAgentSession, createExtensionRuntime,
  DefaultResourceLoader, defineTool, ModelRegistry,
  type ResourceLoader, SessionManager, SettingsManager,
} from "@earendil-works/pi-coding-agent";

// 1. 认证和模型
const authStorage = AuthStorage.create("/tmp/my-agent/auth.json");
if (process.env.MY_KEY) authStorage.setRuntimeApiKey("anthropic", process.env.MY_KEY);
const modelRegistry = ModelRegistry.inMemory(authStorage);

// 2. 自定义工具
const statusTool = defineTool({
  name: "status", label: "Status", description: "获取系统状态",
  parameters: Type.Object({}),
  execute: async () => ({ content: [{ type: "text", text: `运行: ${process.uptime()}s` }], details: {} }),
});

// 3. 模型和设置
const model = getModel("anthropic", "claude-opus-4-5");
if (!model) throw new Error("模型未找到");
const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false } });

// 4. 系统提示
const loader = new DefaultResourceLoader({
  systemPromptOverride: () => "你是一个简洁的助手。",
});
await loader.reload();

// 5. 创建会话
const { session } = await createAgentSession({
  model, thinkingLevel: "off",
  authStorage, modelRegistry,
  resourceLoader: loader,
  tools: ["read", "bash", "status"],
  customTools: [statusTool],
  sessionManager: SessionManager.inMemory(),
  settingsManager,
});

// 6. 订阅事件
session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta")
    process.stdout.write(event.assistantMessageEvent.delta);
});

// 7. 发送提示
await session.prompt("获取状态并列出文件。");
```

---

## 导出清单

| 分类 | 导出 |
|------|------|
| **工厂** | `createAgentSession`, `createAgentSessionRuntime`, `AgentSessionRuntime` |
| **认证与模型** | `AuthStorage`, `ModelRegistry`, `resolveCliModel`, `resolveModelScopeWithDiagnostics` |
| **资源加载** | `DefaultResourceLoader`, `ResourceLoader`（类型）, `createEventBus` |
| **常量和工具** | `CONFIG_DIR_NAME`, `defineTool`, `getAgentDir`, `getPackageDir`, `getReadmePath`, `getDocsPath`, `getExamplesPath` |
| **会话** | `SessionManager`, `SettingsManager` |
| **工具工厂** | `createCodingTools`, `createReadOnlyTools`, `createReadTool`, `createBashTool`, `createEditTool`, `createWriteTool`, `createGrepTool`, `createFindTool`, `createLsTool` |
| **类型** | `CreateAgentSessionOptions`, `CreateAgentSessionResult`, `ExtensionFactory`, `InlineExtension`, `ExtensionAPI`, `ToolDefinition`, `Skill`, `PromptTemplate`, `Tool` |

> 完整源码示例参见 `packages/coding-agent/examples/sdk/`（共 13 个示例文件）。
