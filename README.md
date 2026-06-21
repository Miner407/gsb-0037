# 本地书签收藏与重复链接清理器

本地书签收藏管理工具，支持导入浏览器书签 HTML、检测并清理重复链接、按域名分组统计、归档管理。

## 环境要求

- Node.js >= 18
- npm >= 9

## 安装

```bash
npm install
```

## 启动

| 命令 | 说明 | 地址 |
|------|------|------|
| `npm run client:dev` | 前端开发服务器（Vite） | http://localhost:5173 |
| `npm run server:dev` | 后端开发服务器（Express + nodemon） | http://localhost:3001 |
| `npm run dev` | 全栈开发（concurrently 同时启动前后端） | 同上 |

## 数据库

SQLite 数据库文件位于 `data/bookmarks.db`，首次启动时自动创建。

示例书签文件：`examples/sample-bookmarks.html`

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 仪表板 — 统计概览、重复链接列表、域名分布、最近导入 |
| `/bookmarks` | 书签管理 — 搜索、筛选、批量归档、按域名分组 |

## 接口

### 书签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bookmarks` | 书签列表（支持 `search`、`domain`、`folder`、`archived`、`limit`、`offset` 参数） |
| GET | `/api/bookmarks/folders` | 文件夹列表 |
| GET | `/api/bookmarks/tags` | 标签列表 |
| GET | `/api/bookmarks/:id` | 单条书签 |
| POST | `/api/bookmarks` | 创建书签 |
| PUT | `/api/bookmarks/:id` | 更新书签 |
| DELETE | `/api/bookmarks/:id` | 删除书签 |
| PUT | `/api/bookmarks/batch` | 批量更新（归档） |
| DELETE | `/api/bookmarks/batch` | 批量删除 |

### 导入与去重

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/import/preview` | 导入预览 |
| POST | `/api/import` | 导入书签 HTML |
| POST | `/api/bookmarks/deduplicate` | 重复链接保留其一，归档其余 |

### 统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/overview` | 统计概览 |
| GET | `/api/stats/duplicates` | 重复链接列表 |
| GET | `/api/stats/domains` | 域名统计 |
| GET | `/api/stats/cleanup-suggestions` | 清理建议 |
| GET | `/api/stats/recent` | 最近导入 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

## 构建

```bash
npm run build
```

编译 TypeScript 并构建前端产物。

## 规范检查

```bash
npm run lint    # ESLint 代码检查
npm run check   # TypeScript 类型检查
```

## 验证

```bash
npm run test:verify
```

运行 `scripts/verify.mjs`，需先启动后端服务。

## 已知限制

- 仅支持 HTML 格式书签导入
- 不支持用户认证
- 本地 SQLite 不支持高并发
- 导入预览不写入数据库
