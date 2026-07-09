---
title: Docker
date: 2026-05-06
---



# Docker 实战完全指南

## 1. Docker 核心概念

### 1.1 三大核心组件
- **镜像（Image）**：容器的模板，类似软件安装包或糕点模具。镜像是只读的，包含运行应用所需的代码、运行时、库、环境变量和配置文件。
- **容器（Container）**：镜像的运行实例，类似安装好的软件或模具制作的糕点。每个容器是独立、隔离的运行环境。
- **仓库（Registry）**：存储和分发镜像的服务。Docker Hub 是官方公共仓库。

### 1.2 容器 vs 虚拟机
| 特性     | Docker 容器    | 虚拟机（VM）                 |
| -------- | -------------- | ---------------------------- |
| 内核     | 共用宿主机内核 | 每个 VM 包含完整操作系统内核 |
| 资源占用 | 轻量、体积小   | 笨重、体积大                 |
| 启动速度 | 秒级           | 分钟级                       |
| 隔离级别 | 进程级隔离     | 操作系统级隔离               |

### 1.3 镜像命名规范
完整镜像名格式：`[registry]/[namespace]/[repository]:[tag]`

- **Registry**：仓库地址，如 `docker.io`（Docker Hub 官方仓库，可省略）
- **Namespace**：命名空间/作者名，如 `library`（官方镜像可省略）
- **Repository**：镜像名
- **Tag**：版本标签，如 `latest`、`1.28.0`（省略时默认 `latest`）

示例解析：
```bash
docker.io/library/nginx:latest
# 可简化为：
nginx
# 或指定版本：
nginx:1.28.0

docker.io/n8nio/n8n:latest
# 私有仓库镜像，不可省略命名空间
```

## 2. Docker 安装指南

### 2.1 Linux 系统（Ubuntu/Debian）

使用官方安装脚本（适用于大多数 Linux 发行版）：

```bash
# 第一步：下载并执行安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 第四步：将当前用户加入 docker 组（免 sudo 运行）
sudo usermod -aG docker $USER
# 执行后需要重新登录或执行 newgrp docker 使权限生效
```

**注意**：非 root 用户执行 Docker 命令前需加 `sudo`，或加入 docker 组后重新登录。

### 2.2 Windows 系统

**前提条件**：
- 启用 Windows 虚拟化功能

**步骤**：
1. **启用 WSL2 和虚拟机平台**：
   - 搜索"启用或关闭 Windows 功能"
   - 勾选 "Windows Subsystem for Linux"（WSL）和 "Virtual Machine Platform"（虚拟机平台）
   - 重启电脑

2. **安装 WSL2**：
```powershell
# 以管理员身份运行 PowerShell 或 CMD
wsl --set-default-version 2
wsl --update
# 国内网络建议加 --web-download 避免下载失败
wsl --update --web-download
```

3. **安装 Docker Desktop**：
   - 下载地址：https://www.docker.com/products/docker-desktop
   - 选择 AMD64 架构（一般 Windows 电脑）
   - 命令行指定安装路径（可选）：
```powershell
start /w "" "Docker Desktop Installer.exe" install --installation-dir="D:\Docker"
```

4. **验证安装**：
```powershell
docker --version
```
**注意**：Windows 使用 Docker 需保持 Docker Desktop 软件运行。

### 2.3 macOS 系统

直接下载对应芯片版本（Intel 或 Apple Silicon）的 Docker Desktop 安装包，拖拽安装即可。

## 3. 镜像管理实战

### 3.1 拉取镜像（docker pull）

```bash
# 基本语法
docker pull [选项] [镜像名]

# 示例：拉取官方 Nginx 最新版
docker pull nginx
# 等同于：
docker pull docker.io/library/nginx:latest

# 拉取特定版本
docker pull nginx:1.28.0

# 拉取特定 CPU 架构（跨平台构建时使用）
docker pull --platform=linux/arm64 nginx
```

### 3.2 国内镜像站配置（解决网络问题）

**Linux 配置方法**：
编辑 `/etc/docker/daemon.json`：

```bash
sudo vim /etc/docker/daemon.json
```

添加内容（示例使用镜像加速地址）：
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

保存后重启 Docker 服务：
```bash
sudo systemctl restart docker
```

**Windows/macOS 配置方法**：
1. 打开 Docker Desktop
2. Settings → Docker Engine
3. 在 JSON 配置中添加 `registry-mirrors` 数组
4. 点击 "Apply & Restart"

### 3.3 查看与删除镜像

```bash
# 列出本地所有镜像
docker images
# 或
docker image ls

# 删除镜像（可使用 IMAGE ID 或 REPOSITORY:TAG）
docker rmi [镜像ID/镜像名]
# 强制删除（正在使用的镜像）
docker rmi -f [镜像ID]

# 查看镜像详情
docker inspect [镜像ID]
```

