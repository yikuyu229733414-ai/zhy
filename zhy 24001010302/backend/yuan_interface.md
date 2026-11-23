<!-- 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro -->
# 接口记录（yuan_interface.md，追加写入，禁止覆盖已有内容）

## 2026-11-09 | POST /api/db/test — 测试数据库连接
- 接口路径：`/api/db/test`
- HTTP 方法：POST
- 请求参数（JSON 请求体）：
  ```json
  {
    "yuan_user": "root",
    "yuan_password": "root"
  }
  ```
  （两个字段均可省略；省略时使用 backend/.env 中的 DB_USER、DB_PASSWORD）
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "数据库连接成功",
    "data": {
      "yuan_host": "localhost",
      "yuan_database": "yuan_zhihu",
      "yuan_user": "root",
      "yuan_check": 2
    }
  }
  ```
- 响应格式（失败，code≠0）：
  ```json
  {
    "code": 1,
    "msg": "数据库连接失败：Access denied for user 'root'@'localhost' (using password: YES)",
    "data": null
  }
  ```
- 说明：连接服务器后自动执行 `CREATE DATABASE IF NOT EXISTS yuan_zhihu`（详见 yuan_database.md），再连接目标库执行 `SELECT 1 + 1` 验证连通性。
- 修改时间：2026-11-09

## 2026-11-12 | POST /api/kb/upload — 上传知识文件
- 接口路径：`/api/kb/upload`
- HTTP 方法：POST
- 请求参数（multipart/form-data）：字段名 `yuan_file`，上传文件（.txt / .pdf，≤20MB）
- 响应格式（成功，code=0）：
  ```json
  { "code": 0, "msg": "上传成功", "data": { "yuan_filename": "yuan_kb_product.txt", "yuan_chunks": 4 } }
  ```
- 响应格式（失败，code≠0）：
  ```json
  { "code": 1, "msg": "上传失败：...", "data": null }
  ```
- 说明：后端解析文件文本（TXT 原生读取、PDF 用 pdf-parse），按段落+固定长度切分后覆盖式入库（先 DELETE 同名再 INSERT）。
- 修改时间：2026-11-12

## 2026-11-12 | GET /api/kb/list — 知识库文件列表
- 接口路径：`/api/kb/list`
- HTTP 方法：GET
- 请求参数：无
- 响应格式（成功，code=0）：
  ```json
  { "code": 0, "msg": "查询成功", "data": [ { "yuan_filename": "yuan_kb_product.txt", "yuan_chunks": 4 } ] }
  ```
- 修改时间：2026-11-12

## 2026-11-12 | POST /api/kb/delete — 删除知识文件
- 接口路径：`/api/kb/delete`
- HTTP 方法：POST
- 请求参数（JSON 请求体）：
  ```json
  { "yuan_filename": "yuan_kb_product.txt" }
  ```
- 响应格式（成功，code=0）：
  ```json
  { "code": 0, "msg": "删除成功", "data": { "yuan_deleted": 4 } }
  ```
- 修改时间：2026-11-12

## 2026-11-12 | POST /api/kb/chat — 基于知识库的客服问答
- 接口路径：`/api/kb/chat`
- HTTP 方法：POST
- 请求参数（JSON 请求体）：
  ```json
  { "yuan_question": "知乎盐选会员有哪些权益？" }
  ```
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "回答成功",
    "data": {
      "yuan_answer": "……",
      "yuan_context": "检索到的知识库内容",
      "yuan_llmRequest": { "model": "deepseek-ai/DeepSeek-V4-Flash", "messages": [ "…" ] },
      "yuan_llmResponse": { "choices": [ "…" ] }
    }
  }
  ```
- 说明：后端检索知识库相关内容（关键词命中得分 Top 3），拼接 system 提示后调用 SiliconFlow 大模型，返回答案及「发送给 LLM 的请求」与「LLM 返回的数据」供前端控制台输出。
- 修改时间：2026-11-12

