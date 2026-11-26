<!-- 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro -->
# 开发指令记录（yuanlei_prompt.md，追加写入，禁止覆盖已有内容）

## 时间：2026-11-09 13:59:31
- 大模型名称：Xiaomi MiMo-V2.6-Pro
- 提示词全文：

)初始化项目。
git init +.gitignore(排除 node modules、.env)+首次提交
请初始化本项目:
创建前端首页index.html，包括姓名、学号、项目名称、项目类别(自选、模仿)，所有完成的
按 AGENTS.md 规则创建前后端目录骨架、安装依赖、
html页面的超链接。有canvas背景动画。主体是页面链接导航。页面美观。
1、创建readme.md，在根目录下，包括学号、姓名。
(三)运行和查看项目。
创建运行后台的bat文件，在根目录下。
(四)测试数据库链接(mysql数据库需要，sqllite不需要)。
建database.html页面，输入用户名，密码，链接数据库，成功和错误都有提示。主题还是知乎模仿界面用来提交三级项目

## 时间：2026-11-12 13:59:09
- 大模型名称：DeepSeek-V4-Pro 正式版
- 提示词全文：
在这个文件夹里的zhy 24001010302文件夹的完成一个chat.html内容是调用llm接口完成聊天功能，发送的提示词和接受的数据都在控制台输出。
API Key：sk-zfmutpyevsutuhotpplhgoyabvugkosfwbflauklbhyvglnx
接口地址（base_url）：https://api.siliconflow.cn/v1
模型（model）：deepseek-ai/DeepSeek-V4-Flash

## 时间：2026-11-12 14:39:57
- 大模型名称：DeepSeek-V4-Pro 正式版
- 提示词全文：
完成知识库上传页面，和基于知识库的客服页面，构建两个要上传的文件，要求如下，知识库管理(RAG):基于本地文件(如PDF/TXT)上传、解析，构建专属自动客服或问答系统，包括知识库文件上传模块。发送给lm和从Ilm获得的信息在控制台输出。

## 时间：2026-11-23 18:29:46
- 大模型名称：DeepSeek-V4-Pro 正式版
- 提示词全文：接着做（验证 RAG 知识库系统运行：启动后端、上传/列表/问答接口全流程跑通）

## 时间：2026-11-16 13:58:30
- 大模型名称：Xiaomi MiMo-V2.6-Pro
- 提示词全文：
完成商业评论的上传和llm惊醒评价功能上传到的是一个一个excel文件,里面有若干评论，格式自拟，上传商业评论后llm会对每一个评论进行判断：好评，中评，差评 ，将结果返回，前段以饼状图的形式显示，并显示有价值的评论在根目录下生成三个excel模拟数据，每个20条评论。可以下载excel模板，返回是json,格式确定好 做的时候再改改上次做是参考是d盘的wps里的LLM应用设计-实验指导书和LLM应用设计-项目报告


## 时间：2026-11-16 14:30:49
- 大模型名称：Xiaomi MiMo-V2.6-Pro
- 提示词全文：
识别语音用qwen-asr识图用deepseek v4.1flash这是我的deepseek和qwen的url相关截图新建一个网页可以做到语音和图片识别


---

## 2026-11-16 14:37:25 | 模型：Xiaomi MiMo-V2.6-Pro
识别语音用qwen-asr识图用deepseek v4.1flash这是我的deepseek和qwen的url相关截图新建一个网页可以做到语音和图片识别
（新增：backend/controllers/yuan_mediaController.js、backend/routes/yuan_mediaRouter.js、frontend/media.html、frontend/css/yuan_media.css、frontend/js/yuan_media.js；接口 /api/media/asr、/api/media/vision）

---

## 2026-11-19 13:36:32 | 模型：Xiaomi MiMo-V2.6-Pro
根据我的选题完成这个登录页面的任务在登录界面加些平滑动画
（新增登录/注册页面及接口：login.html、register.html、/api/user/*，密码加密存储 + 图形验证码 + token 登录状态保持，登录页平滑动画）

---

## 2026-11-19 14:29:19 | 模型：Xiaomi MiMo-V2.6-Pro
完成项目的后台管理页面，管理员登陆后可以登录后台管理，有仪表盘，左右形式，管理的实体是数据库里的表，评分标准:后台至少管理3个实体，每个实体具备增、删、改、查(列表)，并包含搜索、分页;管理页面覆盖列表与详情主要内容;未登录访问管理接口被拦截。扣分(实体管理组):管理实体不足3个每少1个扣1分;任一实体缺增/删/改/查任一项每缺1项扣 0.5 分;缺搜索或分页任一项扣1分;管理内容未覆盖列表或详情主要内容扣1分;鉴权失效(未登录可访问管理接口)扣1分;扣完为止。
具备仪表盘或其他适合使用图表的页面，合理选用图表展示数据，图表由后端接口真实数据驱动，图表与数据匹配、可读性
良好。扣分:后台无仪表盘页面扣1分;有仪表盘但无图表盘页面扣1分;有仪表盘但无图表扣2
分;图表无法显示扣2分;静态写死数据或截图
替代扣2分;图表与数据不匹配每处扣1分;可
读性差每处扣1分;扣完为止，

---

## 2026-11-23 13:27:46 | 模型：Xiaomi MiMo-V2.6-Pro
给我把zhy24001010302文件夹里的项目统合到上一个目录的总项目里上传到github再给我变成github网页的统合项目连接

## 2026-11-23 14:01:38 | 模型：Xiaomi MiMo-V2.6-Pro
现在回到zhy24001010302项目文件夹安装mcp:claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=pmzmsfapckfnzocnarvm&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cfeedback%2Cnotebooks" ,安装skill:npx skills add supabase/agent-skills

## 2026-11-23 14:23:26 | 模型：Xiaomi MiMo-V2.6-Pro
给我验证 superbase 和 trae 的验证 Authorize Trae

## 2026-11-23 14:37:27 | 模型：Xiaomi MiMo-V2.6-Pro
在trae里安装skill：npx skills add supabase/agent-skills

## 2026-11-23 14:48:31 | 模型：Xiaomi MiMo-V2.6-Pro
打开d盘的wps里的LLM应用设计-实验指导书和LLM应用设计-项目报告 根据我的项目完成这个项目报告 姓名 张浩扬 学号 24001010302

---
## 2026-11-26 13:37:24 | 模型：Xiaomi MiMo-V2.6-Pro
完成-个基于supabase的ai聊天功能，llm api调用写在edge function里，我的api-key是:******（对话中已脱敏，实际复用 backend/.env 保存的 LLM_API_KEY）。
curl 示例：POST https://api.siliconflow.cn/v1/chat/completions，model=deepseek-ai/DeepSeek-V4-Flash，
system=你是一个有用的助手，user=你好，请介绍一下你自己