### 3.4 多架构镜像支持

Docker 镜像支持多架构（AMD64、ARM64 等），默认自动匹配宿主机架构。

**查看镜像支持的架构**：
在 Docker Hub 页面查看 "OS/Arch" 列，或查看镜像 manifest。

**跨架构运行**（如树莓派/香橙派 ARM64 架构运行 AMD64 镜像）：
- 树莓派、香橙派等设备通常为 `arm64` 架构
- 部分镜像仅提供 `amd64` 版本，在 ARM 设备上无法运行
- macOS（Apple Silicon）可通过 QEMU 模拟运行 AMD64 镜像，但可能有性能开销或兼容性问题

```bash
# 显式指定拉取 ARM64 版本
docker pull --platform=linux/arm64 [镜像名]
```

## 4. 容器生命周期管理

### 4.1 创建并运行容器（docker run）

`docker run` 是核心命令，等同于先执行 `docker create` 再执行 `docker start`。

**基本语法**：
```bash
docker run [选项] 镜像名 [命令]
```

#### 核心参数详解

**后台运行（-d）**：
```bash
docker run -d nginx
# -d, --detach：后台运行（Detached mode），不阻塞终端
```

**端口映射（-p）**：
```bash
docker run -p 宿主机端口:容器端口 nginx
# 示例：将容器 80 端口映射到宿主机 8080 端口
docker run -p 8080:80 nginx
# 可多次使用映射多个端口
docker run -p 8080:80 -p 443:443 nginx
```
**原理**：容器网络默认与宿主机隔离，`-p` 创建从宿主机到容器的端口转发规则。

**卷挂载（-v）**：
```bash
# 绑定挂载（Bind Mount）：直接映射宿主机目录
docker run -v /宿主机/路径:/容器/路径 nginx

# 命名卷（Named Volume）：使用 Docker 管理的卷
docker volume create my-data
docker run -v my-data:/容器/路径 nginx

# 示例：挂载 Nginx 静态文件目录
docker run -v /home/user/html:/usr/share/nginx/html nginx
```
**重要区别**：
- **绑定挂载**：宿主机目录直接覆盖容器目录，初始为空则容器目录被清空
- **命名卷**：首次挂载时，Docker 自动将容器目录内容复制到卷中（初始化功能）

**环境变量（-e）**：
```bash
docker run -e 变量名=值 -e 变量名2=值2 镜像名
# 示例：设置 MongoDB 账号密码
docker run -e MONGO_INITDB_ROOT_USERNAME=admin \
           -e MONGO_INITDB_ROOT_PASSWORD=pass \
           mongo
```

**容器命名（--name）**：
```bash
docker run --name my-nginx nginx
# 名称唯一，未指定则自动生成随机名（如 vigorous_goldberg）
```

**重启策略（--restart）**：
```bash
docker run --restart always nginx      # 无论何种原因停止都重启（包括宿主机重启）
docker run --restart unless-stopped nginx  # 手动停止的容器不自动重启
```

**交互模式（-it）与自动清理（--rm）**：
```bash
docker run -it --rm ubuntu bash
# -i, --interactive：保持 STDIN 打开
# -t, --tty：分配伪终端
# --rm：容器停止时自动删除（适合临时调试）
```

### 4.2 查看容器状态

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a

# 查看容器资源占用
docker stats
```

**输出字段说明**：
- **CONTAINER ID**：容器唯一标识（短 ID，完整 ID 更长）
- **IMAGE**：基于哪个镜像创建
- **STATUS**：运行状态（Up/Exited）
- **PORTS**：端口映射关系
- **NAMES**：容器名称

### 4.3 容器启停与删除

```bash
# 停止容器（发送 SIGTERM，超时后 SIGKILL）
docker stop [容器ID/名称]

# 强制停止（直接 SIGKILL）
docker kill [容器ID/名称]

# 启动已停止的容器
docker start [容器ID/名称]

# 重启容器
docker restart [容器ID/名称]

# 删除容器
docker rm [容器ID/名称]
# 强制删除运行中的容器
docker rm -f [容器ID/名称]

# 删除所有已停止容器
docker container prune
```

### 4.4 进入运行中容器（docker exec）

```bash
# 执行单次命令
docker exec [容器ID/名称] [命令]
# 示例：查看容器内进程
docker exec my-nginx ps -ef

# 进入交互式 Shell（最常用）
docker exec -it [容器ID/名称] /bin/bash
# 部分精简镜像可能只有 sh
docker exec -it [容器ID/名称] /bin/sh
```

**容器内调试技巧**：
进入容器后，容器表现为独立 Linux 系统，可执行各种命令。但精简镜像可能缺少常用工具（如 `vim`、`ping`、`ip` 等），需手动安装：

```bash
# 查看发行版
cat /etc/os-release

