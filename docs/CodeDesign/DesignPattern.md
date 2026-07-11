---
title: 常用设计模式
date: 2026-05-03
---
# 常用设计模式

## 1. 发布订阅模式（Publish-Subscribe）

### 核心思想

对象之间通过事件进行通信，发布者和订阅者解耦——谁发事件、谁收事件，互不知道对方存在。

### 示例：DAG 调度器事件驱动执行

```ts
class EventBus {
  // 保存所有事件的监听器：事件名 → 回调函数列表
  private listeners = new Map<string, Function[]>();

  // 订阅：注册事件监听
  on(event: string, fn: Function) {
    // 如果这个事件还没人订阅过，创建空数组
    const list = this.listeners.get(event) ?? [];
    list.push(fn);                              // 把回调函数加入列表
    this.listeners.set(event, list);
  }

  // 发布：触发事件，通知所有订阅者
  emit(event: string, data: any) {
    // 找到这个事件的所有监听器，逐个调用
    // ?. 可选链，意思：如果前面不是 undefined就继续执行。
    this.listeners.get(event)?.forEach(fn => fn(data));
  }
}

// 订阅：监听 "task:completed" 事件
bus.on("task:completed", task => {
  scheduler.onTaskCompleted(task);  // 任务完成后，调度器唤醒下一个节点
});

// 发布：Worker 执行完任务后发出事件
bus.emit("task:completed", task);
```

### 应用场景

```text
Worker 完成任务 → EventBus → Scheduler 唤醒下游节点
```

---
## 2. 策略模式（Strategy）

### 核心思想

把相同功能的不同实现封装成独立策略类，运行时可以随时切换（换模型就像换电池）。

### 示例：动态切换 LLM

```ts
// 统一接口：不管背后是哪个模型，调用方式都一样
interface LLM {
  chat(prompt: string): Promise<string>;
}

// 策略 1：OpenAI 实现
class OpenAIModel implements LLM {
  async chat(prompt: string) {
    // 内部调 OpenAI API
  }
}

// 策略 2：Claude 实现
class ClaudeModel implements LLM {
  async chat(prompt: string) {
    // 内部调 Anthropic API
  }
}

// 策略 3：Gemini 实现
class GeminiModel implements LLM {
  async chat(prompt: string) {
    // 内部调 Google API
  }
}

// Agent 持有当前模型（策略），可以随时更换
class Agent {
  constructor(private model: LLM) {}  // 构造函数注入一个模型

  setModel(model: LLM) {
    this.model = model;               // 运行时动态切换
  }
}
```

使用：

```ts
agent.setModel(new ClaudeModel());   // 换 Claude
agent.setModel(new OpenAIModel());   // 换 OpenAI
// Agent 调用 chat 的代码不用改，这就是策略模式的好处
```

### 应用场景

- 多 LLM 切换
- 多 Embedding 模型切换
- 多记忆策略切换
- 多调度算法切换

---
## 3. 工厂模式（Factory）

### 核心思想

把 `new` 的逻辑集中到一个类里，调用者不需要知道具体怎么创建，传个名字就行。

### 示例：创建模型实例

```ts
class ModelFactory {
  // 静态方法，不用 new ModelFactory，直接 ModelFactory.create() 调用
  static create(name: string): LLM {
    switch (name) {
      case "claude":  return new ClaudeModel();    // 创建 Claude
      case "openai":  return new OpenAIModel();    // 创建 OpenAI
      case "gemini":  return new GeminiModel();    // 创建 Gemini
      default:        throw new Error("Unknown model");  // 没有这个模型就报错
    }
  }
}
```

使用：

```ts
const model = ModelFactory.create("claude");  // 一行拿到模型，不需要知道 new 什么
```

### 应用场景

- ModelFactory（模型工厂）
- ToolFactory（工具工厂）
- WorkerFactory（执行器工厂）
- MemoryFactory（记忆工厂）

---
## 4. 责任链模式（Chain of Responsibility）

### 核心思想

像安检一样，请求挨个过检查点。每个 Guard 只负责一件事（权限、参数、沙箱、超时），通过才放行。

### 示例：四层 Guard 安全校验

```ts
// 每个 Guard 的接口：检查当前上下文，返回是否通过
interface Guard {
// ？可选属性，next: Guard | undefined
  next?: Guard;                       // 指向下一个 Guard（链式结构）
  check(ctx: Context): boolean;       // 执行检查
}

class PermissionGuard implements Guard {
  check(ctx) { /* 检查权限：用户有没有权利执行这个工具？ */ }
}

class ParamGuard implements Guard {
  check(ctx) { /* 检查参数：参数格式合法吗？有没有注入风险？ */ }
}

class SandboxGuard implements Guard {
  check(ctx) { /* 检查沙箱：路径在允许范围内吗？命令是否在黑名单？ */ }
}

class TimeoutGuard implements Guard {
  check(ctx) { /* 检查超时：执行时间有没有超过限制？ */ }
}
```

```typescript
const p = new PermissionGuard();
const a = new ParamGuard();
const s = new SandboxGuard();
const t = new TimeoutGuard();

p.next = a;
a.next = s;
s.next = t;
```

```typescript
let current = p;

while (current) {
    if (!current.check(ctx)) {
        return false;
    }

    current = current.next;
}

return true;
```

执行流程：

```text
请求
 ↓
PermissionGuard → 不通过就直接拒绝
 ↓
ParamGuard      → 不通过就报参数错误
 ↓
SandboxGuard    → 不通过就拦截危险操作
 ↓
TimeoutGuard    → 超时就终止
 ↓
执行 Tool       → 四关全过，安全执行
```

### 应用场景

- 安全校验（四层 Guard）
- Middleware（中间件）
- 请求过滤
- 权限控制

---
## 5. 适配器模式（Adapter）

### 核心思想

不同厂商的 API 格式不一样（OpenAI 和 Claude 请求体完全不同），用一个适配器包一层，对外暴露统一接口。

### 示例：统一不同 LLM API

```ts
interface LLM {
  chat(prompt: string): Promise<string>;  // 所有模型都实现这个接口
}

// OpenAI 适配器：把统一调用翻译成 OpenAI 的 API 格式
class OpenAIAdapter implements LLM {
  async chat(prompt: string) {
    return openai.responses.create(...);  // 内部调 OpenAI SDK
  }
}

// Claude 适配器：把统一调用翻译成 Anthropic 的 API 格式
class ClaudeAdapter implements LLM {
  async chat(prompt: string) {
    return anthropic.messages.create(...);  // 内部调 Anthropic SDK
  }
}
```

上层代码统一调用：

```ts
await model.chat(prompt);  // 不管背后是 OpenAI 还是 Claude，都一样调用
```

无需关心底层差异：OpenAI API / Claude API / Gemini API / Ollama API

### 应用场景

- 多模型统一接口
- MCP 工具封装
- 数据库驱动适配
- 第三方 SDK 封装

---
