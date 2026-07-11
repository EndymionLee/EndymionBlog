---
title: MySQL 笔记
tags:
  - mysql
  - database
  - sql
  - sqlalchemy
date: 2026-06-19
---
# MySQL 教程

## 一、认识 MySQL

### MySQL vs PostgreSQL vs SQLite

```text
SQLite：
    文件型，不需要服务
    适合：开发环境、本地工具、桌面应用

PostgreSQL：
    功能最强，最接近企业标准
    适合：生产环境、复杂查询

MySQL：
    最流行，生态最大
    适合：生产环境、中小型项目、和 PHP/Java 配合
    国内很多公司在用
```

### 用 Docker 启动

```bash
docker run -d \
    --name my-mysql \
    -e MYSQL_ROOT_PASSWORD=mysecretpassword \
    -e MYSQL_DATABASE=myapp \
    -p 3306:3306 \
    mysql:8
```

```bash
# 连接
mysql -h localhost -u root -p myapp
# 输入密码 mysecretpassword
```

### 连接字符串

```text
mysql://root:mysecretpassword@localhost:3306/myapp
#      用户:密码                  端口   数据库
```

### 常用命令

```bash
SHOW DATABASES;              # 查看所有数据库
USE myapp;                   # 切换数据库
SHOW TABLES;                 # 查看所有表
DESC users;                  # 查看表结构
SHOW INDEX FROM users;       # 查看索引
```

### 和 PostgreSQL 的核心差异

| 特性   | MySQL              | PostgreSQL             |
| ------ | ------------------ | ---------------------- |
| 自增   | `AUTO_INCREMENT` | `SERIAL`             |
| 字符串 | `VARCHAR`        | `VARCHAR` / `TEXT` |
| JSON   | `JSON`（5.7+）   | `JSONB`（功能更强）  |
| 事务   | InnoDB 引擎支持    | 默认支持               |
| 索引   | B-Tree             | B-Tree + GIN + GiST    |
| 连接串 | `mysql://`       | `postgresql://`      |

### 练习

1. 用 Docker 启动 MySQL，用 mysql 客户端连上去
2. 创建一个 `products` 表
3. 用 `SHOW TABLES` 和 `DESC products` 查看表信息

---

## 二、SQL 基础

### CREATE

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    age INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

MySQL 和 PG 的几个差异：

```text
AUTO_INCREMENT → PG 用 SERIAL
ENGINE=InnoDB  → 支持事务的引擎（必须用这个）
CHARSET=utf8mb4 → 支持中文和 emoji
TIMESTAMP DEFAULT CURRENT_TIMESTAMP → PG 用 DEFAULT NOW()
```

### INSERT

```sql
INSERT INTO users (name, email, age) VALUES ('Alice', 'alice@test.com', 25);

INSERT INTO users (name, email, age) VALUES
    ('Bob', 'bob@test.com', 30),
    ('Charlie', 'charlie@test.com', 28);

-- 获取刚插入的 ID
SELECT LAST_INSERT_ID();
```

### SELECT

```sql
SELECT * FROM users;
SELECT name, email FROM users WHERE age > 25;
SELECT * FROM users ORDER BY created_at DESC;
SELECT * FROM users LIMIT 10 OFFSET 0;
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

### 练习

1. 在 MySQL 里创建 `products` 表，插入 5 条数据
2. 查出价格在 50-100 之间的商品
3. 把库存为 0 的商品删除

---

## 三、表设计与类型

### 常用数据类型

| 类型                   | 说明                     | 示例                                  |
| ---------------------- | ------------------------ | ------------------------------------- |
| `INT`                | 整数                     | `age INT`                           |
| `BIGINT`             | 大整数                   | `user_id BIGINT`                    |
| `INT AUTO_INCREMENT` | 自增主键                 | `id INT AUTO_INCREMENT PRIMARY KEY` |
| `VARCHAR(n)`         | 变长字符串               | `name VARCHAR(100)`                 |
| `TEXT`               | 长文本                   | `content TEXT`                      |
| `DECIMAL(p,s)`       | 精确小数                 | `price DECIMAL(10,2)`               |
| `FLOAT / DOUBLE`     | 浮点数                   | `rating FLOAT`                      |
| `BOOLEAN`            | 布尔值（实际是 TINYINT） | `is_active BOOLEAN`                 |
| `DATE`               | 日期                     | `birthday DATE`                     |
| `DATETIME`           | 日期时间                 | `created_at DATETIME`               |
| `TIMESTAMP`          | 时间戳（有时区）         | `updated_at TIMESTAMP`              |
| `JSON`               | JSON 数据（5.7+）        | `metadata JSON`                     |

### 建表规范

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    age INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

```text
ENGINE=InnoDB          → 必须用 InnoDB（支持事务）
CHARSET=utf8mb4        → 支持中文和 emoji（utf8 不够用）
COLLATE=utf8mb4_ci     → 不区分大小写的排序规则
AUTO_INCREMENT         → 自增（等价 PG 的 SERIAL）
```

### 修改表

```sql
-- 加字段
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- 删字段
ALTER TABLE users DROP COLUMN phone;

