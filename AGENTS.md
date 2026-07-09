# AGENTS.md

本文件是 Burn0 仓库的项目级协作说明，不是个人全局提示。修改本项目时优先遵循这里的工程约定。

## 项目概览

Burn0 是运行在 Cloudflare Workers 上的阅后即焚应用。前端是 `public/` 下的静态页面和原生 JavaScript，后端 API、D1 初始化、加密、消息生命周期、管理后台接口集中在 `src/worker/index.js`。

核心存储和运行时：

- D1：保存消息元数据、加密文本、状态、举报、管理员、清理设置和封禁数据。
- Durable Objects：串行处理消息打开和计数，避免并发打开导致次数错误。
- R2：可选保存加密后的图片对象；没有 `IMAGE_BUCKET` 绑定时图片分享入口应保持不可用。
- Turnstile：可选人机验证；未配置时不要阻断普通创建流程。

## 常用命令

```powershell
npm install
npm run check
npm run dev
npm run db:migrate:local
npm run db:migrate:remote
```

`npm run check` 是默认静态验证入口，会检查必要文件、Worker 和前端脚本语法、迁移与自动建表的一致性。改动后优先运行它；涉及纯文档变更时至少运行 `git diff --check`。

## 代码边界

- `public/app.js`：公开页面的创建、打开、举报、语言切换和前端校验逻辑。
- `public/admin.js`：管理后台页面和管理 API 调用逻辑。
- `public/styles.css`：前台和后台共享样式。
- `public/icons.js`：自托管内联 SVG 图标，不引入外部图标请求。
- `src/worker/index.js`：Worker 路由、API、加密、D1 自动建表、消息生命周期、管理员会话、清理任务。
- `migrations/`：D1 结构迁移参考和生产迁移入口；修改 schema 时同步 Worker 自动建表逻辑。

不要为了局部需求拆出大型框架、构建系统或新增前端依赖。项目当前依赖面很小，优先保持原生静态前端和单 Worker 入口的结构。

## 数据和安全约定

- 不要把 Secret 写入 `wrangler.jsonc`、README 示例之外的代码或提交内容；本地开发使用 `.dev.vars`。
- `CONTENT_ENCRYPTION_KEY`、`IP_HASH_SECRET`、`ADMIN_SESSION_SECRET` 是敏感配置，不能记录到日志或错误响应。
- 消息内容和图片对象进入终态后应尽快不可读；涉及删除、隔离、过期、打开次数的改动必须检查状态流转和 R2 清理路径。
- 图片只支持 JPEG、PNG、WebP、GIF，不支持 SVG；前端提示、前端校验、后端字节签名校验要保持一致。
- 未配置 R2 时，前端不显示图片入口，后端也必须拒绝图片创建，不能只做前端限制。

## 修改原则

- 优先最小改动，沿用现有函数、命名、错误响应和日志习惯。
- 公开 API、数据库列、消息状态、管理后台行为变更时，同时检查 README、迁移、Worker 自动建表和前端展示是否需要同步。
- 业务规则注释应靠近实际实现代码，描述业务触发条件和结果，不写空泛的“处理数据”“进行校验”。
- 不新增第二套真源；配置值以 Worker 环境和 Cloudflare 绑定为准，前端只消费 `/api/public-config`。
- 不做无关格式化、批量重排或顺手重构。

## 验证要求

- JavaScript 或 Worker 逻辑变更：运行 `npm run check`。
- 样式或前端交互变更：除 `npm run check` 外，按用户要求决定是否做浏览器验证；用户明确说不用测试 UI 时不要启动本地 UI 服务。
- schema 或迁移变更：检查 `migrations/` 和 `src/worker/index.js` 中自动建表、补列逻辑是否一致。
- 部署配置变更：检查 `wrangler.jsonc`、README 部署说明和 Cloudflare binding 名称是否一致。

无法完整验证时，交付时说明未验证的范围和原因。