# Debian/Ubuntu 系
apt update && apt install -y vim iputils-ping iproute2

# Alpine 系
apk add --no-cache vim
```

### 4.5 查看日志

```bash
# 查看容器日志
docker logs [容器ID/名称]

# 实时跟踪日志（类似 tail -f）
docker logs -f [容器ID/名称]

# 查看最近 100 行
docker logs --tail 100 [容器ID/名称]
```

### 4.6 查看容器配置

```bash
# 查看容器详细信息（JSON 格式）
docker inspect [容器ID/名称]

# 查看特定字段（如 IP 地址）
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' [容器ID]
```

**实用技巧**：`docker inspect` 输出信息庞大，可直接复制给 AI 分析，询问端口映射、挂载卷等配置。

## 5. 数据持久化：卷（Volume）管理

### 5.1 命名卷操作

```bash
# 创建卷
docker volume create [卷名]

# 列出所有卷
docker volume ls

# 查看卷详情（包括宿主机真实路径）
docker volume inspect [卷名]
# 默认存储位置：/var/lib/docker/volumes/[卷名]/_data

# 删除卷
docker volume rm [卷名]

# 删除所有未使用的卷
docker volume prune
```

### 5.2 绑定挂载 vs 命名卷

| 特性       | 绑定挂载（Bind Mount）   | 命名卷（Named Volume）                  |
| ---------- | ------------------------ | --------------------------------------- |
| 宿主机路径 | 用户指定任意路径         | Docker 管理（/var/lib/docker/volumes/） |
| 数据初始化 | 宿主机目录覆盖容器目录   | 首次挂载时从容器复制数据到卷            |
| 适用场景   | 开发环境（代码实时同步） | 生产环境（数据持久化）                  |
| 移植性     | 依赖宿主机目录结构       | 与宿主机路径解耦，易于备份              |

## 6. Docker 网络详解

### 6.1 Docker 网络模型总览

Docker 提供五大内置网络驱动（Driver），可通过 `docker network ls` 查看：

| 网络驱动    | 适用场景                          | 通信范围           |
| ----------- | --------------------------------- | ------------------ |
| **bridge**  | 单机容器间通信（默认）            | 同宿主机           |
| **host**    | 性能敏感、无需网络隔离            | 直接使用宿主机网络 |
| **none**    | 高安全离线场景                    | 完全隔离           |
| **overlay** | Swarm 多节点集群通信              | 跨宿主机           |
| **macvlan** | 容器需要独立 MAC 地址接入物理网络 | 同局域网           |

---

### 6.2 Bridge 网络（默认模式）

#### 6.2.1 默认桥接网络

```bash
# 默认所有容器加入 docker0 网桥（通常 172.17.0.0/16）
docker run nginx  # 默认使用 bridge
```

**特点**：
- 容器获得独立 IP（如 172.17.0.2）
- 容器间可通过 IP 通信
- 宿主机与容器网络隔离，需端口映射（-p）才能外部访问

#### 6.2.2 网络地址转换（NAT）/ 端口映射原理

```bash
docker run -d -p 8080:80 nginx
```

`-p 8080:80` 背后发生了什么？

```
                 宿主机（192.168.1.100）
┌─────────────────────────────────────────────────┐
│                                                  │
│  iptables DNAT 规则：                             │
│  宿主机:8080  →  容器IP:80                       │
│  （由 Docker 自动写入 iptables PREROUTING 链）     │
│                                                  │
│  ┌──────────┐         ┌────────────────────┐     │
│  │ 外部请求  │ ──→     │ docker0 网桥        │     │
│  │ :8080    │    iptables  │ 172.17.0.2:80      │     │
│  └──────────┘  DNAT  └────────────────────┘     │
│                    ┌────────────────────┐        │
│                    │ 容器 A (nginx)     │        │
│                    │ 172.17.0.2:80      │        │
│                    └────────────────────┘        │
└─────────────────────────────────────────────────┘
```

- Docker 自动在宿主机创建 **iptables DNAT 规则**，将宿主机端口流量转发到容器端口
- 每个容器通过 docker0 网桥获得独立的虚拟网卡（veth pair）
- 容器访问外网通过 **MASQUERADE（SNAT）** 规则将容器 IP 转换为宿主机 IP

**查看 iptables 规则**：
```bash
# 查看 Docker 写入的 NAT 规则
iptables -t nat -L -n | grep DOCKER

