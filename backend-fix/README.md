# 后端云函数修复方案

## 问题原因

CloudBase 云函数 `api-backend` 运行时崩溃，错误：

```
TypeError: Cannot read properties of undefined (reading 'toString')
    at writeRuntimeFile (/data/scf/frame/node18/runtime.js:65:37)
```

**根本原因**：CloudBase Node.js 18 运行时框架对 ESM（`"type": "module"`）支持存在 bug，
导致运行时初始化 `writeRuntimeFile` 时崩溃。该错误发生在用户代码执行之前，
因此无论代码如何简化（甚至是一个空函数），只要 `package.json` 中包含 `"type": "module"`，
函数就会崩溃。

## 修复方案

### 核心思路

1. **根目录使用 CommonJS**：删除根目录 `package.json` 中的 `"type": "module"`，
   入口文件 `index.js` 使用 CJS 格式（`require` / `exports.main`）。
2. **子目录保持 ESM**：在 `src/` 目录下创建 `package.json` 包含 `"type": "module"`，
   使业务代码（`src/` 下的 `.js` 文件）继续保持 ESM 格式，无需修改。
3. **动态导入**：在 CJS 入口文件中使用 `import()` 动态加载 `src/` 下的 ESM 模块。

### 文件改动

#### 1. 根目录 `package.json`

删除 `"type": "module"`：

```json
{
  "name": "api-backend",
  "version": "2.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "3.18.1",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.1.1",
    "serverless-http": "^3.2.0",
    "xlsx": "0.18.5"
  }
}
```

#### 2. 新增 `src/package.json`

```json
{
  "type": "module"
}
```

#### 3. 替换入口文件 `index.js`

使用本目录下的 `index.js` 替换原入口文件。

**关键改动**：
- 使用 `require()` 加载 `express`、`cors`、`serverless-http`
- 使用 `import()` 动态加载 `src/` 下的 ESM 路由模块
- 导出 `exports.main` 作为云函数入口
- 本地开发时仍然启动 `app.listen()`

### 重新部署

```bash
# 进入后端代码目录
cd /path/to/your/backend

# 重新部署到 CloudBase 云函数
tcb fn deploy api-backend --yes -e cloud1-d9g2y40ql2eb2cc4a
```

### 验证

部署完成后，测试接口：

```bash
curl https://cloud1-d9g2y40ql2eb2cc4a-1330214553.ap-shanghai.app.tcloudbase.com/backend/api/health
```

预期返回：
```json
{"success": true, "data": {"status": "ok", "db": "cloudbase_nosql"}}
```

## 注意事项

1. 本修复方案适用于 CloudBase Node.js 18 云函数。如果腾讯云修复了 ESM 兼容性问题，
   未来可以恢复为纯 ESM 方案。
2. 如果使用了其他云函数平台（阿里云、AWS），请确认该平台是否支持 ESM。
   `serverless-http` 本身兼容所有平台。
3. `src/` 下的业务代码完全不需要修改，保持 ESM 格式即可。