## 2026-11-16 | POST /api/ai/chat — 通用对话代理（中间层）
- 接口路径：`/api/ai/chat`
- HTTP 方法：POST
- 请求参数（JSON 请求体）：
  ```json
  { "yuan_messages": [ { "role": "system", "content": "你是一个乐于助人的中文助手。" }, { "role": "user", "content": "你好" } ] }
  ```
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "ok",
    "data": {
      "yuan_reply": "你好！有什么可以帮你的吗？",
      "yuan_llmRequest": { "model": "deepseek-ai/DeepSeek-V4-Flash", "messages": ["…"], "stream": false, "temperature": 0.7 },
      "yuan_llmResponse": { "choices": ["…"] }
    }
  }
  ```
- 响应格式（失败，code≠0）：
  ```json
  { "code": 2, "msg": "大模型接口错误：…", "data": null }
  ```
- 说明：前端只传 messages；后端从 backend/.env 读取 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL（见 config/yuan_llm.js）转发大模型，请求体与响应体打印到终端留证。chat.html 已改为调用本接口，前端不再出现 API Key。
- 修改时间：2026-11-16

## 2026-11-16 | GET /api/review/template — 下载 Excel 评论模板
- 接口路径：`/api/review/template`
- HTTP 方法：GET
- 请求参数：无
- 响应：直接下载 .xlsx 文件（商业评论模板.xlsx），工作表「商业评论」，第一行表头：A 列「编号」、B 列「评论内容」，后跟 3 行示例评论。
- 修改时间：2026-11-16

## 2026-11-16 | POST /api/review/upload — 上传 Excel 商业评论并解析
- 接口路径：`/api/review/upload`
- HTTP 方法：POST
- 请求参数（multipart/form-data）：字段名 `yuan_file`，上传文件（.xlsx / .xls，≤10MB）
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "解析成功",
    "data": {
      "yuan_filename": "yuan_review_food.xlsx",
      "yuan_total": 20,
      "yuan_comments": ["牛肉面分量超足……", "好评", "……"]
    }
  }
  ```
- 响应格式（失败，code≠0）：
  ```json
  { "code": 1, "msg": "仅支持 .xlsx / .xls 格式的 Excel 文件", "data": null }
  ```
- 说明：后端用 xlsx 解析首个工作表；表头行（首 5 行内含「评论」字样的列）定位评论列，无表头时取 B 列；跳过空行，单次最多 200 条。
- 修改时间：2026-11-16

## 2026-11-16 | POST /api/review/analyze — 商业评论 LLM 评价（好评/中评/差评 + 有价值）
- 接口路径：`/api/review/analyze`
- HTTP 方法：POST
- 请求参数（JSON 请求体）：
  ```json
  { "yuan_comments": ["牛肉面分量超足……", "好评", "……"] }
  ```
- 返回 JSON 数据结构（先设计好的结构化输出，单条结果）：
  ```json
  {
    "id": 1,
    "text": "评论原文",
    "sentiment": "positive",
    "confidence": 0.93,
    "aspects": ["物流", "包装"],
    "entities": [{ "name": "某某品牌", "type": "brand" }],
    "summary": "整体满意，物流较慢。",
    "valuable": true,
    "valuable_reason": "指出具体物流问题，有参考价值",
    "need_review": false
  }
  ```
  字段约定：`sentiment` 只能取 `positive`（好评）/ `neutral`（中评）/ `negative`（差评）；`confidence` 为 0~1；`aspects` 为 0~3 个维度；`entities[].type` 取 `brand/product/store/service/other`；`valuable` 表示是否为有价值的评论（含具体问题/建议/细节）；`need_review` 低置信度（confidence<0.6）时为 true，标记人工复核。
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "分析完成",
    "data": {
      "yuan_results": [ { "id": 1, "text": "…", "sentiment": "positive", "confidence": 0.93, "aspects": ["物流"], "entities": [], "summary": "…", "valuable": true, "valuable_reason": "…", "need_review": false } ],
      "yuan_summary": { "yuan_total": 20, "yuan_positive": 8, "yuan_neutral": 6, "yuan_negative": 6, "yuan_valuable": 15, "yuan_needReview": 0 },
      "yuan_llmRequests": [ { "model": "deepseek-ai/DeepSeek-V4-Flash", "messages": ["…"] } ],
      "yuan_llmResponses": [ { "choices": ["…"] } ]
    }
  }
  ```
- 响应格式（失败，code≠0）：
  ```json
  { "code": 2, "msg": "大模型调用失败：…", "data": null }
  ```
- 说明：Harness Engineering 结构化输出。system 提示词包含角色设定、判断标准、输出格式与少样本示例；每 10 条评论一批调用大模型（temperature 0.2）；后端解析 JSON 数组并逐字段做类型校验与修复（不信任模型输出），解析失败自动重试 1 次，仍失败返回兜底结果并标记 `need_review=true`，全部批次失败则返回 code=2。请求体与响应体打印到终端留证。
- 修改时间：2026-11-16

## 2026-11-16 | POST /api/media/asr — 语音识别（Qwen ASR）
- 接口路径：`/api/media/asr`
- HTTP 方法：POST
- 请求参数（multipart/form-data）：字段名 `yuan_file`，上传音频文件（wav / mp3 / m4a / flac / ogg / webm 等，≤20MB）
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "识别成功",
    "data": {
      "yuan_filename": "yuan_test_asr.wav",
      "yuan_text": "你好，这是一条语音识别测试。",
      "yuan_model": "Qwen/Qwen3-ASR-1.7B",
      "yuan_response": { "text": "你好，这是一条语音识别测试。", "usage": { "type": "duration", "seconds": 4 }, "language": "Chinese" }
    }
  }
  ```
