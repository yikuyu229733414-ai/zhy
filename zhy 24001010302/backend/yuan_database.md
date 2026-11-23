<!-- 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro -->
# 数据库操作记录（yuan_database.md，按执行顺序追加，禁止覆盖已有内容）

> 说明：本文件按执行顺序记录建库、建表、改表与测试数据 INSERT 语句，凭此文件即可在新机器上完整重建数据库。

## 2026-11-09 | 首次数据库连接测试（自动建库）
```sql
CREATE DATABASE IF NOT EXISTS `yuan_zhihu` DEFAULT CHARACTER SET utf8mb4;
```
- 执行方式：由接口 `POST /api/db/test` 在连接测试时自动执行（幂等，可重复执行）；
- 后续建表 / 改表 / 测试数据 INSERT 按执行顺序依次追加在本文件下方（每张表建立后插入至少 8 条有真实业务意义的测试数据）。

## 2026-11-12 | 知识库分块存储表（RAG 知识库）
```sql
CREATE TABLE IF NOT EXISTS `yuan_knowledge_base` (
  `yuan_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  `yuan_filename` VARCHAR(255) NOT NULL COMMENT '文件名',
  `yuan_chunk_index` INT NOT NULL DEFAULT 0 COMMENT '分块序号',
  `yuan_content` TEXT NOT NULL COMMENT '分块内容',
  `yuan_created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文件分块存储表';
```
- 执行方式：由知识库接口（POST /api/kb/upload、GET /api/kb/list、POST /api/kb/delete、POST /api/kb/chat）在首次调用时自动执行 `CREATE TABLE IF NOT EXISTS`（幂等，可重复执行）；
- 说明：上传知识文件时按段落 + 固定长度切分文本，逐块 INSERT；同文件名覆盖式更新（先 DELETE 再 INSERT）。
