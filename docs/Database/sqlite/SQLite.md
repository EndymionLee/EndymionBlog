---
title: SQLite 笔记
tags:
  - sqlite
  - database
  - sql
  - python
  - fastapi
date: 2025-06-19
---
# SQLite 教程

## 一、认识 SQLite

### SQLite vs PostgreSQL

```text
PostgreSQL：
    需要安装、启动服务、设置密码
    连接：postgresql://user:pass@localhost:5432/db
    适合：生产环境、多人访问

SQLite：
    不需要安装，一个文件搞定
    连接：sqlite:///./app.db
    适合：开发环境、本地工具、桌面应用
```

### 哪些软件在用 SQLite

```text
Chrome / Firefox：书签、历史记录、Cookie
Android / iOS：系统内置数据库
Electron 应用：VS Code、Obsidian 都在用
Python：标准库自带 import sqlite3
FastAPI 开发环境：默认用 SQLite 最方便
```

### 可视化工具

```bash
# 命令行
sqlite3 app.db
.tables           # 查看所有表
.schema users     # 看建表语句
SELECT * FROM users;
.quit

# 图形化（推荐）
# 安装 VS Code 插件：SQLite Viewer
# 或者用 DBeaver / DB Browser for SQLite
```

### 创建数据库

```bash
sqlite3 app.db
```

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

```text
和 PG 的区别：
    INTEGER PRIMARY KEY → 自动自增（不用 SERIAL）
    TEXT 代替 VARCHAR
    datetime('now') 代替 NOW()
    不需要端口、用户、密码
```

### 练习

1. 用 `sqlite3 app.db` 创建一个数据库
2. 创建 users 表，插入几条数据
3. 用 `.tables` 和 `.schema` 查看表信息

---

## 二、SQL 基础

SQLite 的 SQL 语法和 PostgreSQL 基本一样，只有少数差异。

### CREATE

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 自增主键
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
```

和 PG 的区别：

```text
INTEGER PRIMARY KEY → PG 用 SERIAL
TEXT → PG 用 VARCHAR(n)
datetime('now') → PG 用 NOW()
AUTOINCREMENT → PG 不需要
```

### INSERT

```sql
INSERT INTO users (name, email, age) VALUES ('Alice', 'alice@test.com', 25);

INSERT INTO users (name, email, age) VALUES
    ('Bob', 'bob@test.com', 30),
    ('Charlie', 'charlie@test.com', 28);

-- SQLite 用 last_insert_rowid() 获取刚插入的 ID
INSERT INTO users (name, email) VALUES ('David', 'david@test.com');
SELECT last_insert_rowid();
```

### SELECT

```sql
SELECT * FROM users;
SELECT name, email FROM users WHERE age > 25;
SELECT * FROM users ORDER BY created_at DESC;
SELECT * FROM users LIMIT 10 OFFSET 0;

-- 模糊搜索
SELECT * FROM users WHERE name LIKE '%lice%';

-- 聚合
SELECT COUNT(*) FROM users;
SELECT AVG(age) FROM users;
```

### UPDATE / DELETE

```sql
UPDATE users SET age = 26 WHERE name = 'Alice';
DELETE FROM users WHERE id = 1;
```

### 常用函数

```sql
-- 日期
SELECT date('now');           -- 今天日期
SELECT datetime('now');       -- 当前时间
SELECT strftime('%Y-%m-%d', 'now');  -- 格式化

-- 字符串
SELECT length('hello');
SELECT upper('hello');
SELECT substr('hello', 1, 2);
```

### 导入导出

```bash
# 导出整个数据库为 SQL 文件
sqlite3 app.db .dump > backup.sql

# 从 SQL 文件恢复
sqlite3 app.db < backup.sql
```

### 练习

1. 在 SQLite 里创建一个 `products` 表，插入 5 条数据
2. 查出价格在 50-100 之间的商品
3. 用 `.dump` 导出数据库

---

## 三、Python 集成

Python 自带 `sqlite3` 模块，不需要额外安装。

### 连接数据库

```python
import sqlite3

# 连接（文件不存在会自动创建）
conn = sqlite3.connect("app.db")

# 创建游标
cur = conn.cursor()
```

### 建表

```python
cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
    )
""")
conn.commit()
```

### CRUD

```python
# CREATE
cur.execute(
    "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
    ("Alice", "alice@test.com", 25)
)
conn.commit()
print(cur.lastrowid)  # 刚插入的 ID

# SELECT
cur.execute("SELECT * FROM users WHERE age > ?", (25,))
rows = cur.fetchall()       # 所有结果
row = cur.fetchone()        # 一条结果

for row in rows:
    print(row)  # (id, name, email, age, created_at)

# Row 对象（可以用列名访问）
cur.row_factory = sqlite3.Row
cur.execute("SELECT * FROM users LIMIT 1")
row = cur.fetchone()
print(row["name"])  # Alice

# UPDATE
cur.execute("UPDATE users SET age = ? WHERE name = ?", (26, "Alice"))
conn.commit()
print(cur.rowcount)  # 影响的行数

# DELETE
cur.execute("DELETE FROM users WHERE id = ?", (1,))
conn.commit()
```

### 批量操作

```python
users = [
    ("Bob", "bob@test.com", 30),
    ("Charlie", "charlie@test.com", 28),
    ("David", "david@test.com", 22),
]

cur.executemany(
    "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
    users,
)
conn.commit()
```

### 事务

```python
try:
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
except Exception as e:
    conn.rollback()
    print(f"转账失败: {e}")
```

### 封装成工具类

```python
class Database:
    def __init__(self, path: str = "app.db"):
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row

    def query(self, sql: str, params: tuple = ()) -> list:
        cur = self.conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]

    def execute(self, sql: str, params: tuple = ()) -> int:
        cur = self.conn.execute(sql, params)
        self.conn.commit()
        return cur.lastrowid

    def close(self):
        self.conn.close()


# 使用
db = Database("app.db")
users = db.query("SELECT * FROM users WHERE age > ?", (20,))
db.execute("INSERT INTO users (name, email) VALUES (?, ?)", ("Eve", "eve@test.com"))
```

### 练习

1. 用 sqlite3 创建 `products` 表，实现完整 CRUD
2. 批量插入 10 条数据
3. 封装一个 Database 类，支持 query 和 execute

---

## 四、FastAPI 集成

### 安装

```bash
pip install fastapi uvicorn sqlalchemy
```

SQLite Python 自带，不需要额外装驱动。

### 配置

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# SQLite 连接（文件型，不需要密码）
DATABASE_URL = "sqlite:///./app.db"

# SQLite 需要加这个参数，否则多线程会报错
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```python
# models.py
from sqlalchemy import Column, Integer, String
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
```

### CRUD

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import engine, Base, get_db
import models

Base.metadata.create_all(bind=engine)

app = FastAPI()


class UserCreate(BaseModel):
    name: str
    email: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


@app.post("/users", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(name=user.name, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users", response_model=list[UserOut])
def list_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return db.query(models.User).offset(skip).limit(limit).all()


@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

```bash
# 启动
uvicorn main:app --reload
```

### SQLite vs PostgreSQL 在 FastAPI 中的区别

```text
数据库连接：
    SQLite:    sqlite:///./app.db
    PostgreSQL: postgresql://user:pass@localhost:5432/dbname

ORM 代码完全一样，只需要改一行 DATABASE_URL

开发用 SQLite，部署切 PostgreSQL：
    本地：DATABASE_URL=sqlite:///./app.db
    线上：DATABASE_URL=postgresql://...
```