# 查看容器 veth 网卡对
ip link show | grep veth
```

#### 6.2.3 默认 Bridge 的局限

- 容器间**无法通过容器名**通信（需靠 IP 或 `--link` 旧方案）
- 默认共享 DNS 解析环境
- 所有未指定网络的容器都加入同一个 bridge，缺乏隔离

> **建议**：生产环境使用自定义 bridge 网络替代默认 bridge。

---

### 6.3 自定义 Bridge 网络与 DNS 解析

#### 6.3.1 创建与使用自定义网络

```bash
# 创建自定义桥接网络（默认 172.x.0.0/16 自动分配子网）
docker network create my-network

# 创建时指定子网和网关
docker network create --subnet=10.10.0.0/16 --gateway=10.10.0.1 my-network

# 查看网络详情
docker network inspect my-network

# 指定容器加入网络
docker run --network my-network --name db mongo
docker run --network my-network --name web nginx
```

#### 6.3.2 内置 DNS 解析

Docker 内置 **嵌入式 DNS 服务器**（127.0.0.11），自动为同一自定义网络内的容器提供名称解析：

```bash
# 确认容器内的 DNS 配置
docker exec web cat /etc/resolv.conf
# nameserver 127.0.0.11
```

**DNS 解析特性**：
- 同一自定义网络内的容器可通过**容器名**互相访问
- web 容器内执行 `ping db` 自动解析到 db 容器的 IP
- 默认 bridge 网络**不支持** DNS 名称解析（必须使用 `--link` 旧方案，不推荐）
- Docker 的 DNS 服务器会自动处理容器启停时的 IP 变化

#### 6.3.3 网络别名（Network Alias）

一个容器可以拥有多个网络别名，让其他容器通过别名访问：

```bash
# 方式一：创建容器时指定别名
docker run -d --network my-network \
  --network-alias api-server --network-alias backend \
  --name myapp myapp:latest

# 方式二：连接到已有网络时指定别名
docker network connect --alias db-primary my-network mongodb

# 测试：其他容器可通过别名访问
docker exec web ping api-server   # 成功
docker exec web ping backend      # 成功
```

#### 6.3.4 容器同时接入多个网络

一个容器可以同时加入多个网络，实现**网络隔离与桥接**：

```
         Internet
            │
       ┌────┴────┐
       │  nginx   │   ← 同时接入 frontend 和 backend
       └────┬────┘
      ╱           ╲
 ┌────┴────┐ ┌────┴────┐
 │  web    │ │  mysql  │
 │frontend │ │ backend │
 └─────────┘ └─────────┘
  (不能访问)    (能访问)
```

```bash
# 创建两个网络
docker network create frontend
docker network create backend

# Nginx 同时接入两个网络
docker run -d --name nginx \
  --network frontend \
  nginx

docker network connect backend nginx

# Web 应用接入 frontend
docker run -d --name web --network frontend myapp
# MySQL 接入 backend
docker run -d --name mysql --network backend -e MYSQL_ROOT_PASSWORD=secret mysql

# 结果：
# - nginx 可访问 web 和 mysql
# - web 不能访问 mysql（不同网络）
# - mysql 不能访问 web（不同网络）
```

> **应用场景**：反向代理容器同时接入前端和后端网络，实现桥接；API 服务接入内网，数据库仅在内网，前端仅在外网，实现多层隔离。

#### 6.3.5 实战：MongoDB + Mongo Express 组网

```bash
# 创建网络
docker network create mongo-net

# 启动数据库（不暴露端口到宿主机，仅容器内可访问）
docker run -d --network mongo-net --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=pass \
  mongo

# 启动 Web 客户端（通过容器名连接数据库）
docker run -d --network mongo-net --name mongo-express \
  -p 8081:8081 \
  -e ME_CONFIG_MONGODB_URL="mongodb://admin:pass@mongodb:27017/" \
  mongo-express
```
访问 `http://宿主机IP:8081` 即可管理数据库。

---

### 6.4 Host 模式

```bash
docker run --network host nginx
```

**特点**：
- 容器与宿主机**共享网络命名空间**
- 容器直接使用宿主机 IP 和端口，**无需 -p 映射**
- 容器内查看 IP 地址显示的是宿主机网卡
- 性能最优（无 NAT 转换开销，无额外网络层封装）

**适用场景**：
- 对网络延迟和吞吐量要求极高的服务（如高频交易、实时流处理）
- 容器需要监听大量端口（避免每次都要写 -p）
- 需要直接访问宿主机网络设备的应用

**限制**：
- 端口冲突：容器应用端口不能与宿主机已有服务冲突
- Windows/Mac 限制：Docker Desktop 的 Host 模式在 Windows 和 Mac 上有兼容性问题，可能无法正常工作（Windows 上容器可能监听不到端口）
- 失去网络隔离：容器可以访问宿主机所有网络接口和服务

---

### 6.5 None 模式

