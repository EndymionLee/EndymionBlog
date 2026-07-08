---
title: Gin 中间件：从入门到实战
date: 2026-07-09
tags:
  - Go
  - Gin
  - Middleware
category: Go
---

# Gin 中间件：从入门到实战

## 为什么需要中间件

在 Web 应用中，有很多横切关注点（cross-cutting concerns）：

- 请求日志
- 认证鉴权
- 错误恢复
- 请求限流
- CORS

这些逻辑不适合写在每个业务处理函数中，**中间件**就是用来解决这个问题的。

## Gin 中的中间件

Gin 的中间件本质上是 `gin.HandlerFunc`：

```go
type HandlerFunc func(*Context)
```

### 最简单的中间件

```go
package main

import (
    "log"
    "time"
    "github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        t := time.Now()
        
        // 请求前
        c.Next()
        // 请求后
        
        latency := time.Since(t)
        log.Printf("%s %s %s %v",
            c.Request.Method,
            c.Request.URL.Path,
            c.Writer.Status(),
            latency,
        )
    }
}
```

### 使用中间件

```go
func main() {
    r := gin.New()
    
    // 全局中间件
    r.Use(gin.Logger())
    r.Use(gin.Recovery())
    r.Use(Logger())
    
    // 路由组中间件
    api := r.Group("/api")
    api.Use(AuthMiddleware())
    {
        api.GET("/users", GetUsers)
        api.POST("/users", CreateUser)
    }
    
    // 单路由中间件
    r.GET("/admin", AdminMiddleware(), AdminHandler)
    
    r.Run(":8080")
}
```

## 实战：JWT 认证中间件

```go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(401, gin.H{"error": "未授权"})
            c.Abort()
            return
        }
        
        // 验证 JWT
        claims, err := ParseJWT(token)
        if err != nil {
            c.JSON(401, gin.H{"error": "令牌无效"})
            c.Abort()
            return
        }
        
        // 将用户信息存入上下文
        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)
        
        c.Next()
    }
}
```

### `c.Next()` vs `c.Abort()`

| 方法 | 行为 |
|------|------|
| `c.Next()` | 继续执行后续中间件和处理函数 |
| `c.Abort()` | 停止后续中间件和处理函数 |

## 中间件链的执行顺序

```go
r.Use(Middleware1(), Middleware2())

// 请求流程：
// → Middleware1 (前)
//   → Middleware2 (前)
//     → Handler
//   → Middleware2 (后)
// → Middleware1 (后)
```

## 总结

1. 中间件是 Gin 的核心特性，用于处理横切关注点
2. `c.Next()` 放行，`c.Abort()` 拦截
3. 中间件可以作用在全局、路由组、单个路由
4. JWT 认证、日志、恢复是最常用的中间件场景
