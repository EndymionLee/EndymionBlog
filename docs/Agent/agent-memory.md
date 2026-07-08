title: Agent的记忆系统
date: 2026-03-12

# Agent 的记忆系统

## 为什么要给 Agent 记忆？

没有记忆的 Agent 像是 **金鱼**——每次对话都是全新的开始：

```
用户：我叫小明
Agent：你好！有什么可以帮助你的？
用户：我叫什么名字？
Agent：抱歉，我不记得之前说过什么。
```

有记忆的 Agent：

```
用户：我叫小明
Agent：你好小明！有什么可以帮助你的？
用户：我叫什么名字？
Agent：你之前告诉我你叫小明。
```

---

## 记忆的分类

```
Agent 记忆系统
│
├── 🟢 短期记忆 (Short-term)
│   ├── 对话上下文（当前会话）
│   └── 工作记忆（当前任务状态）
│
├── 🟡 长期记忆 (Long-term)
│   ├── 事实记忆（用户信息、偏好）
│   ├── 经验记忆（过去的成功/失败）
│   └── 知识记忆（领域知识）
│
└── 🔴 工具记忆
    ├── 工具使用方式
    └── 常见模式
```

| 记忆类型 | 存储位置         | 持续时间 | 容量               | 访问速度 |
| -------- | ---------------- | -------- | ------------------ | -------- |
| 短期记忆 | LLM 上下文窗口   | 会话期间 | 小（~128K tokens） | 即时     |
| 长期记忆 | 向量数据库 / SQL | 持久     | 大                 | 快       |
| 工具记忆 | 代码 / 配置文件  | 持久     | 中                 | 即时     |

---

## 一、短期记忆（对话上下文）

### 最简单的实现：消息列表

```python
messages = [
    {"role": "system", "content": "你是AI助手"},
    {"role": "user", "content": "我叫小明"},
    {"role": "assistant", "content": "你好小明！"},
    {"role": "user", "content": "我叫什么名字？"},
]

response = llm.invoke(messages)
# 能正确回答"小明"
```

### 窗口式记忆（限制长度）

当对话很长时，需要裁剪历史：

```python
from collections import deque

class SlidingWindowMemory:
    """滑动窗口记忆：只保留最近的 N 轮对话"""
  
    def __init__(self, max_rounds: int = 10, system_prompt: str = ""):
        self.max_rounds = max_rounds * 2  # 每轮有 user + assistant 两条
        self.system_prompt = system_prompt
        self.history = deque(maxlen=self.max_rounds)
  
    def add(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
  
    def get_context(self) -> list[dict]:
        """获取当前上下文（含 system prompt）"""
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(list(self.history))
        return messages
  
    def summarize_and_compress(self, llm) -> str:
        """对旧记忆进行压缩总结"""
        old_msgs = list(self.history)[:-self.max_rounds]
        if old_msgs:
            summary = llm.invoke(
                f"总结以下对话的核心信息：\n{old_msgs}"
            )
            # 保留总结，丢弃原始消息
            self.history.clear()
            self.history.append({"role": "system", "content": f"【历史摘要】{summary}"})
```

---

## 二、长期记忆（向量数据库）

### 核心流程

```
用户信息 → 向量化(Embedding) → 存入向量数据库
                                            ↓
用户提问 → 向量化(Embedding) → 相似度检索 → 找到相关记忆 → 作为上下文给LLM
```

### 基于 Chroma 的记忆系统

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
import uuid
from datetime import datetime

class LongTermMemory:
    """基于向量数据库的长期记忆系统"""
  
    def __init__(self, collection_name: str = "agent_memory"):
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory="./memory_db",
        )
  
    def remember(self, fact: str, metadata: dict = None):
        """存储一条记忆"""
        doc = Document(
            page_content=fact,
            metadata={
                "timestamp": datetime.now().isoformat(),
                "id": str(uuid.uuid4()),
                **(metadata or {})
            }
        )
        self.vectorstore.add_documents([doc])
        print(f"已记忆: {fact[:50]}...")
  
    def recall(self, query: str, k: int = 5) -> list[str]:
        """检索相关记忆"""
        docs = self.vectorstore.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
  
    def recall_with_time(self, query: str, hours: int = 24, k: int = 5) -> list[str]:
        """检索最近 N 小时内的相关记忆"""
        from datetime import timedelta
  
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
  
        docs = self.vectorstore.similarity_search(
            query,
            k=k,
            filter={"timestamp": {"$gte": cutoff}}
        )
        return [doc.page_content for doc in docs]
  
    def forget(self, memory_id: str):
        """删除特定记忆"""
        self.vectorstore.delete(ids=[memory_id])
  
    def clear(self):
        """清空所有记忆"""
        self.vectorstore.delete_collection()