```bash
docker run --network none nginx
```

**特点**：容器完全隔离，仅有 lo（回环接口），无外界网络接口。

**适用场景**：
- 处理敏感数据的离线计算任务
- 安全测试环境，杜绝外联
- 完全自包含的本地服务

---

### 6.6 容器间通信实战

#### 6.6.1 通信方式总结

| 方式       | 命令                     | 说明                   |
| ---------- | ------------------------ | ---------------------- |
| 同网络 DNS | `--network my-net`       | 通过容器名自动解析     |
| 端口暴露   | `-p 宿主端口:容器端口`   | 外部通过宿主机 IP 访问 |
| 网络别名   | `--network-alias alias`  | 同一网络内别名访问     |
| 多网络桥接 | `docker network connect` | 容器接入多个网络       |

#### 6.6.2 测试容器连通性

```bash
# 同一自定义网络内：通过容器名 ping
docker exec web ping db

# 不同网络：无法直接通信
docker exec web ping db  # ping: bad address

# 查看容器 IP
docker inspect db -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# 查看 veth 网卡对（宿主机侧）
ip link show | grep veth
```

#### 6.6.3 从宿主机访问容器

```bash
# 方式一：端口映射（推荐）
docker run -p 8080:80 nginx
curl http://localhost:8080

# 方式二：直接通过容器 IP（不推荐，IP 会变化）
docker inspect nginx -f '{{.NetworkSettings.IPAddress}}'
curl http://172.17.0.2:80

# 方式三：通过 docker exec 间接访问
docker exec nginx curl http://localhost:80

# 方式四：进入容器操作
docker exec -it nginx bash
```

---

### 6.7 Overlay 网络（Swarm 多节点网络）

Overlay 网络用于 Docker Swarm 集群中**跨宿主机容器通信**，在不同物理机的容器之间建立虚拟二层网络。

```bash
# 前提：已初始化 Swarm 集群
docker swarm init

# 创建 overlay 网络（仅 Swarm 节点可用）
docker network create -d overlay my-overlay

# 创建可被独立容器使用的 overlay（--attachable）
docker network create -d overlay --attachable my-overlay

# 在不同节点的服务中使用同一 overlay 网络
docker service create --network my-overlay --name web nginx
docker service create --network my-overlay --name api myapi
```

**原理**：
- 使用 **VXLAN** 技术封装数据包
- 每个容器通过虚拟网卡连接到 overlay
- 数据包封装在 UDP 中跨宿主机传输
- 自动处理容器迁移后的 IP 重新分配

---

### 6.8 Macvlan 网络

Macvlan 让容器拥有**独立的 MAC 地址**，直接接入物理网络，像一台真实的物理设备。

```bash
# 创建 macvlan 网络（需指定物理网卡和子网）
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  my-macvlan

# 容器直接获得局域网 IP
docker run --network my-macvlan --ip=192.168.1.100 nginx

# 此时可从局域网其他设备通过 192.168.1.100:80 直接访问
```

**适用场景**：
- 容器需要被局域网设备直接发现（如 IoT 设备模拟）
- 遗留应用依赖物理网络特性（MAC 地址过滤）
- 高性能场景，避免 NAT 和端口映射开销

**限制**：
- 宿主机本身无法通过 macvlan IP 访问容器（需要子接口）
- 需要物理网卡支持混杂模式
- IP 地址耗尽风险（每个容器占用一个局域网 IP）

---

### 6.9 docker network 命令全集

```bash
# 列出所有网络
docker network ls

# 查看网络详情
docker network inspect [网络名]

# 创建网络
docker network create [网络名]
docker network create --subnet=10.10.0.0/16 my-net
docker network create -d overlay --attachable my-overlay

# 容器运行时加入网络
docker network connect [网络名] [容器名]
docker network connect --alias db-primary my-net myapp

# 容器断开网络
docker network disconnect [网络名] [容器名]

# 删除网络
docker network rm [网络名]

# 清理未使用的网络
docker network prune
```

---

### 6.10 网络故障排查

#### 6.10.1 常用诊断命令

```bash
# 查看容器的网络配置
docker inspect [容器名] | grep -A 100 NetworkSettings

# 查看容器 IP（格式化输出）
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' [容器名]

# 进入容器测试网络
docker exec -it [容器名] bash

# 容器内查看网络接口
ip addr
ip route

# 测试 DNS 解析
getent hosts [其他容器名]
nslookup [其他容器名]
ping [其他容器名]
```

#### 6.10.2 容器内 ping/网络工具安装

容器基础镜像通常不包含网络调试工具，需手动安装：