-- 改类型
ALTER TABLE users MODIFY COLUMN age TINYINT;

-- 改名
ALTER TABLE users RENAME TO members;
```

### 练习

1. 设计一个 `orders` 表，包含 id、user_id、total_amount、status、created_at
2. 加上 ENGINE=InnoDB 和 utf8mb4
3. 加一个 CHECK 约束确保 total_amount > 0

---

## 四、关联查询

### 外键

```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
```

MySQL 的外键必须是 InnoDB 引擎才能用。作用：保证 `user_id` 必须是 `users` 表里存在的 id。

### JOIN

```sql
-- 查订单时带上用户姓名
SELECT o.id, o.amount, u.name
FROM orders o
JOIN users u ON o.user_id = u.id;

-- LEFT JOIN
SELECT u.name, o.id as order_id, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

### 多表关联

```sql
SELECT u.name, o.id as order_id, p.name as product_name
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE u.id = 1;
```

### 聚合 + 关联

```sql
SELECT
    u.name,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.amount), 0) as total_amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total_amount DESC;
```

### 练习

1. 建 users + orders 表，用外键关联
2. 查每个用户的订单数量和总金额
3. 用 LEFT JOIN 查出没有下过订单的用户

---

## 五、索引与性能

### 创建索引

```sql
-- 普通索引
CREATE INDEX idx_users_email ON users(email);

-- 唯一索引
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 联合索引（查多个字段时）
CREATE INDEX idx_users_name_age ON users(name, age);

-- 查看索引
SHOW INDEX FROM users;
```

**主键和 UNIQUE 会自动创建索引**，不需要手动加。

### 什么时候加索引

```text
 经常 WHERE 的字段
    WHERE email = 'xxx'
    WHERE status = 'active'

 经常 JOIN 的字段
    ON orders.user_id = users.id

 经常 ORDER BY 的字段
    ORDER BY created_at DESC

 不要每个字段都加
    索引占空间，写入变慢
    小表（几千行）不需要索引
```

### EXPLAIN

```sql
-- 看查询怎么执行的
EXPLAIN SELECT * FROM users WHERE email = 'alice@test.com';
```

```text
type 列（从上到下越来越好）：
    ALL      → 全表扫描（没用到索引）
    index    → 扫了索引树
    range    → 范围查询
    ref      → 等值匹配
    const    → 主键查询（最快）

Extra 列出现 Using filesort 或 Using temporary：
    → 说明查询需要优化，加合适的索引
```

### 慢查询日志

```sql
-- 查看慢查询是否开启
SHOW VARIABLES LIKE 'slow_query_log';

-- 开启慢查询
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 2;  -- 超过 2 秒的记录
```

### 练习

1. 在 users 表的 email 字段上加索引
2. 用 `EXPLAIN` 对比加索引前后的查询类型
3. 找一条慢查询，分析它为什么慢

---

## 六、Python 集成

### 安装

```bash
# 驱动（二选一）
pip install pymysql        # 纯 Python，不用编译
pip install mysqlclient     # C 扩展，更快

# SQLAlchemy（推荐用这个）
pip install sqlalchemy
```

### SQLAlchemy 连接

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "mysql://root:mysecretpassword@localhost:3306/myapp?charset=utf8mb4"

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

### 模型

```python
# models.py
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), index=True)
    email = Column(String(200), unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

### 使用 mysqlclient

```python
import MySQLdb

conn = MySQLdb.connect(
    host="localhost",
    user="root",
    password="mysecretpassword",
    database="myapp",
    charset="utf8mb4",
)

cur = conn.cursor()

# 建表
cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
""")

# CURD
cur.execute("INSERT INTO users (name, email) VALUES (%s, %s)", ("Alice", "alice@test.com"))
conn.commit()

cur.execute("SELECT * FROM users WHERE email = %s", ("alice@test.com",))
user = cur.fetchone()
print(user)

cur.close()
conn.close()
```

### PyMySQL

```python
import pymysql

conn = pymysql.connect(
    host="localhost",
    user="root",
    password="mysecretpassword",
    database="myapp",
    charset="utf8mb4",
)

# 用法和 MySQLdb 一样
# pymysql.install_as_MySQLdb()  # 可以伪装成 MySQLdb
```

### FastAPI 集成

和 PostgreSQL / SQLite 的 FastAPI 集成代码**完全一样**，只需要改 `DATABASE_URL`：

```python
# SQLite
DATABASE_URL = "sqlite:///./app.db"

# PostgreSQL
DATABASE_URL = "postgresql://user:pass@localhost:5432/myapp"

# MySQL
DATABASE_URL = "mysql://user:pass@localhost:3306/myapp?charset=utf8mb4"

# ORM 代码一行都不用改
```
