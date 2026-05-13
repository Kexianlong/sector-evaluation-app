# 能力考核与评估平台 - 部署文档

## 项目信息

| 项目 | 内容 |
|------|------|
| 小程序名称 | 能力考核与评估平台 |
| AppID | `wx5a7e6e211227dd71` |
| 前端版本 | `1.0.0` |
| 前端技术栈 | 原生微信小程序 |
| 后端部署 | CloudBase Run（云托管） |
| CloudBase 环境 ID | `cloud1-d9g2y40ql2eb2cc4a` |
| 后端服务名 | `sector-eval-api` |

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

- [ ] 后端服务已在 CloudBase Run 上成功部署且运行正常
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

> ⚠️ **后端代码不在本仓库中**。当前后端为独立部署在 CloudBase Run 上的容器服务（推断为 Python Flask）。

### 后端部署方式

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入环境 `cloud1-d9g2y40ql2eb2cc4a`
3. 选择「云托管」→ 服务 `sector-eval-api`
4. 通过以下方式更新：
   - **方式一**：直接上传代码包（ZIP）
   - **方式二**：绑定 Git 仓库自动构建
   - **方式三**：使用 CloudBase CLI：`cloudbase framework deploy`

### 后端与前端的版本匹配

每次后端发布前，请确保：
- API 接口与前端调用保持一致
- 数据库迁移脚本已执行（如有 Schema 变更）
- 在 `DEPLOY.md` 中记录后端版本号

---

## CloudBase CLI 使用（可选）

### 安装 CLI

```bash
npm install -g @cloudbase/cli
```

### 登录

```bash
cloudbase login
```

### 部署静态资源

```bash
cloudbase framework deploy
```

> 注：微信小程序本身无法通过 CLI 直接上传，仍需使用微信开发者工具。CloudBase CLI 主要用于部署 H5 或静态资源。

---

## 回滚流程

### 前端回滚

1. 登录微信公众平台
2. 进入「版本管理」
3. 在「线上版本」中点击「退回上一版本」

### 后端回滚

1. 登录 CloudBase 控制台
2. 进入「云托管」→ 服务详情
3. 在「版本管理」中选择上一个稳定版本
4. 点击「切换流量」将流量切回旧版本

---

## 常见问题排查

### 问题 1：小程序请求后端返回 435

**现象**：后端 API 返回 HTTP 435。

**排查**：
1. 确认微信公众平台「request 合法域名」已配置 CloudBase 域名
2. 确认 CloudBase 控制台中「云托管」服务的访问权限设置为「公网访问」
3. 检查 CloudBase 环境的防火墙/IP 白名单设置
4. 确认 HTTPS 证书未过期

### 问题 2：登录接口返回 401

**排查**：
1. 确认后端 JWT 密钥配置正确
2. 确认 Token 未过期（Storage 中 `token` 的有效期）
3. 检查后端用户表数据是否正常

### 问题 3：本地调试无法连接后端

**排查**：
1. 确认 `app.setApiEnv('local')` 或手动设置了本地地址
2. 确认本地后端服务已启动在 `localhost:5000`
3. 确认微信开发者工具「详情 → 本地设置」中已勾选「不校验合法域名」

---

## 联系方式

- 邮箱：[kexl_atc@yeah.net](mailto:kexl_atc@yeah.net)
