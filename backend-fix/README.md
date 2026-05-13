# 后端云函数修复方案

## 问题原因

CloudBase 云函数 `backend` 运行时崩溃，错误：

```
TypeError: Cannot read properties of undefined (reading 'toString')
    at writeRuntimeFile (/data/scf/frame/node18/runtime.js:65:37)
```

**根本原因**：原代码使用 `export default app` 导出，但 CloudBase 运行时期望通过 `index.main` 入口调用。缺少 `main` 导出函数导致运行时框架初始化失败。

## 修复内容

### 1. 新增依赖

在 `package.json` 中添加：

```json
{
  "dependencies": {
    "serverless-http": "^3.2.0"
  }
}
```

然后安装：
```bash
npm install serverless-http
```

### 2. 修改入口文件

用本目录下的 `index.js` 替换你后端仓库中的入口文件（通常是 `index.js`）。

**关键改动**：
- 新增 `import serverless from 'serverless-http'`
- 本地开发时仍然 `app.listen()` 启动服务器
- 新增 CloudBase 云函数入口：`export const main = serverless(app)`

### 3. 重新部署

```bash
# 进入你的后端代码目录
cd /path/to/your/backend

# 重新部署到 CloudBase 云函数
tcb fn deploy backend --yes -e cloud1-d9g2y40ql2eb2cc4a
```

### 4. 验证

部署完成后，测试接口：

```bash
curl https://cloud1-d9g2y40ql2eb2cc4a-1330214553.ap-shanghai.app.tcloudbase.com/backend/api/health
```

预期返回：
```json
{"success": true, "data": {"status": "ok", "db": "cloudbase_nosql"}}
```

## 注意事项

1. 本修复文件基于从云端拉取的原代码生成，如果你本地代码有额外修改，请合并后再替换
2. 确保 `package.json` 中的 `"type": "module"` 保持不变（ES Module 格式）
3. 如果使用了其他云函数平台（阿里云、AWS），`serverless-http` 同样兼容
