// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-12 | 大模型：DeepSeek-V4-Pro 正式版
// 知识库路由（RESTful 风格，挂在 /api/kb 前缀下）
const yuan_express = require('express');
const yuan_multer = require('multer');
const yuan_router = yuan_express.Router();
const yuan_kbController = require('../controllers/yuan_kbController');

// 内存存储文件上传（单文件，字段名 yuan_file，限制 20MB）
const yuan_upload = yuan_multer({
    storage: yuan_multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

// 上传知识文件：POST /api/kb/upload
yuan_router.post('/upload', yuan_upload.single('yuan_file'), yuan_kbController.yuan_upload);
// 知识库文件列表：GET /api/kb/list
yuan_router.get('/list', yuan_kbController.yuan_list);
// 删除知识文件：POST /api/kb/delete
yuan_router.post('/delete', yuan_kbController.yuan_delete);
// 客服问答：POST /api/kb/chat
yuan_router.post('/chat', yuan_kbController.yuan_chat);

module.exports = yuan_router;
