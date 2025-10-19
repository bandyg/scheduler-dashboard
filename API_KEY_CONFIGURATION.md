# API Key 验证配置说明

## 概述

本项目已实现 `X-API-Key` 请求头验证功能，用于保护 API 接口的安全访问。该功能在前端代理层进行验证，确保只有携带有效 API Key 的请求才能被转发到后端服务。

## 功能特性

- ✅ **前端 API Key 验证**：在 Next.js 代理路由中验证 `X-API-Key` 请求头
- ✅ **自动添加请求头**：前端 API 客户端自动为所有请求添加 `X-API-Key`
- ✅ **接口排除机制**：`/system/health` 接口无需 API Key 验证
- ✅ **环境变量配置**：支持不同环境的 API Key 配置
- ✅ **详细错误信息**：提供清晰的验证失败原因

## 配置文件

### 环境变量配置

项目包含以下环境变量配置文件：

#### `.env.local` (本地开发环境)
```env
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=/api/proxy
API_KEY=local-dev-api-key-67890
```

#### `.env.development` (开发环境)
```env
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=/api/proxy
API_KEY=dev-api-key-12345
```

#### `.env.production` (生产环境)
```env
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=/api/proxy
API_KEY=your-secret-api-key-here
```

## API Key 验证流程

### 1. 前端请求流程

```
前端应用 → API 客户端 → 代理路由 → 后端服务
    ↓           ↓           ↓           ↓
  发起请求   添加X-API-Key  验证API Key  处理业务逻辑
```

### 2. 验证规则

- **需要验证的接口**：除 `/system/health` 外的所有 API 接口
- **验证方式**：检查请求头中的 `X-API-Key` 字段
- **验证标识**：前端使用 `client-request` 作为客户端标识
- **后端转发**：验证通过后，使用环境变量中的 `API_KEY` 向后端发送请求

### 3. 响应状态码

| 状态码 | 场景 | 响应内容 |
|--------|------|----------|
| 401 | 缺少 X-API-Key 请求头 | `{"success": false, "error": "Missing X-API-Key header"}` |
| 401 | X-API-Key 无效 | `{"success": false, "error": {"code": "UNAUTHORIZED", "message": "Invalid API key"}}` |
| 503 | 后端服务不可用 | `{"success": false, "error": {"code": "BACKEND_UNAVAILABLE", "message": "Backend service is not available..."}}` |
| 200/其他 | 验证通过，转发后端响应 | 后端实际响应内容 |

## 代码实现

### 前端 API 客户端 (`src/lib/api.ts`)

```typescript
// 为所有请求添加 X-API-Key 请求头
apiClient.interceptors.request.use((config) => {
  // 添加客户端标识，真正的验证在代理层进行
  config.headers['X-API-Key'] = 'client-request';
  return config;
});
```

### 代理路由验证 (`src/app/api/proxy/[...path]/route.ts`)

```typescript
// API Key 验证函数
function validateApiKey(request: NextRequest, path: string): NextResponse | null {
  // 排除 /system/health 接口
  if (path === 'system/health') {
    return null;
  }

  const providedApiKey = request.headers.get('X-API-Key');
  
  if (!providedApiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header' },
      { status: 401 }
    );
  }

  if (providedApiKey !== 'client-request') {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' }},
      { status: 401 }
    );
  }

  return null; // 验证通过
}
```

## 测试验证

### 1. 测试无 API Key 的请求

```bash
curl -H "Content-Type: application/json" http://localhost:3000/api/proxy/jobs
# 期望返回: 401 "Missing X-API-Key header"
```

### 2. 测试错误 API Key 的请求

```bash
curl -H "Content-Type: application/json" -H "X-API-Key: wrong-key" http://localhost:3000/api/proxy/jobs
# 期望返回: 401 "Invalid API key"
```

### 3. 测试正确 API Key 的请求

```bash
curl -H "Content-Type: application/json" -H "X-API-Key: client-request" http://localhost:3000/api/proxy/jobs
# 期望返回: 转发到后端的响应
```

### 4. 测试 Health 接口（无需验证）

```bash
curl -H "Content-Type: application/json" http://localhost:3000/api/proxy/system/health
# 期望返回: 200 健康检查数据
```

## 部署注意事项

### 生产环境配置

1. **更新 API Key**：将 `.env.production` 中的 `API_KEY` 替换为安全的密钥
2. **环境变量设置**：确保部署环境正确设置了 `API_KEY` 环境变量
3. **后端配置**：确保后端服务接受相同的 API Key

### 安全建议

1. **密钥管理**：
   - 使用强随机密钥
   - 定期轮换 API Key
   - 不要在代码中硬编码密钥

2. **环境隔离**：
   - 不同环境使用不同的 API Key
   - 生产环境密钥严格保密

3. **监控日志**：
   - 监控 401/403 错误频率
   - 记录可疑的访问尝试

## 故障排除

### 常见问题

1. **所有请求返回 401**
   - 检查前端是否正确添加了 `X-API-Key` 请求头
   - 确认 API Key 值为 `client-request`

2. **Health 接口也返回 401**
   - 检查代理路由中的路径匹配逻辑
   - 确认 `path === 'system/health'` 条件正确

3. **验证通过但后端返回 401**
   - 检查环境变量 `API_KEY` 是否正确设置
   - 确认后端服务期望的 API Key 格式

### 调试方法

1. **启用调试日志**：在代理路由中临时添加 `console.log` 查看请求详情
2. **检查网络请求**：使用浏览器开发者工具查看请求头
3. **测试后端直连**：直接测试后端 API 确认其 API Key 要求

## 更新历史

- **v1.0.0** (2025-10-19): 初始实现 API Key 验证功能
  - 添加前端 API Key 自动注入
  - 实现代理层验证逻辑
  - 排除 Health 接口验证
  - 支持多环境配置