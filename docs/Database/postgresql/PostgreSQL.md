---
title: PostgreSQL 笔记
tags:
  - postgresql
  - sql
  - database
  - fastapi
date: 2025-06-19
---
# PostgreSQL 教程

## 一、认识 PostgreSQL

PostgreSQL（简称 PG）是一个开源的关系型数据库。

```text
SQLite：文件型数据库，适合本地小项目
MySQL：流行，但功能比 PG 少
PostgreSQL：功能最强，最接近企业级标准
```

### 用 Docker 启动

```bash
docker run -d \
    --name my-postgres \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -e POSTGRES_DB=myapp \
    -p 5432:5432 \
    postgres:16

# 连接
psql -h localhost -U postgres -d myapp
```

### 常用 psql 命令

```bash
\l                    # 列出所有数据库
\c myapp              # 切换到 myapp 库
\dt                   # 列出所有表
\d users              # 查看 users 表结构
\di                   # 列出所有索引
\x                    # 切换竖向显示
\q                    # 退出
```

### 连接字符串

```text
postgresql://postgres:mysecretpassword@localhost:5432/myapp
#            用户名:密码                  主机:端口  数据库名
```

### 图形化工具

```text
pgAdmin → 官方图形界面   DBeaver → 通用数据库工具（推荐）
```

---

## 二、SQL 基础

### CREATE

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) UNIQUE,
    age INT CHECK (age > 0),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### INSERT

```sql
INSERT INTO users (name, email, age) VALUES ('Alice', 'alice@test.com', 25);

-- 批量
INSERT INTO users (name, email, age) VALUES
    ('Bob', 'bob@test.com', 30),
    ('Charlie', 'charlie@test.com', 28);

-- 返回插入的数据
INSERT INTO users (name, email, age) VALUES ('David', 'david@test.com', 22) RETURNING *;
```

### SELECT

```sql
SELECT * FROM users;
SELECT name, email FROM users;
SELECT * FROM users WHERE age > 25;
SELECT * FROM users ORDER BY created_at DESC;

-- 分页
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 0;   -- 第一页
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 10;  -- 第二页

-- 模糊搜索
SELECT * FROM users WHERE name LIKE '%lice%';

-- 聚合
SELECT COUNT(*), AVG(age), MIN(age), MAX(age) FROM users;
```

### UPDATE

```sql
UPDATE users SET age = 26 WHERE name = 'Alice';
UPDATE users SET age = 26, email = 'alice@new.com' WHERE id = 1 RETURNING *;
```

### DELETE

```sql
DELETE FROM users WHERE id = 1;
DELETE FROM users;       -- 删除全部
TRUNCATE users;          -- 清空表（更快）
```

### WHERE 条件

```sql
SELECT * FROM users WHERE age > 20 AND age < 30;
SELECT * FROM users WHERE age < 20 OR age > 50;
SELECT * FROM users WHERE age IN (25, 30, 35);
SELECT * FROM users WHERE age BETWEEN 20 AND 30;
SELECT * FROM users WHERE email IS NOT NULL;
```

---

## 三、表设计与数据类型

### 常用数据类型

| 类型             | 说明                     | 示例                                   |
| ---------------- | ------------------------ | -------------------------------------- |
| `INTEGER`      | 整数                     | `age INT`                            |
| `SERIAL`       | 自增整数（主键用）       | `id SERIAL PRIMARY KEY`              |
| `BIGSERIAL`    | 自增长整数（数据量大时） | `id BIGSERIAL PRIMARY KEY`           |
| `VARCHAR(n)`   | 变长字符串               | `name VARCHAR(100)`                  |
| `TEXT`         | 不限长度字符串           | `content TEXT`                       |
| `BOOLEAN`      | 布尔值                   | `is_active BOOLEAN DEFAULT true`     |
| `NUMERIC(p,s)` | 精确小数（金额用）       | `price NUMERIC(10,2)`                |
| `REAL`         | 浮点数                   | `rating REAL`                        |
| `DATE`         | 日期                     | `birthday DATE`                      |
| `TIMESTAMP`    | 日期时间                 | `created_at TIMESTAMP DEFAULT NOW()` |
| `JSONB`        | JSON 数据（可查询）      | `metadata JSONB`                     |

