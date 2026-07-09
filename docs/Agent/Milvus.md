---
title: Milvus
date: 2026-04-23
---



# Milvus 使用教程

## Milvus 是什么

Zilliz 开源的向量数据库，用来做：

- 向量存储（embedding）
- 相似度搜索（RAG / Agent memory）
- 推荐系统 / 搜索系统

------

## 安装 Milvus 服务

### Docker 部署（推荐）

```bash
# 下载 docker-compose 配置
wget https://github.com/milvus-io/milvus/releases/latest/download/milvus-standalone-docker-compose.yml -O docker-compose.yml

# 启动
docker compose up -d

# 检查
docker compose ps
```

Milvus 默认端口：**19530**（gRPC）、**9091**（HTTP）

### Milvus Lite（轻量，无需 Docker）

适合本地开发和小项目，直接嵌入 Python 进程：

```bash
pip install pymilvus
# 无需 Docker，代码首次连接时会自动启动内嵌服务
from pymilvus import connections

# Milvus Lite 会自动启动内嵌服务，连接代码与 Docker 版完全一致
connections.connect(host="localhost", port="19530")
```

### 验证服务是否启动

```bash
# Docker 版查看日志
docker compose logs -f

# 或检查端口
curl http://localhost:9091/health
```

返回 `{"status":"ok"}` 表示服务正常。

------

## 连接 Milvus

```python
from pymilvus import connections

connections.connect(
    alias="default",
    host="localhost",
    port="19530"
)
```

------

## 创建"表"（Collection）

Milvus 里没有 table，叫 **Collection（集合）**。

### 定义结构

```python
from pymilvus import FieldSchema, CollectionSchema, DataType, Collection
```

### 创建字段

```python
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768),
    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=512)
]
```

### 创建集合

```python
schema = CollectionSchema(fields, description="demo collection")
collection = Collection(name="my_collection", schema=schema)
```

------

## 插入数据（Insert）

```python
import random

data = [
    [[random.random() for _ in range(768)] for _ in range(3)],  # embedding
    ["hello world", "milvus test", "vector db"]                  # text
]
collection.insert(data)
```

> 注意：顺序必须对应 schema → `embedding` 在前，`text` 在后。

------

## 建索引（非常重要）

不建索引 = 很慢

```python
index_params = {
    "index_type": "IVF_FLAT",
    "metric_type": "L2",
    "params": {"nlist": 128}
}
collection.create_index(field_name="embedding", index_params=index_params)
```

------

## 搜索（Query / Search）

### 相似度搜索（核心）

```python
collection.load()
query_vec = [[0.1] * 768]

results = collection.search(
    data=query_vec,
    anns_field="embedding",
    param={"metric_type": "L2", "params": {"nprobe": 10}},
    limit=3,
    output_fields=["text"]
)
```

### 结果解析

```python
for hit in results[0]:
    print(hit.id, hit.distance, hit.entity.get("text"))
```

------

## 条件查询（类似 SQL where）

```python
results = collection.query(expr="id > 10", output_fields=["text"])
```

------

## 删除数据

### 按 ID 删除

```python
collection.delete(expr="id in [1, 2, 3]")
```

### 按条件删除

```python
collection.delete(expr="id > 100")
```

------

## 删除整个 Collection

```python
from pymilvus import utility

utility.drop_collection("my_collection")
```

------

## 完整流程（总结版）

```text
1. connect
2. define schema
3. create collection
4. insert data
5. create index
6. load collection
7. search / query
8. delete / drop
```

------

## 在 Agent 里的典型用法（很重要）

### 写入（Memory）

```text
用户输入 → embedding → 存 Milvus
```

### 查询（Recall）

```text
当前问题 → embedding → 相似历史记忆 → topK
```

### 典型结构

```json
{
    "id": xxx,
    "embedding": [0.12, -0.34, ...],
    "text": "用户说的话",
    "metadata": { "time": "...", "type": "..." }
}
```