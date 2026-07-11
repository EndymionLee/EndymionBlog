---
title: Redis 笔记
tags:
  - redis
  - database
  - cache
date: 2026-06-19
---
# Redis 教程

## 一、认识 Redis

### Redis 不是什么数据库

```text
MySQL / PG：存在磁盘，关机不丢，慢
Redis：存在内存，关机丢，快 100 倍

所以 Redis 不存"正经数据"
Redis 存"频繁读但不常变"的数据
    缓存 → 用户信息、商品详情、配置
    会话 → 登录状态
    计数 → 点赞数、访问量
    队列 → 消息队列、任务队列
```

### 用 Docker 启动

```bash
docker run -d \
    --name my-redis \
    -p 6379:6379 \
    redis:7-alpine
```

```bash
# 连接
redis-cli
```

### 常用命令

```bash
# 设置和获取
SET name "Alice"
GET name          # "Alice"

# 删除
DEL name

# 判断存在
EXISTS name       # 1（存在）或 0（不存在）

# 设置过期时间
SET code "123456" EX 300     # 5 分钟后过期
TTL code                      # 还剩多少秒

# 查看所有键
KEYS *             # 生产环境别用（数据多时卡死）
SCAN 0             # 用 SCAN 替代 KEYS

# 清空
FLUSHDB            # 清空当前库
FLUSHALL           # 清空所有库
```

### Redis 和数据库的典型配合

```text
请求来了
    ↓
查 Redis → 有 → 直接返回（0.1ms）
    ↓ 没有
查数据库 → 写入 Redis → 返回（50ms）

下一次请求 → Redis 有 → 直接返回（0.1ms）
```

### 图形化工具

```text
RedisInsight    → 官方免费，功能全
Another Redis   → 开源，轻量
```

### 练习

1. 用 Docker 启动 Redis，用 redis-cli 连上去
2. 存一个 `user:1` 的字符串，设置 60 秒过期
3. 用 `TTL` 查看还剩多少秒

---

## 二、数据类型

Redis 有 5 种核心数据类型，各有各的用途。

### String（字符串）

最基础的类型，存什么都可以。

```bash
SET name "Alice"
GET name                    # "Alice"
SET user:1:name "Alice"
GET user:1:name

# 数字操作
SET count 0
INCR count                  # 1
INCRBY count 5              # 6
DECR count                  # 5
```

适合：缓存、计数、token、session

### Hash（哈希）

存对象，相当于 Python 的字典。

```bash
HSET user:1 name "Alice" age 25 email "alice@test.com"
HGET user:1 name            # "Alice"
HGETALL user:1              # 所有字段
HKEYS user:1                # 所有字段名
HVALS user:1                # 所有字段值

# 只改一个字段
HSET user:1 age 26
```

适合：用户信息、商品详情、配置

### List（列表）

有序列表，左右两边都能插。

```bash
LPUSH messages "msg1"       # 左边插入
RPUSH messages "msg3"       # 右边插入
LRANGE messages 0 -1        # 取全部

LPOP messages               # 从左边弹出
RPOP messages               # 从右边弹出

LLEN messages               # 长度
```

适合：消息队列、最新消息列表

### Set（集合）

无序、不重复。

```bash
SADD tags "python" "javascript" "go"
SMEMBERS tags               # 所有成员
SISMEMBER tags "python"     # 1（存在）
SREM tags "go"              # 删除

# 集合运算
SINTER set1 set2            # 交集
SUNION set1 set2            # 并集
SDIFF set1 set2             # 差集
```

适合：标签、关注关系、去重

### Sorted Set（有序集合）

每个元素带一个分数，按分数排序。

```bash
ZADD leaderboard 100 "Alice" 85 "Bob" 92 "Charlie"
ZRANGE leaderboard 0 -1 WITHSCORES    # 从小到大
ZREVRANGE leaderboard 0 -1            # 从大到小
ZINCRBY leaderboard 10 "Alice"        # 加分

ZSCORE leaderboard "Alice"            # 查分数
ZRANK leaderboard "Bob"               # 查排名
```

适合：排行榜、延时队列、限流计数

### 数据类型选择速查

```text
要缓存简单值（字符串、数字）   → String
要存一个对象                    → Hash
要做消息队列                    → List
要去重 / 集合运算              → Set
要排行榜 / 计分排序            → Sorted Set
```

### 练习

1. 用 Hash 存一个用户信息（name、age、email）
2. 用 List 模拟消息队列，左边 Push 右边 Pop
3. 用 Sorted Set 模拟一个排行榜

