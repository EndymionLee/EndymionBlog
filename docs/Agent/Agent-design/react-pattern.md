---
title: ReAct范式
date: 2026-03-11
---
# ReAct 范式

## 什么是 ReAct？

**ReAct = Reasoning + Acting**，即 **推理 + 行动**。

核心思想：让 LLM **交替进行"推理"和"行动"**，用推理指导行动，用行动结果更新推理。

> 论文：[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) (Google, 2022)

### 直观理解

```
传统 LLM 回答：
  用户：今天北京温度是多少？
  LLM：北京今天25°C。

ReAct Agent：
  Thought: 用户想知道北京的温度，我需要查一下天气数据。
  Action: 调用 get_weather(city="北京")
  Observation: {"temp": 25, "humidity": 60%}
  Thought: 数据显示北京25°C，直接回答用户。
  Answer: 北京今天25°C，湿度60%。
```

区别在于：**传统 LLM 靠训练数据猜测答案，ReAct Agent 通过工具获取真实信息**。

---

## ReAct 的循环流程

```
                        ┌─────────────────────┐
                        │    用户输入/问题      │
                        └──────────┬──────────┘
                                   ▼
                    ┌─────────────────────────┐
                    │   Thought（思考）         │
                    │   "我需要做什么？"        │
                    └──────────┬──────────────┘
                               │
                     ┌─────────▼─────────┐
                     │  Action（行动）    │
                     │  选择工具并调用    │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │ Observation（观察）│
                     │  获取工具返回结果   │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │  是否完成？        │
                     │  ┌────┐  ┌────┐   │
                     │  │ 否 │  │ 是 │   │
                     │  └──┬─┘  └──┬─┘   │
                     └─────┼──────┼──────┘
                           │      │
               回到 Thought │      ▼
                           │  ┌──────────┐
                           └──│ Answer   │
                              │ (最终回答)│
                              └──────────┘
```

---

## ReAct 的 Prompt 模板

ReAct 的核心在于 **Prompt 设计**。关键是要教会 LLM 交替输出 Thought / Action / Observation：

现在很多框架都可以动态把tools加载到prompt，为不是写死在prompt

```
你是一个能调用工具的 AI 助手。

请按以下格式思考并行动：

Thought: 分析当前情况，决定下一步做什么
Action: 选择要调用的工具和参数
Observation: 工具的返回结果
...（可重复 Thought/Action/Observation 多次）...
Thought: 根据所有信息，我可以回答用户了
Answer: 对用户的最终回答

可用工具：
- get_weather(city: str): 获取城市天气
- search(query: str): 搜索网络信息
- calculator(expression: str): 数学计算
```

---

## 代码实现：最简单的 ReAct Agent

### 方式一：用 OpenAI API 手写

```python
import json
from openai import OpenAI

client = OpenAI()

# 定义工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "执行数学计算",
            "parameters": {
                "type": "object",
                "properties": {
                    "expr": {
                        "type": "string",
                        "description": "数学表达式"
                    }
                },
                "required": ["expr"]
            }
        }
    }
]

# 工具函数实现
def get_weather(city: str) -> str:
    """模拟天气查询"""
    weather_data = {
        "北京": {"temp": 25, "condition": "晴"},
        "上海": {"temp": 28, "condition": "多云"},
        "广州": {"temp": 32, "condition": "阵雨"},
    }
    data = weather_data.get(city, {"temp": "未知", "condition": "未知"})
    return json.dumps(data)

def calculator(expr: str) -> str:
    """安全计算"""
    try:
        # 注意：eval 有安全风险，生产环境用 numexpr 或 ast
        result = eval(expr)
        return str(result)
    except Exception as e:
        return f"计算错误: {e}"

# 工具路由器
TOOL_MAP = {
    "get_weather": get_weather,
    "calculator": calculator,
}

# Agent 循环
def react_agent(user_input: str, max_rounds: int = 10) -> str:
    messages = [
        {"role": "system", "content": "你是一个能调用工具的助手。根据情况调用工具来回答用户问题。"},
        {"role": "user", "content": user_input}
    ]
  
    for round_idx in range(max_rounds):
        print(f"\n───── 第 {round_idx + 1} 轮 ─────")
      
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
      
        message = response.choices[0].message
      
        # 如果没有工具调用，直接返回
        if not message.tool_calls:
            print(f"Answer: {message.content}")
            return message.content
      
        # 处理工具调用
        messages.append(message)
      
        for tool_call in message.tool_calls:
            func_name = tool_call.function.name
            func_args = json.loads(tool_call.function.arguments)
          
            print(f"Thought: 我需要调用 {func_name}({func_args})")
          
            # 执行工具
            func = TOOL_MAP[func_name]
            result = func(**func_args)
          
            print(f"Observation: {result}")
          
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })
  
    return "已达最大轮数限制"

# 使用
result = react_agent("北京天气怎么样？帮我算一下 25+17")
print(f"\n最终回答: {result}")
```

---

## 高级 ReAct 模式

### 1. 带结构化输出的 ReAct

LLM 返回结构化的 `Thought/Action/Observation` 而非直接 Function Calling：

```json
{
  "thought": "用户想知道北京天气，我需要查天气数据",
  "action": {
    "name": "get_weather",
    "args": {"city": "北京"}
  }
}
```

**优点**：可以更精细地控制推理过程
**缺点**：需要额外解析，不如 Function Calling 可靠

### 2. 带中间步骤验证的 ReAct

每一步增加一个"验证"环节，防止 Agent 跑偏：

```
Thought → Action → Observation → Verification → Thought → ...
                                    │
                            ┌───────┴───────┐
                            │               │
                       结果合理        结果异常
                            │               │
                        继续循环       修正重试
```

### 3. ReAct + RAG 融合

```
Thought: 用户问了一个关于公司政策的问题
Action: 检索知识库 search_policy("请假规定")
Observation: 找到相关文档段落...
Thought: 找到了相关信息，结合文档回答
Answer: 根据公司规定，请病假需要提前提交... 
```

---

## 常见问题

### 防止无限循环

- **设置最大轮数**（通常 5-15 轮）
- **超时退出**：单轮超时 + 总超时
- **重复检测**：如果连续三轮做相同的事，强制退出

### 从错误中恢复

```python
try:
    result = execute_tool(func_name, func_args)
except Exception as e:
    # 告诉 LLM 错误信息，让它自己决定怎么处理
    observation = f"工具执行出错: {str(e)}"
    # LLM 可能会选择重试、换工具或直接回答
```

### Token 成本控制

- 每一轮都会消耗 Token，限制最大轮数
- 复杂任务用强模型（GPT-4/Claude 3），简单工具调用用弱模型
- 考虑在长任务中压缩历史

---

