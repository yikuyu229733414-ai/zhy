// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
// 后端入口：Express（RESTful + MVC），接口统一 /api/ 前缀，端口 8302，
// express.static 托管 frontend/ 目录，支持所有跨域访问。
const yuan_path = require('path');
const yuan_express = require('express');
const yuan_cors = require('cors');
const yuan_dbRouter = require('./routes/yuan_dbRouter');
const yuan_kbRouter = require('./routes/yuan_kbRouter');
const yuan_aiRouter = require('./routes/yuan_aiRouter');
const yuan_reviewRouter = require('./routes/yuan_reviewRouter');
const yuan_mediaRouter = require('./routes/yuan_mediaRouter');
const yuan_userRouter = require('./routes/yuan_userRouter');
const yuan_adminRouter = require('./routes/yuan_adminRouter');
const yuan_adminController = require('./controllers/yuan_adminController');

const yuan_app = yuan_express();
const yuan_PORT = 8302;

// 支持所有跨域访问
yuan_app.use(yuan_cors());
yuan_app.use(yuan_express.json());
yuan_app.use(yuan_express.urlencoded({ extended: true }));

// 以 express.static 托管 frontend/ 目录
yuan_app.use(yuan_express.static(yuan_path.join(__dirname, '..', 'frontend')));

// 所有接口以 /api/ 为前缀
yuan_app.use('/api/db', yuan_dbRouter);
yuan_app.use('/api/kb', yuan_kbRouter);
yuan_app.use('/api/ai', yuan_aiRouter);
yuan_app.use('/api/review', yuan_reviewRouter);
yuan_app.use('/api/media', yuan_mediaRouter);
yuan_app.use('/api/user', yuan_userRouter);
yuan_app.use('/api/admin', yuan_adminRouter);

// 统一 404 处理（JSON 响应格式：code/msg/data）
yuan_app.use(function (yuan_req, yuan_res) {
    yuan_res.status(404).json({ code: 404, msg: '接口不存在：' + yuan_req.method + ' ' + yuan_req.originalUrl, data: null });
});

yuan_app.listen(yuan_PORT, function () {
    console.log('后端服务已启动：http://localhost:' + yuan_PORT);
    console.log('静态前端目录：' + yuan_path.join(__dirname, '..', 'frontend'));
    // 启动时初始化后台管理数据表与管理员账号（幂等）
    yuan_adminController.yuan_init().then(function () {
        console.log('【后台管理】数据表与管理员账号初始化完成');
    }).catch(function (yuan_err) {
        console.log('【后台管理】初始化失败：' + yuan_err.message);
    });
});
