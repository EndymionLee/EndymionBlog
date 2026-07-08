title: 多 Agent 协作
date: 2026-03-12

# 多 Agent 协作

## 为什么需要多 Agent？

单个 Agent 有局限性：

- **上下文窗口有限**：一个 Agent 容纳不了一个大型项目的全部信息
- **单一角色限制**：写代码和测试是不同技能
- **单点故障**：Agent 犯错无法被及时发现

**多 Agent 系统的核心理念**：让多个专业化 Agent 分工协作，就像人类团队一样。

---

## 三大协作模式

### 1. 管理者-Worker 模式

```
         ┌──────────┐
         │   Supervisor  │ ← 负责任务分解、分配、质量检查
         │   (管理者)    │
         └──────┬──────┘
      ┌─────────┼─────────┐
      ▼         ▼         ▼
  ┌──────┐ ┌──────┐ ┌──────┐
  │Worker│ │Worker│ │Worker│ ← 各司其职
  │  1   │ │  2   │ │  3   │
  └──────┘ └──────┘ └──────┘
```

**适用场景**：大型项目、需要统一调度的任务

### 2. 辩论/讨论模式

```
  ┌─────────┐     ┌─────────┐
  │ Agent A │◄───►│ Agent B │ ← 各持不同观点
  └─────────┘     └─────────┘
       ▲               ▲
       │               │
       ▼               ▼
  ┌─────────────────────────┐
  │     仲裁/汇总 Agent     │ ← 综合多方案，得出最佳结果
  └─────────────────────────┘
```

**适用场景**：需要多角度分析、方案评审

### 3. 管道模式

```
数据输入 → Agent A → Agent B → Agent C → 输出
(数据清洗)  (分析)    (生成报告)  (翻译)
```

**适用场景**：有明确先后顺序的处理流程

---

## 一、用 LangGraph 实现多 Agent

### 示例：代码开发团队

三个角色：**产品经理** → **工程师** → **测试员**

```python
from typing import TypedDict, Literal, Annotated
from langgraph.graph import StateGraph, END, add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
import operator

# ===== 状态定义 =====

class DevTeamState(TypedDict):
    messages: Annotated[list, add_messages]
    requirement: str
    design: str
    code: str
    test_report: str
    next_agent: str

# ===== 各 Agent 的 System Prompt =====

PM_PROMPT = """你是产品经理。分析用户需求，输出清晰的需求文档。
输出格式：
1. 功能列表
2. 技术约束
3. 验收标准"""

DEV_PROMPT = """你是高级工程师。根据需求文档编写代码。
要求：
- 代码完整可运行
- 包含注释
- 考虑边界情况
- 遵循最佳实践"""

TEST_PROMPT = """你是测试工程师。审查代码并编写测试用例。
检查：
1. 功能完整性
2. 错误处理
3. 边界条件
4. 安全性"""

# ===== 创建各 Agent =====

llm = ChatOpenAI(model="gpt-4o")

pm_agent = llm.bind(system=PM_PROMPT)
dev_agent = llm.bind(system=DEV_PROMPT)
qa_agent = llm.bind(system=TEST_PROMPT)

# ===== 节点函数 =====

def analyze_requirement(state: DevTeamState):
    """产品经理分析需求"""
    response = pm_agent.invoke([
        HumanMessage(content=f"用户需求：{state['requirement']}")
    ])
    return {"design": response.content, "next_agent": "developer"}

def generate_code(state: DevTeamState):
    """工程师编写代码"""
    response = dev_agent.invoke([
        HumanMessage(content=f"需求文档：{state['design']}\n请生成代码")
    ])
    return {"code": response.content, "next_agent": "tester"}

def run_tests(state: DevTeamState):
    """测试员审查代码"""
    response = qa_agent.invoke([
        HumanMessage(content=f"代码：{state['code']}\n请审查并编写测试用例")
    ])
    return {"test_report": response.content, "next_agent": "end"}

def decide_next(state: DevTeamState) -> Literal["developer", "tester", "end"]:
    """决定下一步"""
    return state.get("next_agent", "end")

# ===== 构建图 =====

builder = StateGraph(DevTeamState)

builder.add_node("pm", analyze_requirement)
builder.add_node("developer", generate_code)
builder.add_node("tester", run_tests)

builder.set_entry_point("pm")

builder.add_conditional_edges(
    "pm",
    lambda s: "developer",
    {"developer": "developer"}
)
builder.add_conditional_edges(
    "developer",
    lambda s: "tester",
    {"tester": "tester"}
)
builder.add_conditional_edges(
    "tester",
    lambda s: END,
    {END: END}
)

team = builder.compile()

# ===== 运行 =====

result = team.invoke({
    "requirement": "写一个 Python 函数，读取 CSV 文件并返回平均值"
})

print("需求文档:")
print(result["design"][:200] + "...")
print("\n生成的代码:")
print(result["code"])
print("\n测试报告:")
print(result["test_report"])
```

---

## 二、用 CrewAI 实现多 Agent

CrewAI 是专门为多 Agent 协作设计的框架，使用更简洁：

```bash
pip install crewai
```

### 基础用法

