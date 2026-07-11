---
title: Pi RPC
date: 2026-07-11
---

# Pi RPC 协议参考

> 来源：https://pi.dev/docs/latest/rpc

---

## 什么是 RPC 模式

RPC 模式通过 stdin/stdout 上的 JSON 协议提供无界面（headless）的 Agent 控制能力，用于将 Pi 嵌入 IDE、自定义 UI 或其他应用。

对于 Node.js/TypeScript 用户，官方推荐优先考虑直接在代码中使用 `AgentSession`（SDK），而不是启动子进程走 RPC。

```bash
# 启动 RPC 模式
pi --mode rpc [options]

# 常用选项
pi --mode rpc --no-session                                # 不持久化
pi --mode rpc --model anthropic/claude-sonnet-5            # 指定模型
pi --mode rpc --name "my-session"                          # 会话名称
```

---

## 协议概述

三种 JSON 对象在连接中流动：

```
stdin（发送命令）         stdout（接收响应 + 事件）
─────────────────        ─────────────────────────
{"id":"1","type":       {"id":"1","type":"response",
  "prompt","message":     "command":"prompt",
  "你好"}                  "success":true}
                          {"type":"message_update",...}
                          {"type":"agent_end",...}
```

### 帧格式

严格 JSONL 语义，LF（`\n`）为唯一行分隔符：

- 按 `\n` 分割记录
- 可选的 `\r\n` 通过去掉结尾 `\r` 处理
- **不要**使用通用行读取器（Node 的 `readline` 不兼容——它会在 U+2028 和 U+2029 处分割，这些字符可能出现在 JSON 字符串内部）

---

## 命令参考

### 提示（Prompting）

**prompt** — 发送用户消息：

```json
{"id": "1", "type": "prompt", "message": "你好！"}
{"id": "2", "type": "prompt", "message": "描述这张图", "images": [
  {"type": "image", "data": "base64...", "mimeType": "image/png"}
]}
```

流式过程中必须指定 `streamingBehavior`：

```json
{"id": "3", "type": "prompt", "message": "先做这个", "streamingBehavior": "steer"}
{"id": "4", "type": "prompt", "message": "完成后做这个", "streamingBehavior": "followUp"}
```

**steer** — 流式过程中排队转向消息：

```json
{"type": "steer", "message": "停下来做这个"}
```

**follow_up** — 流式过程中排队后续消息（Agent 完成后执行）：

```json
{"type": "follow_up", "message": "完成后也做这个"}
```

**abort** — 中止当前操作：

```json
{"type": "abort"}
```

**new_session** — 创建新会话：

```json
{"type": "new_session"}
{"type": "new_session", "parentSession": "/path/to/session.jsonl"}
```

### 状态（State）

**get_state** — 获取当前会话状态：

```json
{"type": "get_state"}
```

响应包含：model、thinkingLevel、isStreaming、isCompacting、sessionFile、sessionId、sessionName、messageCount、pendingMessageCount 等。

**get_messages** — 获取所有消息：

```json
{"type": "get_messages"}
```

### 模型（Model）

```json
{"type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-5"}
{"type": "cycle_model"}
{"type": "get_available_models"}
```

### 思考级别（Thinking）

```json
{"type": "set_thinking_level", "level": "high"}
{"type": "cycle_thinking_level"}
```

级别：`off` | `minimal` | `low` | `medium` | `high` | `xhigh` | `max`

### 队列模式（Queue Modes）

```json
{"type": "set_steering_mode", "mode": "one-at-a-time"}
{"type": "set_follow_up_mode", "mode": "all"}
```

### 压缩（Compaction）

```json
{"type": "compact"}
{"type": "compact", "customInstructions": "重点保留最近的更改"}
{"type": "set_auto_compaction", "enabled": true}
```

### 重试（Retry）

```json
{"type": "set_auto_retry", "enabled": true}
{"type": "abort_retry"}
```

### Bash

```json
{"type": "bash", "command": "ls -la"}
```

响应包含 output、exitCode、cancelled、truncated。

注意：Bash 结果不会立即触发事件，它会存到 Agent 状态中，下次 `prompt` 时一并发给 LLM。

### 会话管理（Session）

```json
{"type": "get_session_stats"}
{"type": "export_html", "outputPath": "/tmp/session.html"}
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
{"type": "fork", "entryId": "abc123"}
{"type": "clone"}
{"type": "get_fork_messages"}
{"type": "get_entries"}
{"type": "get_entries", "since": "abc123"}
{"type": "get_tree"}
{"type": "get_last_assistant_text"}
{"type": "set_session_name", "name": "my-feature-work"}
```

### 命令查询（Commands）

```json
{"type": "get_commands"}
```

返回扩展命令、提示模板和技能列表，通过 `/name` 发送。

---

## 事件参考

事件通过 stdout 以 JSON 行形式推送，**不带** `id` 字段。

| 事件 | 说明 |
|------|------|
| `agent_start` | Agent 开始处理 |
| `agent_end` | Agent 运行完成，含 `willRetry` |
| `agent_settled` | 完全空闲（无重试/压缩/队列后续） |
| `turn_start` | 新回合开始 |
| `turn_end` | 回合结束（含消息和工具结果） |
| `message_start` | 消息开始 |
| `message_update` | 流式更新 |
| `message_end` | 消息完成 |
| `tool_execution_start` | 工具开始执行 |
| `tool_execution_update` | 工具执行进度 |
| `tool_execution_end` | 工具执行完成 |
| `queue_update` | 排队队列变化 |
| `compaction_start/end` | 压缩开始/结束 |
| `auto_retry_start/end` | 自动重试开始/结束 |
| `extension_error` | 扩展抛出错误 |

