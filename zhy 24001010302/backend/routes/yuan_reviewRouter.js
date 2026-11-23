// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:02:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：商业评论分析路由
// 商业评论路由（挂在 /api/review 前缀下）
const yuan_express = require('express');
const yuan_multer = require('multer');
const yuan_router = yuan_express.Router();
const yuan_reviewController = require('../controllers/yuan_reviewController');

// 内存存储文件上传（单文件，字段名 yuan_file，限制 10MB）
const yuan_upload = yuan_multer({
    storage: yuan_multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// 下载 Excel 评论模板：GET /api/review/template
yuan_router.get('/template', yuan_reviewController.yuan_template);
// 上传 Excel 评论文件并解析：POST /api/review/upload
yuan_router.post('/upload', yuan_upload.single('yuan_file'), yuan_reviewController.yuan_upload);
// 逐条调用大模型评价（好评/中评/差评 + 有价值标记）：POST /api/review/analyze
yuan_router.post('/analyze', yuan_reviewController.yuan_analyze);

module.exports = yuan_router;
