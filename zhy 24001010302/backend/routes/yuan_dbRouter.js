// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
// 数据库相关路由（RESTful 风格，路径挂在 /api/db 前缀下）
const yuan_express = require('express');
const yuan_router = yuan_express.Router();
const yuan_dbController = require('../controllers/yuan_dbController');

// 测试数据库连接：POST /api/db/test
yuan_router.post('/test', yuan_dbController.yuan_testConnection);

module.exports = yuan_router;
