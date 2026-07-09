# Burn0

Burn0 是一个运行在 Cloudflare Workers 上的阅后即焚应用。用户写入文本或图片后生成分享链接，内容会在达到打开次数、过期时间，或二者任一条件后自动销毁。

## 功能

- 创建私密消息链接，不提供公开消息列表。
- 支持文本分享；配置 R2 后可选支持单张图片分享。
- 支持按打开次数、按过期时间、按次数或时间任一条件归零。
- 使用 Cloudflare D1 保存加密消息、状态、举报、清理设置和封禁数据。
- 使用可选 Cloudflare R2 保存加密后的图片对象，图片进入终态后会尽快删除对象。
- 使用 Durable Objects 串行处理消息打开和计数。
- 可选接入 Cloudflare Turnstile 人机验证。
- 内置管理后台，支持消息查看、隔离、删除、举报处理、来源封禁和清理设置。
- 定时任务每 10 分钟检查过期消息，并按后台设置物理清理终态历史消息。

管理入口默认隐藏。连续点击左上角 Burn0 标志中的 `0` 8 次，可以进入管理登录页。

## 项目结构

```text
public/                 前端静态资源
src/worker/index.js     Worker 入口和 API 实现
migrations/             D1 数据库结构迁移
scripts/check.mjs       静态检查脚本
wrangler.jsonc          Cloudflare Workers 配置
```

## 部署指南

### 网页部署 (Workers Builds)

无需命令行，推荐通过 Cloudflare Dashboard 连接 Git 仓库部署。

#### 1. Fork 仓库

Fork 本仓库到自己的 GitHub 账号。

#### 2. 创建 D1 数据库

1. 进入 **Storage & Databases** → **D1**。
2. 点击 **Create database**。
3. 数据库名称建议填写 `burn0-db`。

#### 3. 连接 Git 仓库部署

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2. 进入 **Workers & Pages**。
3. 点击 **Create application**。
4. 选择 **Connect to Git**，连接 fork 后的 GitHub 仓库。
5. 配置构建设置：
   - **Root directory**: 留空或 `/`
   - **Build command**: `npm ci && npm run check`
   - **Deploy command**: `npx wrangler deploy`
6. 点击 **Deploy**。

#### 4. 添加环境变量

进入项目 **Settings** → **Variables and Secrets**，添加以下变量。

| 变量名 | 类型 | 说明 |
|---|---|---|
| `APP_ENV` | Text | 填写 `production` |
| `TURNSTILE_SITE_KEY` | Text | Turnstile Site Key，可选。启用 Turnstile 时填写 |
| `CONTENT_ENCRYPTION_KEY` | Secret | 消息内容加密密钥 |
| `IP_HASH_SECRET` | Secret | 来源 IP/User-Agent 哈希盐 |
| `ADMIN_USERNAME` | Secret | 管理员账号 |
| `ADMIN_PASSWORD` | Secret | 管理员密码 |
| `ADMIN_SESSION_SECRET` | Secret | 管理会话签名密钥，至少 24 个字符 |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile Secret Key，可选 |
| `MAX_IMAGE_BYTES` | Text | 图片大小上限，可选，默认并最高为 `5242880` |
| `IMAGE_BUCKET_PREFIX` | Text | R2 图片对象前缀，可选，默认 `images/` |

`CONTENT_ENCRYPTION_KEY` 和 `IP_HASH_SECRET` 上线后应保持稳定，否则历史消息解密和来源哈希匹配会受到影响。

Cloudflare 控制台保存变量时，可能会提示把变更同步到 Wrangler 配置文件。这个项目开启了 `keep_vars`，部署时会保留 Cloudflare Dashboard 中已有的 Text 变量；`wrangler.jsonc` 中只保留稳定默认值 `APP_ENV=production`。`TURNSTILE_SITE_KEY` 建议只在 Cloudflare Dashboard 中配置，所有 **Secret** 都不要写入 `wrangler.jsonc`，生产环境在 Cloudflare Dashboard 中保存，本地开发写入 `.dev.vars`。

