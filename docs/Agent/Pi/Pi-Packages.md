---
title: Pi Packages
date: 2026-07-11
---

# Pi Packages 包管理

> 来源：https://pi.dev/docs/latest/packages

---

## 什么是 Package

Package 是 Pi 的扩展分发机制。它把扩展（extensions）、技能（skills）、提示模板（prompts）和主题（themes）打包在一起，通过 npm 或 git 分享。

一个 Package 就是一个包含 `package.json` 的目录（或 npm 包 / git 仓库），Pi 会自动发现和加载其中的资源。

---

## 快速安装

```bash
# npm 包
pi install npm:@foo/bar@1.0.0

# git 仓库
pi install git:github.com/user/repo@v1

# 本地路径
pi install ./path/to/package
```

查看已安装：`pi list`
移除：`pi remove npm:@foo/bar`

---

## 源类型

### npm

```bash
pi install npm:@scope/pkg@1.2.3
pi install npm:pkg
```

用户级别安装到 `~/.pi/agent/npm/`，项目级别安装到 `.pi/npm/`。

### git

```bash
# 完整 URL
pi install https://github.com/user/repo@v1
pi install ssh://git@github.com/user/repo@v1

# 简写（git: 前缀）
pi install git:github.com/user/repo
pi install git:git@github.com:user/repo@v1.0.0
```

克隆存储到 `~/.pi/agent/git/<host>/<path>`（全局）或 `.pi/git/<host>/<path>`（项目）。

SSH 地址自动读取 `~/.ssh/config`。CI 环境建议设置：

```bash
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=5"
```

### 本地路径

```bash
pi install /absolute/path/to/package
pi install ./relative/path/to/package
```

相对路径基于 settings.json 所在目录解析。

---

## 创建 Package

在 `package.json` 中添加 `pi` 声明：

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

路径基于包根目录。支持 glob 模式和 `!` 排除。

### 约定目录

不写 `pi` 声明时，自动发现以下目录：

```
extensions/    — 加载 .ts 和 .js 文件
skills/        — 递归查找 SKILL.md
prompts/       — 加载 .md 文件
themes/        — 加载 .json 文件
```

### 画廊元数据

用于 [Pi 包画廊](https://pi.dev/packages) 展示：

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "video": "https://example.com/demo.mp4",
    "image": "https://example.com/screenshot.png"
  }
}
```

---

## 依赖管理

```json
{
  "dependencies": {
    "some-lib": "^1.0.0"
  },
  "bundledDependencies": ["some-lib"],
  "pi": {
    "extensions": ["extensions", "node_modules/some-lib/extensions"]
  }
}
```

**核心包**（由 Pi 提供，**不要打包**）：

```
@earendil-works/pi-ai
@earendil-works/pi-agent-core
@earendil-works/pi-coding-agent
@earendil-works/pi-tui
typebox
```

这些应放在 `peerDependencies` 中：

```json
{
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*"
  }
}
```

**其他 Pi 包**必须打包进 tarball，加入 `dependencies` 和 `bundledDependencies`。

---

## 过滤加载

通过 settings.json 的对象形式控制加载内容：

```json
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"],
      "themes": ["+themes/legacy.json"]
    }
  ]
}
```

规则：
- 省略某字段 = 加载所有
- `[]` = 不加载该类型
- `!pattern` = 排除匹配项
- `+path` = 强制包含精确路径
- `-path` = 强制排除精确路径

---

## 启用/禁用资源

`pi config` 命令可以启用或禁用已安装包中的扩展、技能、提示模板和主题。

```bash
pi config        # 全局设置
pi config -l     # 项目设置，继承的全局资源会变暗显示
```

Tab 键切换全局/项目模式。

---

## 临时安装

只在当前运行生效，不写入设置：

```bash
pi -e npm:@foo/bar
pi -e git:github.com/user/repo
```

---

## 作用域与去重

同一包在全局和项目设置中同时出现时，项目设置优先。去重依据：

- **npm**：包名
- **git**：仓库 URL（不含 ref）
- **本地**：解析后的绝对路径