- 响应格式（失败，code≠0）：
  ```json
  { "code": 1, "msg": "语音识别失败：…", "data": null }
  ```
- 说明：后端用 multer 接收音频，转成 Blob 后以 multipart 方式转发硅基流动 `POST /v1/audio/transcriptions`（model=Qwen/Qwen3-ASR-1.7B，见 .env 的 ASR_MODEL），返回 `{"text":"…"}`。请求元信息与响应体打印到后端终端留证。前端 media.html 调用本接口。
- 修改时间：2026-11-16

## 2026-11-16 | POST /api/media/vision — 图片识别（DeepSeek V4.1-Flash 视觉）
- 接口路径：`/api/media/vision`
- HTTP 方法：POST
- 请求参数（multipart/form-data）：字段名 `yuan_file`，上传图片文件（png / jpg / jpeg / gif / webp / bmp，≤20MB）
- 响应格式（成功，code=0）：
  ```json
  {
    "code": 0,
    "msg": "识别成功",
    "data": {
      "yuan_filename": "yuan_test_vision.png",
      "yuan_answer": "图片描述与图中文字完整转写……",
      "yuan_model": "deepseek-ai/DeepSeek-V4.1-Flash",
      "yuan_llmRequest": { "model": "deepseek-ai/DeepSeek-V4.1-Flash", "messages": ["…"], "stream": false, "temperature": 0.3 },
      "yuan_llmResponse": { "choices": ["…"] }
    }
  }
  ```
- 响应格式（失败，code≠0）：
  ```json
  { "code": 1, "msg": "图片识别失败：…", "data": null }
  ```
- 说明：后端把图片转成 base64 data URL，走 SiliconFlow `POST /v1/chat/completions` 图片输入（content 为 image_url + text），模型 deepseek-ai/DeepSeek-V4.1-Flash（见 .env 的 VISION_MODEL），提示词要求描述图片内容并完整转写图中文字。请求（base64 截前 80 字符打印）与响应体打印到后端终端留证。前端 media.html 调用本接口。
- 修改时间：2026-11-16

## 2026-11-19 | 登录与注册接口（/api/user/*）
- 接口路径：
  - GET `/api/user/captcha` — 获取图形验证码
  - POST `/api/user/register` — 注册
  - POST `/api/user/login` — 登录
  - GET `/api/user/me` — 当前登录用户（登录状态保持）
  - POST `/api/user/logout` — 退出登录
- GET /api/user/captcha 响应（code=0）：
  ```json
  { "code": 0, "msg": "ok", "data": { "yuan_captchaId": "随机id", "yuan_captchaSvg": "<svg>…</svg>" } }
  ```
- POST /api/user/register 请求（JSON）：
  ```json
  { "yuan_username": "zhanghy", "yuan_nickname": "张浩扬", "yuan_password": "123456", "yuan_captchaId": "…", "yuan_captchaCode": "A3BC" }
  ```
- POST /api/user/register 响应（成功，code=0）：
  ```json
  { "code": 0, "msg": "注册成功", "data": { "yuan_username": "zhanghy", "yuan_nickname": "张浩扬" } }
  ```
- POST /api/user/login 请求：同注册（yuan_nickname 可省略）；响应（成功，code=0）：
  ```json
  { "code": 0, "msg": "登录成功", "data": { "yuan_token": "随机token", "yuan_username": "zhanghy", "yuan_nickname": "张浩扬" } }
  ```
- GET /api/user/me 请求：请求头 `Authorization: Bearer <token>`（或 ?yuan_token=）；响应（成功）：
  ```json
  { "code": 0, "msg": "ok", "data": { "yuan_username": "zhanghy", "yuan_nickname": "张浩扬" } }
  ```