```bash
# Debian/Ubuntu 系
apt update && apt install -y iputils-ping dnsutils curl net-tools

# Alpine 系
apk add --no-cache iputils bind-tools curl

# 如容器已运行，可通过 docker exec 安装
docker exec -it [容器名] apt update
docker exec -it [容器名] apt install -y iputils-ping curl
```

#### 6.10.3 常见问题排查

| 问题             | 可能原因                 | 排查命令                                       |
| ---------------- | ------------------------ | ---------------------------------------------- |
| 容器间无法通信   | 不在同一网络             | `docker inspect [容器名]` 对比 NetworkSettings |
| DNS 解析失败     | 使用默认 bridge          | 改用自定义 bridge 网络                         |
| curl 连接被拒    | 端口映射错误或服务未启动 | `docker logs [容器名]`                         |
| 端口映射不生效   | 宿主机端口被占用         | `netstat -tlnp \| grep [端口]`                 |
| 容器无法访问外网 | iptables 规则被清        | `iptables -t nat -L -n` 检查 MASQUERADE        |
| Macvlan 无法通信 | 物理网卡不支持混杂模式   | `ip link set eth0 promisc on`                  |

#### 6.10.4 iptables 排查

Docker 依赖 iptables 实现网络隔离和端口转发，以下情况会破坏 Docker 网络：

```bash
# 手动清空 iptables（⚠️ 危险！会导致 Docker 网络瘫痪）
iptables -F          # 清空规则
iptables -X          # 删除自定义链

# 修复方法：重启 Docker 服务会自动重建规则
sudo systemctl restart docker

# 安全查看 Docker iptables 规则
iptables -L -n -v | grep -E "DOCKER|docker"
iptables -t nat -L -n | grep DOCKER
```

## 7. 构建与推送镜像

### 7.1 创建 Docker 镜像的三大方式

Docker 镜像的创建共有三种方式，按推荐程度排列如下：

#### 方式一：docker commit（从容器创建 — 不推荐用于生产）

**适用场景**：调试排查、临时保存容器状态、快速复现问题

通过 `docker commit` 可以将正在运行的容器直接保存为镜像：

```bash
# 语法
docker commit [选项] [容器ID/名称] [镜像名]:[标签]

# 示例：修改容器后保存为新镜像
docker run -it --name debug-container ubuntu bash
# 在容器内安装软件：apt update && apt install -y vim curl
# 退出容器后提交为新镜像
docker commit debug-container my-ubuntu:with-tools

# 查看新创建的镜像
docker images

# 基于新镜像运行容器（vim 和 curl 已预装）
docker run -it --rm my-ubuntu:with-tools bash
```

**补充选项**：
- `-a "作者"`：指定作者信息
- `-m "提交说明"`：添加提交消息（类似 git commit）
- `--change "CMD nginx"`：在提交时修改 CMD 等配置

```bash
docker commit -a "John" -m "安装了 vim 和 curl" debug-container my-ubuntu:with-tools
```

**为什么不推荐？**
- ❌ **不可复现**：不知道镜像里做了什么操作，无法自动化构建
- ❌ **体积臃肿**：不会清理中间缓存文件
- ❌ **难以维护**：无法像 Dockerfile 一样版本管理
- ❌ **缺乏层优化**：每次 commit 产生多余镜像层

> 一句话：`docker commit` 适合快速保存调试现场，**生产环境应使用 Dockerfile**。

#### 方式二：Dockerfile + docker build（标准推荐方式）

最常用、最正规的镜像创建方式。使用 Dockerfile 声明式定义镜像内容，详见 7.2 节。这是生产环境的**唯一推荐方式**。

#### 方式三：docker import（从 tar 包导入）

从文件系统压缩包导入为镜像，通常用于制作基础系统镜像：

```bash
# 语法
docker import [URL/文件路径] [镜像名]:[标签]

# 示例：从 ubuntu 根文件系统压缩包导入
wget https://cloud-images.ubuntu.com/minimal/releases/noble/release/ubuntu-24.04-minimal-cloudimg-amd64-root.tar.xz
docker import ubuntu-24.04-minimal-cloudimg-amd64-root.tar.xz my-ubuntu:base

# 查看导入的镜像
docker images
```

**适用场景**：
- 制作基础系统镜像（如定制精简 Linux）
- 从其他容器运行时迁移镜像
- 离线环境从文件包导入

**与 `docker build` 的区别**：
- `docker import`：导入文件系统快照，**不含** Dockerfile 构建历史
- `docker build`：基于 Dockerfile 构建，每一层都有记录，可追溯

---

### 7.2 Dockerfile 指令详解

**基础结构示例**（Python FastAPI 应用）：