如果你 fork 后只使用文本分享，通常不需要修改仓库里的 `wrangler.jsonc`。如果启用图片分享，需要按下方 R2 说明把绑定写入自己的 `wrangler.jsonc`，不要只在 Dashboard 手动添加绑定。

#### 5. 绑定 D1 数据库

1. 回到 Worker 项目，进入 **Settings** → **Bindings**。
2. 点击 **Add binding**。
3. 选择 **D1 Database**。
4. **Variable name** 填写 `DB`。
5. 选择刚创建的 D1 数据库并保存。

绑定名必须是 `DB`，否则 Worker 无法访问数据库。

#### 6. 可选：启用图片分享

如果只需要文本分享，可以跳过本节；未配置 R2 时，前端不会显示图片入口，后端也会拒绝图片创建。

启用图片分享需要创建 R2 bucket，并把 Worker R2 binding 写入自己的 `wrangler.jsonc`：

1. 进入 **Storage & Databases** → **R2**。
2. 创建 bucket，例如 `burn0-images`。
3. 在自己的 fork 中打开 `wrangler.jsonc`，找到已经注释的 `r2_buckets` 模板。
4. 取消注释，并把 `bucket_name` 改成自己的 R2 bucket 名。

示例：

```jsonc
"r2_buckets": [
  {
    "binding": "IMAGE_BUCKET",
    "bucket_name": "burn0-images"
  }
]
```

`binding` 必须保持为 `IMAGE_BUCKET`，因为 Worker 代码通过 `env.IMAGE_BUCKET` 访问 R2。使用 `npm run deploy`、`npx wrangler deploy` 或 Workers Builds 时，Wrangler 配置会作为部署配置来源；如果只在 Cloudflare Dashboard 手动添加 R2 binding，后续部署可能会移除该绑定。

图片只支持 JPEG、PNG、WebP、GIF，不支持 SVG；单张图片最大 5MB。Worker 会先加密图片再写入 R2，D1 只保存生命周期和图片元数据。

#### 7. 首次访问

访问部署后的 Workers 域名。应用会在首次 API 请求时自动初始化 D1 表结构，创建消息、举报、管理员、清理设置和封禁相关数据表。

本地数据库数据不会上传到 Cloudflare。`migrations/` 保留为表结构参考和手动恢复入口。

#### 已有生产库升级

如果你的生产 D1 已经运行过旧版本，升级到支持图片分享的版本前，需要对远程 D1 执行新增列迁移：

```powershell
npm run db:migrate:remote
```

这会执行 `migrations/0002_image_content.sql`，为 `messages` 表增加图片元数据列。建议先在 Cloudflare D1 控制台确认近期备份/Time Travel 可用，再执行生产迁移。

#### 自动部署未触发？快速排查

如果推送代码后 Cloudflare 没有自动开始新构建，可以检查：

1. 项目类型是否为 **Workers Builds**。
2. Git 仓库监听分支是否与实际推送分支一致。
3. 构建配置是否仍为：
   - Build command: `npm ci && npm run check`
   - Deploy command: `npx wrangler deploy`
4. D1 绑定名是否为 `DB`。
5. 必需 Secrets 是否已经配置。
6. 首次访问后如果仍提示数据库错误，确认 Worker 已重新部署并绑定到正确的 D1 数据库。
7. GitHub 授权是否仍然有效，必要时在 Cloudflare 中重新连接仓库。

## 本地开发

安装依赖：

```powershell
npm install
```

复制本地环境变量：

```powershell
Copy-Item .dev.vars.example .dev.vars
```

启动本地服务：

```powershell
npm run dev
```

首次访问本地页面时会自动初始化本地 D1 表结构。本地 D1 数据由 Wrangler 保存在本地状态目录中，不需要登录 Cloudflare，也不会提交到仓库。

## 检查

```powershell
npm run check
```

检查内容包括必要文件是否存在、Worker 和前端脚本语法是否通过、初始化迁移是否包含核心数据表。

## 许可
MIT