# ===== 使用示例 =====

memory = LongTermMemory()

# 存储记忆
memory.remember("用户名叫小明，是一名 Python 开发者")
memory.remember("用户正在学习 AI Agent 开发")
memory.remember("用户使用 Windows 系统")

# 检索记忆
query = "关于用户的信息"
relevant = memory.recall(query)
print("检索到的相关记忆:")
for m in relevant:
    print(f"  - {m}")
```

---

## 三、增强版记忆系统

### 1. 带重要性的记忆（优先记忆重要信息）

```python
import json

class ImportanceAwareMemory(LongTermMemory):
    """根据重要性决定是否记住"""
  
    def __init__(self, llm, importance_threshold: int = 5):
        super().__init__()
        self.llm = llm
        self.importance_threshold = importance_threshold
  
    def remember_if_important(self, fact: str) -> bool:
        """让 LLM 判断这条信息是否值得记住"""
        response = self.llm.invoke(
            f"从1-10打分，以下信息作为长期记忆的重要性：\n"
            f"'{fact}''\n"
            f"只返回数字。"
        )
        score = int(response.content.strip())
    
        if score >= self.importance_threshold:
            self.remember(fact, {"importance": score})
            return True
        return False
  
    def recall_important(self, query: str, k: int = 5) -> list[str]:
        """优先检索高重要度的记忆"""
        docs = self.vectorstore.similarity_search(query, k=k*2)
        # 按重要度排序
        docs.sort(key=lambda d: d.metadata.get("importance", 0), reverse=True)
        return [doc.page_content for doc in docs[:k]]
```

### 2. 分层记忆（短期→长期 自动迁移）

```python
class HierarchicalMemory:
    """分层记忆：短期自动迁移到长期"""
  
    def __init__(self, llm):
        self.short_term = SlidingWindowMemory(max_rounds=20)
        self.long_term = ImportanceAwareMemory(llm)
        self.llm = llm
  
    def add_message(self, role: str, content: str):
        """添加消息到短期记忆"""
        self.short_term.add(role, content)
  
    def periodic_consolidate(self):
        """定期将短期记忆中的重要信息迁移到长期"""
        recent = list(self.short_term.history)[-5:]
    
        # 提取重要信息
        response = self.llm.invoke(
            f"从以下对话中提取需要长期记住的事实：\n{recent}\n"
            f"以JSON列表格式返回：[{{\"fact\": \"...\", \"importance\": 1-10}}]"
        )
    
        try:
            facts = json.loads(response.content)
            for fact in facts:
                if fact["importance"] >= 6:
                    self.long_term.remember(fact["fact"])
        except:
            pass  # 解析失败就跳过
  
    def get_context(self, query: str) -> list[dict]:
        """合并短期+长期记忆作为上下文"""
        context = self.short_term.get_context()
    
        # 检索相关长期记忆
        long_term_facts = self.long_term.recall(query, k=3)
    
        if long_term_facts:
            context.insert(1, {
                "role": "system",
                "content": f"以下是你之前记住的信息：\n" + "\n".join(long_term_facts)
            })
    
        return context
```

---

## 四、用 SQLite 做结构化记忆

向量数据库擅长"模糊搜索"，但某些信息需要精确存储：

```python
import sqlite3
import json
from datetime import datetime