```dockerfile
# 第一行必须：选择基础镜像
FROM python:3.13-slim

# 设置工作目录（类似 cd 命令）
WORKDIR /app

# 复制文件（宿主机路径 -> 镜像内路径）
# . 表示 Dockerfile 所在目录
COPY requirements.txt .
COPY ./src .

# 在镜像构建时执行命令
RUN pip install --no-cache-dir -r requirements.txt

# 声明容器暴露的端口（仅作提示，实际映射用 -p）
EXPOSE 8000

# 容器启动时执行的默认命令（可被覆盖）
CMD ["python", "main.py"]

# 或使用 ENTRYPOINT（优先级更高，不易被覆盖）
ENTRYPOINT ["python"]
CMD ["main.py"]
```

**关键指令对比**：

| 指令         | 执行时机      | 用途                                         |
| ------------ | ------------- | -------------------------------------------- |
| `RUN`        | 构建镜像时    | 安装依赖、编译代码                           |
| `CMD`        | 容器启动时    | 定义默认启动命令                             |
| `ENTRYPOINT` | 容器启动时    | 定义固定启动逻辑                             |
| `COPY`       | 构建镜像时    | 复制本地文件到镜像                           |
| `ADD`        | 构建镜像时    | 类似 COPY，支持自动解压和 URL 下载（不推荐） |
| `WORKDIR`    | 构建时/运行时 | 设置工作目录（不存在则创建）                 |

### 7.3 Dockerfile 最佳实践

#### 7.3.1 使用 .dockerignore

在 Dockerfile 同目录下创建 `.dockerignore` 文件，排除不需要进入镜像的文件，类似 `.gitignore`：

```gitignore
# .dockerignore
node_modules/
.git/
*.log
.env
__pycache__/
*.pyc
.idea/
```

**作用**：减小镜像体积、加快构建速度、避免敏感文件泄漏

#### 7.3.2 镜像层缓存优化

Docker 镜像由层（Layer）堆叠而成，每条 `RUN`、`COPY`、`ADD` 指令都会创建新层。构建时 Docker 会缓存已存在的层，仅文件变化时重新构建。

```dockerfile
# ❌ 错误：频繁变动的源码在前，依赖安装无法缓存
COPY . /app
RUN pip install -r requirements.txt

# ✅ 正确：先复制不常变的依赖文件，安装后再复制源码
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app/
```

**原理**：`requirements.txt` 不常变动，Docker 会命中缓存跳过耗时的 `pip install`，仅修改源码时构建秒级完成。

#### 7.3.3 减少镜像层数

```dockerfile
# ❌ 每条 RUN 创建一个新层，镜像体积膨胀
RUN apt update
RUN apt install -y vim curl
RUN rm -rf /var/lib/apt/lists/*

# ✅ 合并命令，只产生一层，并清理缓存
RUN apt update && apt install -y vim curl \
    && rm -rf /var/lib/apt/lists/*
```

**注意**：清理操作（如删除 apt 缓存）必须在同一条 RUN 中执行，否则被删除的文件仍然存在于上一层中。

#### 7.3.4 多阶段构建（Multi-stage Builds）

在同一个 Dockerfile 中使用多个 `FROM`，前一阶段编译，后一阶段仅复制编译产物，**大幅减小最终镜像体积**。

**Go 应用示例**：

```dockerfile
# === 第一阶段：编译 ===
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server

# === 第二阶段：运行 ===
FROM alpine:3.19
WORKDIR /root/
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

**效果**：单阶段 ~800MB（含 Go 编译器）→ 多阶段 ~15MB（仅二进制 + Alpine）

**Python 示例**：

```dockerfile
# 第一阶段：安装依赖
FROM python:3.13-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# 第二阶段：运行
FROM python:3.13-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY ./src .
ENV PATH=/root/.local:$PATH
CMD ["python", "main.py"]
```

### 7.4 构建镜像

```bash
# 基本构建（. 表示 Dockerfile 所在目录）
docker build -t [镜像名]:[标签] .

# 示例
docker build -t myapp:1.0 .

# 指定 Dockerfile 路径
docker build -f /path/to/Dockerfile -t myapp:1.0 .

# 构建时传递参数
docker build --build-arg HTTP_PROXY=http://proxy:8080 -t myapp .
```

### 7.5 推送到 Docker Hub

```bash
# 1. 登录（浏览器验证）
docker login

# 2. 给镜像打标签（必须包含用户名/命名空间）
docker tag [本地镜像名]:[标签] [用户名]/[仓库名]:[标签]
docker tag myapp:1.0 username/myapp:1.0

# 3. 推送
docker push username/myapp:1.0

# 4. 他人拉取
docker pull username/myapp:1.0
```

### 7.6 镜像的导入与导出

用于离线环境迁移镜像或备份：

```bash
# 保存镜像为 tar 文件
docker save -o my-image.tar myapp:1.0

