# Film Roll 🎞️

胶片管理 Web 应用 — 以「胶卷」为单位管理和展示你的胶片照片。

## Quick Start

```bash
# 1. 确保安装了 Node.js 18+
node --version

# 2. 安装依赖
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 3. 启动开发服务器（前后端同时启动）
npm run dev
```

启动后访问 http://localhost:5173

## 功能

- **胶卷管理** — 创建胶卷，记录编号、日期、地点、相机、胶卷型号
- **批量上传** — 拖拽或选择文件，一次上传整卷照片
- **胶卷可视化** — 以真实胶片条形式展示照片，包含齿孔、帧编号等拟真元素
- **大图浏览** — 点击照片查看原图，键盘左右切换
- **下载** — 单张下载或整卷 ZIP 打包下载
- **分享** — 生成公开链接，他人无需登录即可查看

## 技术栈

- **前端**: React 18 + Vite + TailwindCSS + React Router
- **后端**: Node.js + Express + SQLite (better-sqlite3)
- **图片处理**: Sharp (缩略图生成)
- **存储**: 本地文件系统（抽象层设计，可切换为 S3/OSS）

## 项目结构

```
film-roll/
├── client/          # React 前端
│   └── src/
│       ├── components/   # 可复用组件
│       └── pages/        # 页面组件
├── server/          # Express 后端
│   ├── routes/      # API 路由
│   ├── storage/     # 存储抽象层
│   └── uploads/     # 上传文件目录(自动创建)
└── package.json     # 根配置(concurrently启动)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/rolls | 获取所有胶卷 |
| POST | /api/rolls | 创建胶卷 |
| GET | /api/rolls/:id | 获取单卷详情 |
| PUT | /api/rolls/:id | 更新胶卷信息 |
| DELETE | /api/rolls/:id | 删除胶卷 |
| POST | /api/photos/upload/:rollId | 批量上传照片 |
| GET | /api/photos/file/:filename | 获取原图 |
| GET | /api/photos/thumb/:filename | 获取缩略图 |
| GET | /api/photos/download/:id | 下载单张 |
| GET | /api/photos/download-roll/:rollId | 下载整卷 ZIP |
| POST | /api/share/:rollId | 创建分享链接 |
| GET | /api/share/view/:token | 访问分享内容 |

## 切换到云存储

编辑 `server/storage/index.js`，将导入从 `local.js` 改为你的 S3/OSS 实现即可：

```js
// export { storage } from './local.js';
export { storage } from './s3.js'; // 实现相同接口
```
