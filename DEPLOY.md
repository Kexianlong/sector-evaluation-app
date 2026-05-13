# 能力考核与评估平台 - 部署文档

## 项目信息

| 项目 | 内容 |
|------|------|
| 小程序名称 | 能力考核与评估平台 |
| AppID | `wx5a7e6e211227dd71` |
| 前端版本 | `2.1.0` |
| 前端技术栈 | 原生微信小程序 |
| 后端部署 | CloudBase 云函数（Node.js 18） |
| CloudBase 环境 ID | `cloud1-d9g2y40ql2eb2cc4a` |
| 后端函数名 | `api-backend` |
| HTTP 访问路径 | `/backend` → `api-backend` |

---

## 环境配置

### API 环境列表

| 环境 | 地址 | 用途 |
|------|------|------|
| `local` | `http://localhost:5000/api` | 本地开发调试 |
| `dev` | `https://cloud1-d9g2y40ql2eb2cc4a.service.tcloudbase.com/backend/api` | 测试/预发布 |
| `prod` | `https://cloud1-d9g2y40ql2eb2cc4a.service.tcloudbase.com/backend/api` | 线上生产环境 |

> **注意**：当前 `dev` 和 `prod` 指向同一个 CloudBase 环境。如需真正分离，请在 CloudBase 控制台创建新的环境，并修改 `app.js` 中的 `API_ENVIRONMENTS`。

### 切换环境

在小程序中调用：
```javascript
const app = getApp();
app.setApiEnv('dev');  // 切换到测试环境
```

环境标记会持久化到 Storage，下次启动自动生效。

---

## 部署前检查清单

- [ ] 后端云函数 `api-backend` 已重新部署且运行正常
- [ ] 微信公众平台「request 合法域名」已添加 `cloud1-d9g2y40ql2eb2cc4a.service.tcloudbase.com`
- [ ] 微信公众平台「上传域名」已配置（如需图片上传功能）
- [ ] `app.js` 中的 `APP_VERSION` 和 `BUILD_TIME` 已更新
- [ ] 所有 P0/P1 修复已合并到当前分支
- [ ] 微信开发者工具「详情 → 本地设置」中已关闭「上传代码时样式自动补全」（避免 WXSS 体积膨胀）

---

## 前端部署步骤（微信小程序）

### 1. 开发版 / 体验版部署