```python
from crewai import Agent, Task, Crew, Process

# ===== 1. 定义 Agent =====

researcher = Agent(
    role="研究分析师",
    goal="深入调查并收集准确信息",
    backstory="你是有10年经验的研究分析师，擅长快速找到关键信息",
    llm="gpt-4o",
    verbose=True,
    allow_delegation=False,  # 不允许委托任务给其他Agent
)

writer = Agent(
    role="技术写作专家",
    goal="将复杂技术概念转化为清晰易懂的内容",
    backstory="你是资深技术写手，擅长将技术内容通俗化",
    llm="gpt-4o",
    verbose=True,
    allow_delegation=False,
)

reviewer = Agent(
    role="质量审查官",
    goal="确保输出内容的准确性和可读性",
    backstory="你是挑剔的审查官，不放过任何错误",
    llm="gpt-4o",
    verbose=True,
)

# ===== 2. 定义任务 =====

research_task = Task(
    description="研究 AI Agent 开发的最新趋势和技术栈",
    expected_output="一份300字的研究摘要，包含关键技术和趋势",
    agent=researcher,
)

writing_task = Task(
    description="基于研究摘要，写一篇技术博客文章",
    expected_output="一篇800字的技术博客，包含引言、主体和结论",
    agent=writer,
    context=[research_task],  # 依赖前一个任务的结果
)

review_task = Task(
    description="审查博客文章，检查事实准确性和表达清晰度",
    expected_output="修改建议列表和最终通过状态",
    agent=reviewer,
    context=[writing_task],
)

# ===== 3. 创建 Crew =====

crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential,  # 顺序执行（默认）
    verbose=True,
)

# ===== 4. 启动 =====

result = crew.kickoff(inputs={"topic": "AI Agent 开发"})
print(f"最终输出:\n{result}")
```

### 并行模式

```python
# CrewAI 的层级模式：管理者分配任务给 workers
project_crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.hierarchical,  # 层级模式
    manager_llm="gpt-4o",  # 管理者使用更强的模型
    verbose=True,
)
```

---

## 三、用 AutoGen 实现多 Agent

Microsoft 的 AutoGen 擅长对话式多 Agent：

```python
# pip install pyautogen

from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# 1. 创建 Agent
llm_config = {"config_list": [{"model": "gpt-4o", "api_key": "..."}]}

planner = AssistantAgent(
    name="Planner",
    system_message="你是规划者，将复杂任务分解为可执行的步骤",
    llm_config=llm_config,
)

coder = AssistantAgent(
    name="Coder",
    system_message="你是 Python 程序员，编写高质量代码",
    llm_config=llm_config,
)

critic = AssistantAgent(
    name="Critic",
    system_message="你是代码审查者，发现代码中的问题和改进空间",
    llm_config=llm_config,
)

# 2. 群组聊天
groupchat = GroupChat(
    agents=[planner, coder, critic],
    messages=[],
    max_round=10,
)

manager = GroupChatManager(
    groupchat=groupchat,
    llm_config=llm_config,
)

# 3. 启动讨论
user_proxy = UserProxyAgent(
    name="User",
    code_execution_config=False,
)

user_proxy.initiate_chat(
    manager,
    message="写一个网页爬虫，爬取新闻标题并保存到 CSV"
)
```

---

## 四、多 Agent 核心挑战与解决方案

### 1. 上下文管理

```python
# 问题：每个 Agent 的上下文都在增长
# 解决：选择性传递关键信息

def summarize_for_next_agent(conversation: list, max_tokens: int = 2000):
    """用 LLM 压缩对话历史，只保留关键信息"""
    llm = ChatOpenAI(model="gpt-4o-mini")
    prompt = f"总结以下对话的关键信息（{max_tokens} tokens以内）：\n{conversation}"
    return llm.invoke(prompt).content
```

### 2. 冲突解决

```python
# 当两个 Agent 意见不一致时
# 方案1：引入仲裁 Agent
def resolve_conflict(opinion_a: str, opinion_b: str) -> str:
    """第三个 Agent 做仲裁"""
    return arbiter_agent.invoke(
        f"方案A：{opinion_a}\n方案B：{opinion_b}\n请决定哪个更好并说明理由"
    )

# 方案2：投票机制
from collections import Counter

def vote(opinions: list[str]) -> str:
    """多个 Agent 投票选出最佳方案"""
    return Counter(opinions).most_common(1)[0][0]
```

### 3. 成本控制

```python
# 策略：使用不同模型
planner_llm = ChatOpenAI(model="gpt-4o")       # 规划用强模型
worker_llm = ChatOpenAI(model="gpt-4o-mini")    # 执行用快模型

# 策略：设置 Agent 的对话轮数上限
MAX_ROUNDS = 5
```

---

## 五、多 Agent 设计原则

| 原则               | 说明                      | 坏例子                    | 好例子           |
| ------------------ | ------------------------- | ------------------------- | ---------------- |
| **职责分离** | 每个 Agent 做一件事       | 一个 Agent 既写代码又测试 | 写代码和测试分开 |
| **接口清晰** | 定义明确的输入输出格式    | 自由格式的对话            | 结构化的数据传递 |
| **可追溯**   | 每一步都可审计            | 黑盒决策                  | 记录 Reasoning   |
| **优雅降级** | 一个 Agent 挂了不影响整体 | 互相依赖                  | 超时/失败有备选  |
| **人类监督** | 关键决策留给人            | 完全自主                  | 关键步骤暂停确认 |

---
