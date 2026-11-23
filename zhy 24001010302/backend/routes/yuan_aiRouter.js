// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:02:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：AI 对话代理路由
// AI 对话路由（挂在 /api/ai 前缀下）
const yuan_express = require('express');
const yuan_router = yuan_express.Router();
const yuan_aiController = require('../controllers/yuan_aiController');

// 通用对话代理：POST /api/ai/chat
yuan_router.post('/chat', yuan_aiController.yuan_chat);

module.exports = yuan_router;
