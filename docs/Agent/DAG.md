---

title: DAG
date: 2026-03-11

---



# DAG（Directed Acyclic Graph）详解

# 一、什么是 DAG？

DAG 全称：

```text
Directed Acyclic Graph
有向无环图
```

它由三个单词组成：

```text
Directed（有向）
Acyclic（无环）
Graph（图）
```

DAG 是：

> 描述任务依赖关系的一种数据结构。

它广泛应用于：

- Agent 系统
- 工作流引擎
- 编译器
- 数据处理系统
- 分布式任务调度系统
- CI/CD 系统

例如：

- Apache Airflow
- Apache Spark
- Prefect
- LangGraph
- Devin
- Claude Code

都大量使用了 DAG。

---

# 二、什么是 Graph（图）

图由两部分组成：

## Node（节点）

表示：

```text
任务
状态
步骤
```

例如：

```text
Task1
Task2
Task3
```

---

## Edge（边）

表示：

```text
依赖关系
执行顺序
数据流
```

例如：

```text
Task1 → Task2
```

表示：

```text
Task2 依赖于 Task1。
```

---

# 三、什么是 Directed（有向）

边有方向。

例如：

```text
Task1 → Task2
```

表示：

```text
Task1 必须先执行，
然后才能执行 Task2。
```

而：

```text
Task2 → Task1
```

则是完全不同的含义。

---

# 四、什么是 Acyclic（无环）

不能出现循环依赖。

合法：

```text
A → B → C
```

非法：

```text
A → B → C
↑       ↓
└───────┘
```

因为：

```text
A 等待 C
C 等待 B
B 等待 A
```

所有任务都无法开始执行。

这种情况称为：

```text
循环依赖（Circular Dependency）
```

---

# 五、为什么需要 DAG？

现实世界中的任务通常存在依赖关系。

例如：

开发博客网站：

```text
创建数据库
    ↓
实现后端API
    ↓
实现前端页面
    ↓
部署
```

不能：

```text
先部署
再开发
```

因此需要一种数据结构来描述：

```text
谁依赖谁
谁先执行
谁可以并行执行
```

这就是 DAG。

---

# 六、最简单的 DAG

```text
Task1
  ↓
Task2
  ↓
Task3
```

执行顺序：

```text
Task1
Task2
Task3
```

只能串行执行。

---

# 七、复杂 DAG

```text
Task1
   ↓
 ┌──┴──┐
 ↓     ↓
T2     T3
 └──┬──┘
    ↓
   T4
```

表示：

```text
Task2 依赖 Task1
Task3 依赖 Task1
Task4 依赖 Task2 和 Task3
```

执行顺序：

```text
Step1:
Task1

Step2:
Task2 和 Task3（并行）

Step3:
Task4
```

---

# 八、DAG 最大的优势：自动并行

例如：

```text
下载数据
训练模型
发送通知
```

其中：

```text
下载数据
    ↓
训练模型

发送通知
```

发送通知并不依赖训练模型。

因此：

```text
训练模型
发送通知
```

可以同时执行。

DAG 能自动发现：

```text
哪些任务可以并行。
```

---

# 九、现实例子：做饭

任务：

```text
洗菜
切菜
炒菜
煮饭
盛饭
```

依赖：

```text
洗菜
 ↓
切菜
 ↓
炒菜

煮饭
 ↓
盛饭
```

DAG：

```text
      洗菜
        ↓
      切菜
        ↓
      炒菜
        ↓
      盛饭

      煮饭
        ↑
```

其中：

```text
洗菜和煮饭
可以同时进行。
```

---

# 十、DAG 在 Agent 中的应用

用户：

```text
开发博客系统
```

Planner：

```text
Task1 创建数据库

Task2 创建后端
依赖：Task1

Task3 创建前端
依赖：Task2

Task4 Docker部署
依赖：Task2、Task3
```

形成：

```text
Task1
  ↓
Task2
  ↓
Task3
   \  /
    \/
 Task4
```

TaskManager 按照 DAG 调度 Worker。

---

# 十一、为什么多 Agent 系统离不开 DAG？

因为复杂任务一定存在：

```text
依赖关系
并行关系
执行顺序
```

例如：

```text
读取代码
 ↓
修改代码
 ↓
运行测试
 ↓
提交代码
```

或者：

```text
搜索资料
生成文档
生成图片
```

其中：

```text
搜索资料
生成图片
```

可能可以同时执行。

---

# 十二、Task 数据结构设计

```python
class Task:
    id: str
    description: str
    dependencies: list[str]
    status: str
```

例如：

```python
task1.dependencies = []

task2.dependencies = ["task1"]

task3.dependencies = ["task1"]

task4.dependencies = [
    "task2",
    "task3"
]
```

---

# 十三、TaskManager 如何执行 DAG

判断：

```python
所有依赖是否已经完成
```

伪代码：

```python
def runnable(task):
    return all(
        dep.status == "finished"
        for dep in task.dependencies
    )
```

---

调度：

```python
while True:
    runnable_tasks = [
        t for t in tasks
        if runnable(t)
    ]
```

---

# 十四、如何检测循环依赖？

非法：

```text
A → B → C → A
```

执行前必须检查：

```text
是否存在环。
```

常见算法：

## 拓扑排序（Topological Sort）

如果：

```text
所有节点都能排序成功
```

说明：

```text
没有环。
```

否则：

```text
存在循环依赖。
```

---

# 十五、拓扑排序

输入：

```text
A → B
A → C
B → D
C → D
```

输出：

```text
A
B
C
D
```

或者：

```text
A
C
B
D
```

都合法。

因为：

```text
B 和 C 没有依赖关系。
```

---

# 十六、LangGraph 为什么叫 Graph？

因为底层：

```text
Node
+
Edge
+
State
=
DAG
```

例如：

```text
Planner
 ↓
CodeAgent
 ↓
ReviewAgent
 ↓
Finish
```

本质就是一个 DAG。

---

# 十七、Devin 为什么需要 DAG？

因为：

```text
开发软件
```

需要：

```text
分析需求
 ↓
生成代码
 ↓
运行测试
 ↓
修复错误
 ↓
提交结果
```

这些步骤存在依赖关系。

---

# 十八、Agent Runtime 推荐设计

```python
class Task:
    id: str
    description: str
    dependencies: list[str]
    status: str
```

Planner：

```python
tasks = [
    Task("1", "创建数据库", []),
    Task("2", "实现后端", ["1"]),
    Task("3", "实现前端", ["1"]),
    Task("4", "部署", ["2", "3"])
]
```

TaskManager：

```python
按照 dependencies 调度执行。
```

---

# 十九、在 Agent 系统中的位置

```text
User
 ↓
Planner
 ↓
生成 DAG
 ↓
TaskManager
 ↓
Scheduler
 ↓
Worker Agents
```

---

# 二十、总结

```text
DAG
=
Directed Acyclic Graph
=
有向无环图
=
任务依赖图
```

作用：

```text
描述任务之间的依赖关系，
决定任务执行顺序，
发现可以并行执行的任务，
避免循环依赖。
```

对于 Agent 系统：

```text
Planner 负责生成 DAG，
TaskManager 按照 DAG 调度任务，
Worker Agent 根据 DAG 执行任务。
```

复杂 Agent（Devin、Claude Code、LangGraph）的底层，本质上都离不开 DAG。
