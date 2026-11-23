// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-19 13:36:32 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：登录与注册路由（/api/user）
const yuan_express = require('express');
const yuan_userController = require('../controllers/yuan_userController');

const yuan_router = yuan_express.Router();

// GET /api/user/captcha —— 图形验证码
yuan_router.get('/captcha', yuan_userController.yuan_captcha);
// POST /api/user/register —— 注册
yuan_router.post('/register', yuan_userController.yuan_register);
// POST /api/user/login —— 登录
yuan_router.post('/login', yuan_userController.yuan_login);
// GET /api/user/me —— 当前登录用户（登录状态保持验证）
yuan_router.get('/me', yuan_userController.yuan_me);
// POST /api/user/logout —— 退出登录
yuan_router.post('/logout', yuan_userController.yuan_logout);

module.exports = yuan_router;