### message_update 的流式类型

`assistantMessageEvent.type` 可以是：

| 类型 | 说明 |
|------|------|
| `text_start` | 文本块开始 |
| `text_delta` | 文本增量 |
| `text_end` | 文本块结束 |
| `thinking_start` | 思考块开始 |
| `thinking_delta` | 思考增量 |
| `thinking_end` | 思考块结束 |
| `toolcall_start` | 工具调用开始 |
| `toolcall_delta` | 工具参数增量 |
| `toolcall_end` | 工具调用结束 |
| `done` | 消息完成 |
| `error` | 错误 |

流式文本序列示例：

```
{"type":"message_update","assistantMessageEvent":{"type":"text_start"},...}
{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"你好"},...}
{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"世界"},...}
{"type":"message_update","assistantMessageEvent":{"type":"text_end"},...}
```

---

## 扩展 UI 协议

扩展的 `ctx.ui.select()`、`ctx.ui.confirm()` 等方法在 RPC 模式下会转换为请求/响应子协议。

### 对话框方法（需要回复）

扩展 UI 请求发到 stdout，客户端回复到 stdin：

```
stdout: {"type":"extension_ui_request","id":"uuid-1","method":"select",
         "title":"选择","options":["A","B"],"timeout":5000}
stdin:  {"type":"extension_ui_response","id":"uuid-1","value":"A"}
```

**select：**
```json
{"type":"extension_ui_request","id":"uuid","method":"select","title":"请选择","options":["A","B"]}
// 回复: {"type":"extension_ui_response","id":"uuid","value":"A"}
// 取消: {"type":"extension_ui_response","id":"uuid","cancelled":true}
```

**confirm：**
```json
{"type":"extension_ui_request","id":"uuid","method":"confirm","title":"确认","message":"确定吗？"}
// 回复: {"type":"extension_ui_response","id":"uuid","confirmed":true}
```

**input：**
```json
{"type":"extension_ui_request","id":"uuid","method":"input","title":"输入","placeholder":"名字"}
// 回复: {"type":"extension_ui_response","id":"uuid","value":"xxx"}
```

**editor：**
```json
{"type":"extension_ui_request","id":"uuid","method":"editor","title":"编辑","prefill":"默认文本"}
// 回复: {"type":"extension_ui_response","id":"uuid","value":"编辑后的文本"}
```

### 即发即弃方法（无需回复）

```json
{"type":"extension_ui_request","id":"uuid","method":"notify","message":"完成","notifyType":"info"}
{"type":"extension_ui_request","id":"uuid","method":"setStatus","statusKey":"my-key","statusText":"处理中"}
{"type":"extension_ui_request","id":"uuid","method":"setWidget","widgetKey":"my-widget","widgetLines":["行1","行2"]}
{"type":"extension_ui_request","id":"uuid","method":"setTitle","title":"新标题"}
{"type":"extension_ui_request","id":"uuid","method":"set_editor_text","text":"预填文本"}
```

### RPC 模式下不支持的方法

- `custom()` → 返回 `undefined`
- `getEditorText()` → 返回 `""`
- `setWorkingMessage()`、`setFooter()`、`setHeader()` → 无操作
- `getAllThemes()` → 返回 `[]`

`ctx.mode` 为 `"rpc"`，`ctx.hasUI` 为 `true`（因为对话框和通知方法可用）。

---

## 错误处理

失败命令返回 `success: false` 和 `error` 描述：

```json
{"type":"response","command":"prompt","success":false,
 "error":"No API key found for provider anthropic"}
```

解析错误使用 `command: "parse"`：

```json
{"type":"response","command":"parse","success":false,
 "error":"Failed to parse command: Unexpected token..."}
```

---

## 客户端示例

### Python 最小客户端

```python
import subprocess
import json

proc = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True
)

cmd = json.dumps({"id": "1", "type": "prompt", "message": "你好"})
proc.stdin.write(cmd + "\n")
proc.stdin.flush()

for line in proc.stdout:
    obj = json.loads(line)
    if obj.get("type") == "message_update":
        delta = obj.get("assistantMessageEvent", {}).get("delta", "")
        print(delta, end="")
    if obj.get("type") == "agent_end":
        break
```

### Node.js 最小客户端

```typescript
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";

const proc = spawn("pi", ["--mode", "rpc", "--no-session"]);
const decoder = new StringDecoder("utf8");
let buffer = "";

proc.stdout.on("data", (data) => {
  buffer += decoder.write(data);
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (!trimmed) continue;
    const obj = JSON.parse(trimmed);

    if (obj.type === "message_update" && obj.assistantMessageEvent?.type === "text_delta") {
      process.stdout.write(obj.assistantMessageEvent.delta);
    }
    if (obj.type === "agent_end") proc.kill();
  }
});

proc.stdin.write(JSON.stringify({ id: "1", type: "prompt", message: "你好" }) + "\n");
```

---

## SDK vs RPC 选择

| 场景 | 推荐方式 |
|------|----------|
| 同一 Node.js 进程 | SDK（`AgentSession`） |
| 需要类型安全 | SDK |
| 需要直接访问状态 | SDK |
| 跨语言集成 | RPC |
| 进程隔离 | RPC |
| 构建语言无关的客户端 | RPC |
