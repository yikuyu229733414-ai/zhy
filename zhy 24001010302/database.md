# 数据库信息 · 新闻列表（Supabase）

<!-- 姓名：张浩扬  建立时间：2026-11-26  使用模型：MiMo-V2.6-Pro  功能：新闻列表数据库信息记录 -->

## 一、Supabase 项目信息

| 项目 | 值 |
| --- | --- |
| 项目名称 | pmzmsfapckfnzocnarvm |
| Project Ref | `pmzmsfapckfnzocnarvm` |
| Project URL | `https://pmzmsfapckfnzocnarvm.supabase.co` |
| 数据库 | Supabase 托管 PostgreSQL（public schema） |
| 管理方式 | Supabase MCP（`https://mcp.supabase.com/mcp?project_ref=pmzmsfapckfnzocnarvm`） |
| 前端访问密钥 | publishable key：`sb_publishable_5SXAw8K1mM9yQ1glv4ZoIA_o4XWubx2`（仅可公开使用的发布密钥，未使用 service_role） |

## 二、前端访问方式

- 库文件：`frontend/js/supabase.js`（supabase-js v2.119.2 UMD，已由 CDN 下载到本地，**不使用任何外链 CDN**）。
- 页面：`frontend/news.html`，通过本地 `<script src="./js/supabase.js">` 引入，`window.supabase.createClient(yl_SUPABASE_URL, yl_SUPABASE_ANON_KEY)` 创建客户端。
- 连接配置位置：`news.html` 内 `<script>` 开头常量（约第 339–341 行）：
  - `yl_SUPABASE_URL`：Project URL
  - `yl_SUPABASE_ANON_KEY`：publishable key
  - `yl_tableName = 'yl_news'`

## 三、数据表：yl_news

表名、字段名均以 `yl_` 开头（符合命名规范）。共 **20 条**有意义的中文新闻模拟数据。

| 字段 | 类型 | 约束 / 默认值 | 说明 |
| --- | --- | --- | --- |
| yl_id | bigint identity | 主键，自增 | 新闻编号 |
| yl_title | text | not null | 标题 |
| yl_summary | text | not null | 摘要（列表页两行截断显示） |
| yl_content | text | not null | 正文（点击"展开全文"显示） |
| yl_category | text | not null，check 八类 | 分类：科技 / 财经 / 教育 / 体育 / 文化 / 健康 / 国际 / 社会 |
| yl_author | text | not null，默认 '新闻中心' | 来源 / 作者 |
| yl_views | integer | not null，默认 0 | 浏览量（用于排序） |
| yl_is_top | boolean | not null，默认 false | 是否置顶 |
| yl_published_at | timestamptz | not null，默认 now() | 发布时间（用于排序） |
| yl_created_at | timestamptz | not null，默认 now() | 记录创建时间 |

索引：

- `yl_news_published_idx`：yl_published_at 降序（按时间排序）
- `yl_news_category_idx`：yl_category（按分类筛选）

## 四、行级安全（RLS）与权限

- 已启用 RLS（`alter table public.yl_news enable row level security`）。
- 策略 `yl_news_public_select`：`for select to anon, authenticated using (true)` —— 新闻为只读展示，允许匿名 / 登录用户读取全部行。
- 仅授予 `select` 权限给 `anon, authenticated`，无任何写入权限（前端只读）。

## 五、20 条模拟数据说明

| 分类 | 条数 | 示例标题 |
| --- | --- | --- |
| 科技 | 4 | 国产大模型迈入多模态时代（置顶）、量子计算原型机刷新纪录、低空经济起飞、RISC-V 生态加速成熟 |
| 财经 | 3 | 央行宣布定向降准、新能源汽车年产量首破千万辆、双十一全网成交额创新高 |
| 教育 | 3 | 高校人工智能教育白皮书（置顶）、"本研贯通"培养试点、产教融合基地落地 |
| 体育 | 2 | 中国女排逆转夺冠、北京马拉松鸣枪开跑 |
| 文化 | 2 | 故宫数字化工程新进展、话剧《山河故人》巡演百场 |
| 健康 | 2 | 秋冬呼吸道疾病防护指南、"体医融合"运动处方试点 |
| 国际 | 2 | 联合国气候大会闭幕、中欧班列开行突破新里程 |
| 社会 | 2 | 社区养老服务升级、城市"青年夜校"火爆 |

- 共 20 条，其中置顶（yl_is_top = true）2 条：「国产大模型迈入多模态时代」「教育部发布高校人工智能教育白皮书」。
- 发布时间分布在 2026-10-28 ~ 2026-11-22，浏览量 6,740 ~ 28,640 不等，均为真实感中文新闻。

## 六、建表 SQL 摘要

通过 Supabase MCP 执行：

1. `apply_migration`（迁移名 `create_yl_news_table`）：建表 + 2 个索引 + 启用 RLS + 创建公开读取策略 + grant select。
2. `execute_sql`：`insert into public.yl_news ... values` 插入 20 条模拟数据。

核心 DDL：

```sql
create table if not exists public.yl_news (
    yl_id           bigint generated always as identity primary key,
    yl_title        text        not null,
    yl_summary      text        not null,
    yl_content      text        not null,
    yl_category     text        not null check (yl_category in ('科技','财经','教育','体育','文化','健康','国际','社会')),
    yl_author       text        not null default '新闻中心',
    yl_views        integer     not null default 0,
    yl_is_top       boolean     not null default false,
    yl_published_at timestamptz not null default now(),
    yl_created_at   timestamptz not null default now()
);

alter table public.yl_news enable row level security;
create policy "yl_news_public_select" on public.yl_news
    for select to anon, authenticated using (true);
grant select on public.yl_news to anon, authenticated;
```

验证结果：`select count(*)` 返回 yl_total = 20，yl_top_count = 2，yl_cat_count = 8。

## 七、Edge Function：yl-ai-chat（AI 聊天，2026-11-26 新增）

| 项目 | 值 |
| --- | --- |
| 函数名称 | `yl-ai-chat`（status：ACTIVE） |
| 调用地址 | `https://pmzmsfapckfnzocnarvm.supabase.co/functions/v1/yl-ai-chat` |
| 请求方式 | POST（支持 OPTIONS CORS 预检），`verify_jwt: true` |
| 请求体 | `{ "messages": [{ "role": "user", "content": "你好" }] }`（多轮对话传完整历史） |
| 响应格式 | `{ "code": 0, "msg": "ok", "data": { "reply": "回答内容", "model": "deepseek-ai/DeepSeek-V4-Flash" } }` |
| 大模型 | SiliconFlow `https://api.siliconflow.cn/v1/chat/completions`，model=`deepseek-ai/DeepSeek-V4-Flash`，system=`你是一个有用的助手` |
| API Key | 仅保存在 Edge Function 服务端代码中（与 backend/.env 的 LLM_API_KEY 一致），前端不可见 |
| 前端页面 | `frontend/supabase-chat.html`，通过本地 supabase-js 的 `functions.invoke('yl-ai-chat')` 调用 |

说明：LLM 的 API 调用全部写在 Edge Function（TypeScript/Deno）内，云函数转发请求并返回 `reply`；
发送的提示词与接收的数据在云函数日志和浏览器控制台均有输出。