---

## 三、缓存实战

### TTL（过期时间）

```bash
# 设置时直接指定过期时间
SET code "123456" EX 300          # 300 秒后自动删
SETEX code 300 "123456"           # 同上

# 查看剩余时间
TTL code                          # 秒
PTTL code                         # 毫秒

# 取消过期
PERSIST code

# 给已有 key 设置过期
EXPIRE code 60
```

### 缓存更新策略

**1. Cache Aside（最常用）**

```text
读：先查 Redis → 没有 → 查 DB → 写入 Redis
写：更新 DB → 删除 Redis（下次读时重建）

更新 DB 时不要直接更新 Redis，删掉让它重建
避免并发写导致的数据不一致
```

```python
def get_user(user_id: int):
    # 查缓存
    user = redis.get(f"user:{user_id}")
    if user:
        return json.loads(user)

    # 查数据库
    user = db.query(User).filter(User.id == user_id).first()

    # 写入缓存
    redis.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user


def update_user(user_id: int, data: dict):
    # 更新数据库
    db.query(User).filter(User.id == user_id).update(data)
    db.commit()

    # 删除缓存（不是更新缓存）
    redis.delete(f"user:{user_id}")
```

**2. TTL 兜底**

```text
所有缓存都设过期时间
即使缓存没被主动删除，过期也会自动失效
避免"缓存永不更新"的问题
```

### 缓存问题

```text
缓存穿透：查一个不存在的数据
    Redis 没有，DB 也没有
    每次请求都穿透到 DB

    解决：缓存空值（即使 DB 返回 None 也缓存）

缓存击穿：热点 key 过期
    一个高频访问的 key 刚好过期
    大量请求同时打到 DB

    解决：互斥锁（只有一个请求去查 DB）
          或热点数据不过期

缓存雪崩：大量 key 同时过期
    大量请求打到 DB，DB 扛不住

    解决：过期时间加随机值
          EXPIRE user:1 3600 + random(0, 300)
```

```python
# 缓存穿透：缓存空值
def get_user(user_id: int):
    user = redis.get(f"user:{user_id}")
    if user is not None:
        if user == "NULL":      # 缓存了空值
            return None
        return json.loads(user)

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        redis.setex(f"user:{user_id}", 3600, json.dumps(user))
    else:
        redis.setex(f"user:{user_id}", 60, "NULL")  # 空值也缓存
    return user
```

```python
# 缓存击穿：互斥锁
def get_hot_data():
    data = redis.get("hot_data")
    if data:
        return json.loads(data)

    # 只有一个请求能拿到锁
    if redis.setnx("hot_data_lock", "1"):
        redis.expire("hot_data_lock", 5)

        data = db.query(...)  # 查数据库
        redis.setex("hot_data", 3600, json.dumps(data))
        redis.delete("hot_data_lock")
        return data

    # 其他请求等一会儿再试
    time.sleep(0.1)
    return get_hot_data()
```

### 练习

1. 实现一个缓存装饰器 `@cache(ttl=60)`，自动缓存函数返回值
2. 实现 Cache Aside 模式：读时先查缓存，写时更新 DB 并删缓存
3. 模拟缓存雪崩：给一批 key 设置相同的过期时间，观察同时过期的现象

---

## 四、Python 集成

### 安装

```bash
pip install redis
```

### 连接

```python
import redis

# 基础连接
r = redis.Redis(host="localhost", port=6379, db=0)

# 连接池（推荐——复用连接）
pool = redis.ConnectionPool(host="localhost", port=6379, db=0)
r = redis.Redis(connection_pool=pool)

# 带密码
r = redis.Redis(host="localhost", port=6379, password="xxx")
```

### 基本操作

```python
# String
r.set("name", "Alice")
r.get("name")                    # b"Alice"
r.get("name").decode("utf-8")    # "Alice"

r.setex("code", 300, "123456")   # 带过期
r.ttl("code")                    # 剩余秒数

r.incr("count")                  # 自增
r.incrby("count", 5)             # 加 5

# Hash
r.hset("user:1", mapping={"name": "Alice", "age": 25})
r.hget("user:1", "name")         # b"Alice"
r.hgetall("user:1")              # {b"name": b"Alice", b"age": b"25"}

# List
r.lpush("queue", "task1")
r.rpush("queue", "task2")
r.lpop("queue")                  # b"task1"
r.llen("queue")                  # 长度

# Set
r.sadd("tags", "python", "js")
r.smembers("tags")               # {b"python", b"js"}

# Sorted Set
r.zadd("ranking", {"Alice": 100, "Bob": 85})
r.zrevrange("ranking", 0, -1)    # 从高到低
```