# 从 tar 文件加载镜像
docker load -i my-image.tar

# 也支持 gzip 压缩
docker save myapp:1.0 | gzip > my-image.tar.gz
gunzip -c my-image.tar.gz | docker load
```

**`docker save` vs `docker export`**：

| 命令            | 对象 | 内容                     | 用途           |
| --------------- | ---- | ------------------------ | -------------- |
| `docker save`   | 镜像 | 完整镜像层 + 历史记录    | 镜像迁移、备份 |
| `docker export` | 容器 | 仅文件系统快照（无历史） | 容器快照、调试 |

## 8. 容器编排：Docker Compose

Docker Compose 使用 YAML 文件定义多容器应用，适合单机部署。

### 8.1 核心概念
- **Service**：一个服务对应一个容器（可运行多个副本）
- **Project**： Compose 文件定义的整个应用
- **Network**：每个 Compose 项目自动创建独立网络（默认 bridge），服务间可通过服务名通信

### 8.2 docker-compose.yml 结构

```yaml
version: '3.8'

services:
  # 服务名（即容器名前缀）
  web:
    image: nginx:latest
    container_name: my-nginx  # 指定容器名（可选）
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html
      - web-data:/data  # 使用命名卷
    environment:
      - NGINX_HOST=localhost
    networks:
      - frontend
    depends_on:
      - db  # 等待 db 服务启动后才启动

  db:
    image: mongo:latest
    container_name: my-mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: pass
    volumes:
      - mongo-data:/data/db
    networks:
      - frontend
      - backend

volumes:
  web-data:
  mongo-data:

networks:
  frontend:
  backend:
```

**与 docker run 参数对照**：
| docker run            | docker-compose                |
| --------------------- | ----------------------------- |
| `-p 80:80`            | `ports: - "80:80"`            |
| `-v /host:/container` | `volumes: - /host:/container` |
| `-e KEY=VALUE`        | `environment: - KEY=VALUE`    |
| `--name xxx`          | `container_name: xxx`         |
| `--network net1`      | `networks: - net1`            |

### 8.3 常用命令

```bash
# 启动所有服务（-d 后台运行）
docker-compose up -d

# 停止并删除容器、网络（保留卷）
docker-compose down

# 仅停止，不删除
docker-compose stop

# 启动已停止的服务
docker-compose start

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f [服务名]

# 构建镜像（当使用 build 指令时）
docker-compose build

# 指定非默认文件名的 compose 文件
docker-compose -f docker-compose.prod.yml up -d
```

**依赖管理**：
`depends_on` 仅控制启动顺序，不等待服务完全就绪（如数据库未完成初始化）。生产环境建议配合健康检查（healthcheck）或等待脚本。

## 9. Docker 技术原理简述

### 9.1 两大 Linux 内核特性
- **Cgroups（Control Groups）**：限制和隔离进程资源使用（CPU、内存、IO、网络带宽），确保容器资源不溢出影响宿主机。
- **Namespaces**：隔离进程资源视图（PID、Network、Mount、User、UTS 等），使容器内进程看到独立的系统环境。

### 9.2 容器本质
容器不是虚拟机，而是**特殊的进程**。宿主机可见容器内进程（但容器内看不到宿主机进程），通过 Namespace 实现视图隔离，通过 Cgroups 实现资源限制。

## 10. 补充信息与常见问题

### 10.1 弹幕精选补充
- **镜像站现状**：截至 2025 年 8 月，国内大部分 Docker 镜像加速站已关闭，建议关注最新可用镜像源或使用私有镜像仓库。
- **Mongo Express 默认凭证**：部分教程中 mongo-express 默认账号为 `admin`，密码为 `pass`（具体取决于镜像版本环境变量设置）。
- **macOS 卷编辑建议**：如需在 macOS 上直接编辑卷内容，建议使用绑定挂载（Bind Mount）映射到本地目录，而非使用 Docker 管理的命名卷（路径较深不易查找）。
- **Windows Host 模式问题**：Windows Docker Desktop 使用 Host 模式可能存在容器无法监听端口的 Bug，建议使用端口映射（-p）替代。
- **ARM 设备兼容性**：树莓派、香橙派等设备为 ARM64 架构，运行前需在 Docker Hub 确认镜像支持 `linux/arm64` 架构，部分 AI 应用（如 RAGFlow）仅提供 AMD64 版本。

### 10.2 调试技巧
- **curl 安装失败**：部分精简镜像缺少 curl，安装命令：
  ```bash
  # Debian/Ubuntu
  apt update && apt install -y curl
  
  # Alpine
  apk add --no-cache curl
  ```
- **权限问题（Permission Denied）**：非 root 用户执行 docker 命令前加 `sudo`，或将用户加入 docker 组后重新登录。