- POST /api/user/logout 响应（成功）：`{ "code": 0, "msg": "已退出登录", "data": null }`
- 响应格式（失败，code≠0）：`{ "code": 1, "msg": "用户名或密码错误", "data": null }`
- 说明：
  1. 高阶功能一：密码加密存储 —— sha256(盐 + 明文) 后入库（yuan_user.yuan_password 只存 64 位十六进制密文）；
  2. 高阶功能二：图形验证码 —— 后端原生拼 SVG 生成 4 位验证码（内存 Map，5 分钟过期，校验后即失效），登录/注册均须校验；
  3. 登录状态保持 —— 登录成功签发随机 token 存入 yuan_user.yuan_token，前端存 localStorage，/api/user/me 按 token 校验；
  4. 表单校验前后端双端执行（用户名 3~20 位、密码 6~20 位、注册两次密码一致），前端另有自定义 CSS 动画（入场渐入、报错抖动、按钮悬停上浮等）。
- 前端页面：login.html（登录）、register.html（注册），接口请求与响应均输出到浏览器控制台与后端终端。
- 修改时间：2026-11-19

---

# 后台管理接口（/api/admin）—— 2026-11-19 新增

- 前端页面：admin.html（左右布局：左侧菜单栏 + 右侧内容区），css/yuan_admin.css、js/yuan_admin.js。
- 管理实体（对应数据库 3 张表）：yuan_user（用户）、yuan_question（问题）、yuan_answer（回答）；服务启动自动建表并初始化管理员账号 admin / 123456 与演示数据。
- 鉴权拦截（中间件）：所有 /api/admin/* 请求须携带 `Authorization: Bearer <token>`（登录接口签发），且账号 yuan_role='admin'；
  未登录返回 `{ "code": 401, "msg": "未登录：请先登录管理员账号", "data": null }`，token 失效返回 401 "登录已失效"，非管理员返回 401 "无权限：仅管理员可访问后台管理"。

## 仪表盘统计（真实数据，MySQL 聚合）
- GET /api/admin/stats 响应（成功）：
  `json
  { "code": 0, "msg": "ok", "data": { "yuan_totals": { "yuan_user": 4, "yuan_question": 10, "yuan_answer": 12 }, "yuan_userTrend": [ { "yuan_day": "2026-11-19", "yuan_count": 4 } ], "yuan_questionTop": [ { "yuan_title": "……", "yuan_views": 3402 } ], "yuan_roleDist": [ { "yuan_role": "普通用户", "yuan_count": 3 }, { "yuan_role": "管理员", "yuan_count": 1 } ] } }
  `
- 前端用原生 Canvas 绘制 4 个图表（不依赖任何第三方库）：折线图=最近 7 天注册趋势、柱状图=三实体数量对比、饼图=问题浏览量 Top5、环形图=用户角色分布，全部由上述接口真实数据驱动。

## 实体增删改查（<entity> 取值：yuan_user / yuan_question / yuan_answer，白名单校验防注入）
- GET /api/admin/<entity>/list?yuan_keyword=&yuan_page=1&yuan_pageSize=10 —— 列表查询（搜索 + 分页），响应：
  `json
  { "code": 0, "msg": "ok", "data": { "yuan_total": 10, "yuan_page": 1, "yuan_pageSize": 10, "yuan_list": [ { "yuan_id": 1, "……": "……" } ] } }
  `
  （yuan_user 列表与详情不返回密码和 token；搜索按各实体关键字 LIKE 匹配）
- GET /api/admin/<entity>/:id —— 详情查询，响应 data 为完整记录（覆盖列表之外的全部主要字段）。
- POST /api/admin/<entity> —— 新增，请求体为实体字段（用户：yuan_username/yuan_password/yuan_nickname/yuan_role；问题：yuan_title/yuan_content/yuan_author/yuan_views；回答：yuan_question_id/yuan_content/yuan_author/yuan_votes）；用户密码 sha256 加盐加密入库。
- PUT /api/admin/<entity>/:id —— 修改（提交需要修改的字段即可，用户密码留空不修改）。
- DELETE /api/admin/<entity>/:id —— 删除（保护：不能删除当前登录的管理员自己）。
- 响应格式：成功 `{ "code": 0, "msg": "用户新增成功", "data": null }`；失败 `{ "code": 1, "msg": "错误原因", "data": null }`。
- 请求与响应均输出到浏览器控制台与后端终端。
- 新增/修改时间：2026-11-19