### FastAPI 集成

```python
# redis_client.py
import redis

pool = redis.ConnectionPool(host="localhost", port=6379, db=0)
redis_client = redis.Redis(connection_pool=pool)
```

```python
# main.py
import json
from fastapi import FastAPI, Depends
from redis_client import redis_client

app = FastAPI()


@app.get("/users/{user_id}")
def get_user(user_id: int):
    # 查缓存
    cached = redis_client.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)

    # 查数据库
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404)

    # 写入缓存
    redis_client.setex(
        f"user:{user_id}",
        3600,
        user.model_dump_json(),
    )
    return user
```

### 封装缓存装饰器

```python
from functools import wraps
import json
import hashlib


def cache(ttl: int = 300):
    """缓存函数返回值的装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 用函数名+参数做 key
            key = f"cache:{func.__name__}:{hashlib.md5(str(args).encode()).hexdigest()}"

            # 查缓存
            cached = redis_client.get(key)
            if cached:
                return json.loads(cached)

            # 执行函数
            result = func(*args, **kwargs)

            # 写缓存
            redis_client.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator


# 使用
@cache(ttl=60)
def get_weather(city: str):
    """查询天气——结果会被缓存"""
    return call_weather_api(city)
```

### 练习

1. 用 redis-py 连接 Redis，实现 String 和 Hash 的读写
2. 在 FastAPI 里给查询用户接口加 Redis 缓存
3. 用 `@cache` 装饰器缓存一个 LLM 调用函数

---

## 五、高级功能

### 分布式锁

多个应用实例同时操作同一份数据时，需要分布式锁。

```python
import uuid
import time


def acquire_lock(lock_name: str, timeout: int = 10) -> str | None:
    """获取分布式锁"""
    lock_key = f"lock:{lock_name}"
    lock_value = str(uuid.uuid4())

    # setnx：只有 key 不存在时才设置成功
    if redis_client.setnx(lock_key, lock_value):
        redis_client.expire(lock_key, timeout)
        return lock_value

    return None


def release_lock(lock_name: str, lock_value: str) -> bool:
    """释放分布式锁——只释放自己持有的锁"""
    lock_key = f"lock:{lock_name}"

    # Lua 脚本：原子操作，检查 value 匹配才删除
    script = """
    if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
    else
        return 0
    end
    """
    return redis_client.eval(script, 1, lock_key, lock_value) == 1


# 使用
def process_order(order_id: int):
    lock_value = acquire_lock(f"order:{order_id}", timeout=5)
    if not lock_value:
        return {"error": "订单正在处理中"}

    try:
        # 处理订单...
        return {"success": True}
    finally:
        release_lock(f"order:{order_id}", lock_value)
```

### 发布订阅

```python
# 发布者
redis_client.publish("channel:notifications", json.dumps({
    "type": "new_order",
    "order_id": 123,
}))


# 订阅者（单独进程）
pubsub = redis_client.pubsub()
pubsub.subscribe("channel:notifications")

for message in pubsub.listen():
    if message["type"] == "message":
        data = json.loads(message["data"])
        print(f"收到: {data}")
```

### 限流

```python
import time


def is_rate_limited(user_id: str, max_requests: int = 10, window: int = 60) -> bool:
    """滑动窗口限流"""
    key = f"rate_limit:{user_id}:{int(time.time() / window)}"
    count = redis_client.incr(key)

    if count == 1:
        redis_client.expire(key, window + 1)

    return count > max_requests


# 使用
@app.post("/api/chat")
def chat(request: ChatRequest, user_id: str = Depends(get_user_id)):
    if is_rate_limited(user_id, max_requests=20, window=60):
        raise HTTPException(status_code=429, detail="请求太频繁")

    return call_llm(request.message)
```

### 简单消息队列

```python
# 生产者
def send_task(task_type: str, data: dict):
    task = json.dumps({"type": task_type, "data": data})
    redis_client.lpush("task_queue", task)


# 消费者（单独进程运行）
def worker():
    while True:
        task = redis_client.brpop("task_queue", timeout=0)
        if task:
            _, task_data = task
            task = json.loads(task_data)

            if task["type"] == "send_email":
                send_email(task["data"])
            elif task["type"] == "generate_report":
                generate_report(task["data"])


# 使用
send_task("send_email", {"to": "user@test.com", "subject": "欢迎"})
```
