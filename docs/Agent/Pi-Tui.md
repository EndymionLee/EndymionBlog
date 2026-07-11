---
title: Pi TUI
date: 2026-07-11
---

# Pi TUI 组件开发

> 来源：https://pi.dev/docs/latest/tui

---

## 什么是 TUI

Pi 的 TUI（终端用户界面）是一套组件库，用于在终端中构建交互界面。它包含 Text、Box、Container、Markdown、Image 等内置组件，支持键盘输入、焦点管理、覆盖层（Overlay）和主题系统。

TUI 组件可以在 Extension 和自定义工具中使用，通过 `ctx.ui.custom()` 挂载。

---

## 核心接口

所有组件必须实现以下方法：

```typescript
interface Component {
  render(width: number): string[];   // 渲染，返回字符串数组（每行一行）
  handleInput?(data: string): void;  // 处理键盘输入（获得焦点时）
  invalidate(): void;                // 清除缓存，主题变更时调用
}
```

- `render(width)` 的每行输出不能超过 `width`
- TUI 在每行末尾自动追加 SGR 重置和 OSC 8 重置，样式不会跨行延续

---

## 内置组件

| 组件 | 说明 |
|------|------|
| **Text** | 支持单词换行的多行文本，可设 padding 和背景 |
| **Box** | 带 padding 和背景色的容器 |
| **Container** | 垂直分组子组件，`addChild` / `removeChild` |
| **Spacer** | 空白行 |
| **Markdown** | 渲染 Markdown + 语法高亮 |
| **Image** | 在支持终端中渲染图片 |

---

## 使用方式

**在扩展中：**

```typescript
pi.on("some_event", async (event, ctx) => {
  const handle = await ctx.ui.custom((tui, theme) => {
    // 返回一个组件
    return {
      render(width) { return ["Hello"]; },
      invalidate() {},
      handleInput(data) {},
    };
  });
  // 控制
  handle.requestRender();
  handle.close();
});
```

**在自定义工具中：** 通过 `pi.ui.custom()` 使用。

---

## Overlay（覆盖层）

在现有内容之上渲染组件，不改变已有布局：

```typescript
const handle = await ctx.ui.custom((tui, theme) => component, {
  overlay: true,
  width: "50%",
  height: 10,
  anchor: "center",
});
```

**定位选项：**

- `width/height`：数字或百分比（如 `"50%"`）
- `minWidth/maxHeight`：最小/最大限制
- `anchor`：9 种锚点位置（`"center"`、`"right-center"` 等），默认 `"center"`
- `offsetX/offsetY`：相对锚点的偏移
- `row/col`：百分比或绝对定位
- `margin`：边距
- `visible`：响应式回调，决定是否显示

**焦点控制：** handle 提供 `focus()`、`unfocus()`、`setHidden()`、`hide()` 等方法。

---

## 键盘输入

使用 `matchesKey()` 检测按键：

```typescript
import { matchesKey, Key } from "@earendil-works/pi-tui";

handleInput(data) {
  if (matchesKey(data, Key.enter)) { /* 回车 */ }
  if (matchesKey(data, Key.escape)) { /* ESC */ }
  if (matchesKey(data, Key.up)) { /* 上键 */ }
  if (matchesKey(data, Key.ctrl("c"))) { /* Ctrl+C */ }
  if (matchesKey(data, Key.shift("tab"))) { /* Shift+Tab */ }

  // 字符串格式也可
  if (matchesKey(data, "ctrl+shift+p")) { /* Ctrl+Shift+P */ }
}
```

---

## 创建自定义组件

标准模式：实现 `render`、`handleInput`、`invalidate` 三个方法。

```typescript
function createCounter() {
  let count = 0;

  return {
    render(width) {
      return [`计数: ${count}`, `按 Enter 增加`];
    },
    handleInput(data) {
      if (matchesKey(data, Key.enter)) {
        count++;
        handle.requestRender(); // 触发重渲染
      }
    },
    invalidate() {
      // 清理缓存
    },
  };
}
```

---

## 行宽控制工具函数

```typescript
import { visibleWidth, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

visibleWidth(str);                 // 显示宽度（忽略 ANSI 码）
truncateToWidth(str, 80, "…");    // 按宽度截断
wrapTextWithAnsi(str, 80);        // 保留 ANSI 码的单词换行
```

---

## 主题系统

```typescript
// 前景色
theme.fg("accent", "文本")    // 强调色
theme.fg("error", "文本")     // 错误色
theme.fg("success", "文本")   // 成功色
theme.fg("muted", "文本")     // 弱化色
theme.fg("dim", "文本")       // 暗淡色

// 背景色
theme.bg("selectedBg", "文本")
theme.bg("userMessageBg", "文本")
theme.bg("toolSuccessBg", "文本")

// Markdown 主题
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
const mdTheme = getMarkdownTheme();
```

---

## 常用模式

### SelectList 选择框

```typescript
const handle = await ctx.ui.custom((tui, theme) => {
  return new SelectList(
    ["选项1", "选项2", "选项3"],
    (value) => { console.log("选中:", value); handle.close(); },
    (canceled) => { handle.close(); },
    { tui, title: "请选择" }
  );
}, { overlay: true, width: "50%", height: 10 });
```

### 状态指示器

```typescript
ctx.ui.setStatus("my-key", "处理中...");  // footer 显示
ctx.ui.setStatus("my-key", undefined);   // 清除
```

### Widget

```typescript
ctx.ui.setWidget("my-widget", ["第1行", "第2行"], { placement: "aboveEditor" });
ctx.ui.setWidget("my-widget", undefined); // 清除
```

### 自定义 Footer

```typescript
ctx.ui.setFooter((tui, theme, footerData) => {
  // footerData 包含 git 分支、扩展状态等信息
  return new Text("自定义 footer", 0, 0);
});
```

### 自定义 Editor

```typescript
// 继承 CustomEditor 实现模式编辑
// 需调用 super.handleInput() 传递未处理的按键
```

---

## 失效与主题变更

如果组件预烘焙了主题颜色，主题变化后需要重建颜色内容。

```typescript
invalidate() {
  super.invalidate?.();
  this.rebuild(); // 用当前主题重新构建
}
```

传递回调函数（而非预烘焙颜色）的组件不需要特殊处理。

---

## 调试

```bash
PI_TUI_WRITE_LOG=1 pi  # 捕获原始 ANSI 流日志
```

---

## 注意事项

1. 始终从 `ctx.ui.custom((tui, theme) => ...)` 回调中获取 theme，不要直接导入
2. `DynamicBorder` 的颜色参数必须显式标注类型：`(s: string) => theme.fg("accent", s)`
3. 状态变更后调用 `handle.requestRender()`
4. 自定义组件返回含 `render`、`invalidate`、`handleInput` 三方法的对象
5. Overlay 组件关闭后不可复用，每次重新显示需重新调用 `ctx.ui.custom()`
