// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:33:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：语音识别与图片识别路由
// 语音/图片识别路由（挂在 /api/media 前缀下）
const yuan_express = require('express');
const yuan_multer = require('multer');
const yuan_router = yuan_express.Router();
const yuan_mediaController = require('../controllers/yuan_mediaController');

// 内存存储文件上传（单文件，字段名 yuan_file，限制 20MB）
const yuan_upload = yuan_multer({
    storage: yuan_multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

// 语音识别：POST /api/media/asr
yuan_router.post('/asr', yuan_upload.single('yuan_file'), yuan_mediaController.yuan_asr);
// 图片识别：POST /api/media/vision
yuan_router.post('/vision', yuan_upload.single('yuan_file'), yuan_mediaController.yuan_vision);

module.exports = yuan_router;