class StructuredMemory:
    """结构化记忆：用 SQLite 存储精确信息"""
  
    def __init__(self, db_path: str = "./agent_memory.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_db()
  
    def _init_db(self):
        cursor = self.conn.cursor()
    
        # 用户信息表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_info (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP
            )
        """)
    
        # 对话记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                role TEXT,
                content TEXT,
                timestamp TIMESTAMP
            )
        """)
    
        # Agent 经验表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_experience (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type TEXT,
                what_worked TEXT,
                what_didnt TEXT,
                created_at TIMESTAMP
            )
        """)
    
        self.conn.commit()
  
    def set_user_info(self, key: str, value: str):
        """记住用户信息（精确匹配）"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO user_info (key, value, updated_at)
            VALUES (?, ?, ?)
        """, (key, value, datetime.now()))
        self.conn.commit()
  
    def get_user_info(self, key: str) -> str | None:
        """查询用户信息"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT value FROM user_info WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row[0] if row else None
  
    def add_experience(self, task_type: str, what_worked: str, what_didnt: str):
        """记录 Agent 经验"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO agent_experience (task_type, what_worked, what_didnt, created_at)
            VALUES (?, ?, ?, ?)
        """, (task_type, what_worked, what_didnt, datetime.now()))
        self.conn.commit()
  
    def get_relevant_experience(self, task_type: str) -> list[dict]:
        """获取类似任务的经验"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT what_worked, what_didnt FROM agent_experience
            WHERE task_type LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
        """, (f"%{task_type}%",))
    
        return [
            {"worked": row[0], "didnt": row[1]}
            for row in cursor.fetchall()
        ]
```

---

## 五、结合 RAG 的知识记忆

 RAG是 Agent 知识记忆的天然方案：

```python
class KnowledgeMemory:
    """基于 RAG 的领域知识记忆"""
  
    def __init__(self, docs_path: str = "./knowledge_base"):
        self.vectorstore = Chroma(
            persist_directory=docs_path,
            embedding_function=OpenAIEmbeddings()
        )
  
    def load_documents(self, file_paths: list[str]):
        """加载知识文档"""
        from langchain_community.document_loaders import TextLoader, PDFLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
    
        all_docs = []
        for path in file_paths:
            loader = TextLoader(path)
            docs = loader.load()
            chunks = splitter.split_documents(docs)
            all_docs.extend(chunks)
    
        self.vectorstore.add_documents(all_docs)
        print(f"已加载 {len(all_docs)} 个知识块")
  
    def query(self, question: str, k: int = 3) -> list[str]:
        """检索相关知识"""
        docs = self.vectorstore.similarity_search(question, k=k)
        return [doc.page_content for doc in docs]
```

---

## 六、完整的记忆系统设计

```
┌─────────────────────────────────────┐
│         Agent 记忆系统               │
│                                     │
│  用户输入                            │
│     │                               │
│     ▼                               │
│  ┌──────────┐     ┌─────────────┐   │
│  │ 短期记忆  │────▶│ 长期记忆迁移  │   │
│  │ (滑动窗口)│     │ (重要性判断)  │   │
│  └────┬─────┘     └──────┬──────┘   │
│       │                  │          │
│       ▼                  ▼          │
│  ┌──────────┐     ┌─────────────┐   │
│  │ 短期上下文 │     │ 向量数据库   │   │
│  │ (当前会话)│     │ + SQLite    │   │
│  └────┬─────┘     └──────┬──────┘   │
│       │                  │          │
│       ▼                  ▼          │
│  ┌──────────────────────────────┐   │
│  │       LLM 上下文组装          │   │
│  │  system: 你叫小明，是Python... │   │
│  │  user: 帮我写个爬虫           │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 七、记忆管理的注意事项

| 注意事项             | 说明                                   |
| -------------------- | -------------------------------------- |
| **隐私保护**   | 涉及用户隐私的信息需要用户确认后再存储 |
| **遗忘机制**   | 记忆应该有"保质期"，过期的记忆自动清除 |
| **去重**       | 避免重复存储相同信息                   |
| **上下文窗口** | 记忆内容不能超出 LLM 的上下文限制      |
| **检索精度**   | 检索到不相关的记忆比没有记忆更糟糕     |
| **记忆更新**   | 当信息发生变化时，需要更新而非追加     |