1. 打开微信开发者工具
2. 点击右上角「上传」按钮
3. 填写版本号和项目备注
4. 上传成功后，登录[微信公众平台](https://mp.weixin.qq.com)
5. 进入「管理 → 版本管理」
6. 将刚上传的版本设为「体验版」
7. 扫码体验，确认功能正常

### 2. 生产版部署（提交审核）

1. 在「版本管理」中，点击「提交审核」
2. 填写功能介绍和测试账号
3. 等待微信审核（通常 1–3 个工作日）
4. 审核通过后，点击「发布」

---

## 后端部署说明

### 后端技术栈

- **运行时**：Node.js 18.15
- **框架**：Express 4.x
- **模块格式**：CommonJS 入口（`index.js`）+ ESM 业务代码（`src/`）
- **云函数适配**：`serverless-http` 3.x
- **数据库**：CloudBase NoSQL（基于 `@cloudbase/node-sdk`）

> **重要**：CloudBase Node.js 18 运行时不兼容根目录的 `"type": "module"`，
> 因此采用混合方案：根目录 CJS + `src/` 目录 ESM。详见 `backend-fix/README.md`。

### 后端代码位置

后端代码位于本仓库的 `backend/` 目录下：

```
backend/
├── index.js              # CJS 入口文件（云函数 main）
├── package.json          # 依赖配置（无 type: module）
├── src/
│   ├── package.json      # { "type": "module" }
│   ├── db.js             # 数据库初始化
│   ├── routes/           # API 路由
│   ├── middleware/       # 中间件
│   ├── utils/            # 工具函数
│   └── data/             # 静态数据
└── scf_bootstrap         # 云函数启动脚本
```

### 后端部署步骤

#### 方式一：使用 CloudBase CLI（推荐）

```bash
# 确保已登录 CloudBase CLI
tcb login

# 进入后端代码目录
cd backend

# 部署到云函数
tcb fn deploy api-backend --yes -e cloud1-d9g2y40ql2eb2cc4a
```

#### 方式二：通过 CloudBase 控制台手动上传

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入环境 `cloud1-d9g2y40ql2eb2cc4a`
3. 选择「云函数」→ 函数 `api-backend`
4. 点击「编辑」→ 上传 ZIP 代码包
5. 确保 `node_modules` 不在 ZIP 中（云端会自动安装依赖）

#### 方式三：CI/CD 自动部署

项目已配置 GitHub Actions，推送 `master` 分支时自动部署：

```yaml
# .github/workflows/deploy-backend.yml
```

> 注意：GitHub Actions 需要配置 `TCB_SECRET_ID` 和 `TCB_SECRET_KEY` Secret。

### 验证后端部署

```bash
# 测试健康检查接口
curl https://cloud1-d9g2y40ql2eb2cc4a-1330214553.ap-shanghai.app.tcloudbase.com/backend/api/health

# 预期返回
{"success":true,"data":{"status":"ok","db":"cloudbase_nosql"}}
```

### 后端与前端的版本匹配

每次后端发布前，请确保：
- API 接口与前端调用保持一致
- 数据库迁移脚本已执行（如有 Schema 变更）
- 在 `DEPLOY.md` 中记录后端版本号

---

## CloudBase CLI 使用

### 安装 CLI

```bash
npm install -g @cloudbase/cli
```

### 登录

```bash
tcb login
```

### 常用命令

```bash
# 查看函数列表
tcb fn list -e cloud1-d9g2y40ql2eb2cc4a

# 查看函数日志
tcb fn log api-backend -e cloud1-d9g2y40ql2eb2cc4a --limit 20

# 调用函数（测试）
tcb fn invoke api-backend -e cloud1-d9g2y40ql2eb2cc4a --data '{"path":"/api/health"}'
```

---

## 回滚流程

### 前端回滚

1. 登录微信公众平台
2. 进入「版本管理」
3. 在「线上版本」中点击「退回上一版本」

### 后端回滚

1. 登录 CloudBase 控制台
2. 进入「云函数」→ 函数 `api-backend`
3. 在「版本管理」中选择上一个稳定版本
4. 点击「回滚」将流量切回旧版本

---

## 常见问题排查

### 问题 1：云函数返回 FUNCTION_INVOCATION_FAILED (400)

**现象**：HTTP 调用返回 400，错误码 `FUNCTION_INVOCATION_FAILED`。

**排查**：
1. 查看 CloudBase 控制台「日志」确认具体错误
2. 如果是 `writeRuntimeFile` 崩溃，检查 `package.json` 是否包含 `"type": "module"`
3. 确认入口文件导出了 `exports.main`
4. 确认 `node_modules` 已正确安装（云端自动安装或本地打包）

### 问题 2：小程序请求后端返回 401

**排查**：
1. 确认后端 JWT 密钥配置正确
2. 确认 Token 未过期（Storage 中 `token` 的有效期）
3. 检查后端用户表数据是否正常

### 问题 3：本地调试无法连接后端

**排查**：
1. 确认 `app.setApiEnv('local')` 或手动设置了本地地址
2. 确认本地后端服务已启动在 `localhost:9000`
3. 确认微信开发者工具「详情 → 本地设置」中已勾选「不校验合法域名」

### 问题 4：路径透传问题

**现象**：请求路径不正确，路由匹配失败。

**排查**：
1. 确认 CloudBase HTTP 访问路径配置中「路径透传」已关闭
2. 确认前端请求的 URL 包含触发路径前缀（如 `/backend/api/health`）

---

## 联系方式

- 邮箱：[kexl_atc@yeah.net](mailto:kexl_atc@yeah.net)
