<!-- 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro -->
# 知乎网站模仿（三级项目）

- 学号：24001010302
- 姓名：张浩扬
- 项目名称：知乎网站模仿
- 项目类别：模仿

## 项目简介
以知乎为模仿对象的全栈练习项目，用于提交三级项目。前端为原生 HTML / CSS / JavaScript（不使用任何第三方库与 CDN），后端为 Node.js + Express（RESTful + MVC，接口统一 /api/ 前缀，端口 8302），数据库为 MySQL。

## 目录结构
```
zhy 24001010302/
├── frontend/            # 前端目录
│   ├── index.html       # 前端首页（页面链接导航 + canvas 背景动画）
│   ├── database.html    # 数据库连接测试页（知乎风格）
│   ├── css/             # 样式
│   ├── js/              # 脚本
│   ├── fonts/           # iconfont 图标（如有）
│   └── images/          # 图片素材
├── backend/             # 后端目录（Node.js + Express）
│   ├── app.js           # 后端入口
│   ├── config/          # 配置（数据库配置，读取 .env）
│   ├── routes/          # 路由
│   ├── controllers/     # 控制器
│   ├── yuan_interface.md# 接口记录（追加写入）
│   └── yuan_database.md # 数据库记录（追加写入，凭此可重建数据库）
├── run.bat              # 一键启动后端
├── yuanlei_prompt.md    # 开发指令记录（追加写入）
└── AGENTS.md            # 项目规则
```

## 运行方式
1. 双击根目录的 `run.bat`（或进入 backend/ 执行 `node app.js`）启动后端；
2. 浏览器访问 `http://localhost:8302/`（后端同时托管前端静态页面）。

## 注意事项
- 数据库凭据写在 `backend/.env`（已加入 .gitignore），不写入代码；
- 所有 CSS 类名、JS 变量/函数名、数据库表名与字段命名以 `yuan_` 开头；
- 每个文件头部包含注释块：姓名 | 学号 | 时间 | 大模型。
