// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-19 14:29:19 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：后台管理路由（/api/admin），所有接口先经管理员鉴权拦截（未登录/非管理员返回 401）
const yuan_express = require('express');
const yuan_adminController = require('../controllers/yuan_adminController');

const yuan_router = yuan_express.Router();

// 鉴权拦截：未登录访问任何管理接口都会被拒绝
yuan_router.use(yuan_adminController.yuan_adminAuth);

// GET /api/admin/stats —— 仪表盘统计数据（真实数据库聚合）
yuan_router.get('/stats', yuan_adminController.yuan_stats);
// GET /api/admin/:yuan_entity/list —— 列表查询（搜索 + 分页）
yuan_router.get('/:yuan_entity/list', yuan_adminController.yuan_list);
// GET /api/admin/:yuan_entity/:yuan_id —— 详情查询
yuan_router.get('/:yuan_entity/:yuan_id', yuan_adminController.yuan_detail);
// POST /api/admin/:yuan_entity —— 新增
yuan_router.post('/:yuan_entity', yuan_adminController.yuan_create);
// PUT /api/admin/:yuan_entity/:yuan_id —— 修改
yuan_router.put('/:yuan_entity/:yuan_id', yuan_adminController.yuan_update);
// DELETE /api/admin/:yuan_entity/:yuan_id —— 删除
yuan_router.delete('/:yuan_entity/:yuan_id', yuan_adminController.yuan_remove);

module.exports = yuan_router;