### 字段约束

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    price NUMERIC(10,2) CHECK (price > 0),
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
```

### 表设计原则

```text
1. 每个表都应该有一个主键
2. 字段用合适类型，不要全都 VARCHAR
3. 能用 NOT NULL 就用
4. 金额用 NUMERIC，不用 REAL
5. 经常查询的字段加索引
6. 不要存 JSON 大字段来代替正常设计
```

### 修改表

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users ALTER COLUMN age TYPE SMALLINT;
ALTER TABLE users ALTER COLUMN age SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users RENAME TO members;
```

---

## 四、关联查询

### 外键

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),  -- 外键
    amount NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

外键保证 `user_id` 必须是 `users` 表里存在的 id。

### 三种关系

```text
一对一：users → user_profiles
一对多：users → orders（最常见）
多对多：products ← product_categories → categories
```

### JOIN

```sql
SELECT o.id, o.amount, u.name
FROM orders o
JOIN users u ON o.user_id = u.id;
```

| JOIN 类型      | 结果                            |
| -------------- | ------------------------------- |
| `INNER JOIN` | 只返回两表都匹配的数据          |
| `LEFT JOIN`  | 左表全返回，右表没有的显示 NULL |
| `RIGHT JOIN` | 右表全返回，左表没有的显示 NULL |

```sql
-- LEFT JOIN 示例
SELECT u.name, o.id as order_id, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;

-- 多表关联
SELECT u.name, o.id as order_id, p.name as product_name
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE u.id = 1;

-- 聚合 + 关联
SELECT u.name, COUNT(o.id) as order_count, COALESCE(SUM(o.amount), 0) as total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total DESC;
```

---

## 五、索引与性能

### 创建索引

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_email ON users(email);         -- 唯一索引
CREATE INDEX idx_users_name_age ON users(name, age);          -- 联合索引
```

主键和 UNIQUE 约束会自动创建索引。

### 什么时候加索引

```text
 经常作为 WHERE 条件的字段
 经常作为 JOIN 条件的字段
 经常 ORDER BY 的字段
 不要每个字段都加（占用空间，写入变慢）
```

### EXPLAIN

```sql
EXPLAIN SELECT * FROM users WHERE email = 'alice@test.com';
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@test.com';
```

- `Seq Scan` = 全表扫描，该加索引了
- `Index Scan` = 用到了索引

### 慢查询排查

```sql
-- 查看当前正在运行的查询
SELECT pid, query, state, now() - pg_stat_activity.query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

---

## 六、高级功能

### JSON 字段

PG 支持 JSONB 类型，可以直接存和查 JSON 数据。

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    payload JSONB
);

INSERT INTO events (event_type, payload) VALUES
    ('user_login', '{"ip": "192.168.1.1", "device": "iPhone"}');

-- 查询 JSON 字段
SELECT payload->>'ip' as ip FROM events;
SELECT * FROM events WHERE payload @> '{"device": "iPhone"}';
```

### 全文检索

```sql
ALTER TABLE articles ADD COLUMN search_vector TSVECTOR;
UPDATE articles SET search_vector = to_tsvector('simple', title || ' ' || content);
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

SELECT title FROM articles
WHERE search_vector @@ to_tsquery('simple', 'postgresql & tutorial');
```

比 `LIKE '%keyword%'` 快得多。

### 窗口函数

```sql
-- 每个用户的订单金额和占比
SELECT user_id, amount,
    SUM(amount) OVER (PARTITION BY user_id) as user_total,
    amount / SUM(amount) OVER (PARTITION BY user_id) * 100 as pct
FROM orders;

-- 累计值
SELECT created_at, amount,
    SUM(amount) OVER (ORDER BY created_at) as running_total
FROM orders WHERE user_id = 1 ORDER BY created_at;
```

### 事务

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- 或 ROLLBACK
```

---

## 七、FastAPI 集成

### 安装

```bash
pip install sqlalchemy psycopg2-binary alembic
```

### 连接配置

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "postgresql://postgres:mysecretpassword@localhost:5432/myapp"

engine = create_engine(DATABASE_URL)
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

### 定义模型

```python
# models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    orders = relationship("Order", back_populates="user")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="orders")
```

### CRUD 接口

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
    db.add(db_user); db.commit(); db.refresh(db_user)
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


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user); db.commit()
    return {"message": "deleted"}
```

### 数据库迁移（Alembic）

```bash
alembic init alembic
# 配置 alembic.ini 中的 sqlalchemy.url
alembic revision --autogenerate -m "add users table"
alembic upgrade head
```

---
