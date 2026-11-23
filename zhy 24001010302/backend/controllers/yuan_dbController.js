// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
// 数据库控制器：测试数据库连接（成功与失败均返回统一 JSON 格式 { code, msg, data }）
const yuan_mysql = require('mysql2/promise');
const yuan_dbConfig = require('../config/yuan_db');

// POST /api/db/test
// 请求体：{ "yuan_user": "root", "yuan_password": "root" }（可省略，省略时读取 backend/.env）
exports.yuan_testConnection = async function (yuan_req, yuan_res) {
    var yuan_user = (yuan_req.body && yuan_req.body.yuan_user) || yuan_dbConfig.user;
    var yuan_password = (yuan_req.body && yuan_req.body.yuan_password !== undefined && yuan_req.body.yuan_password !== '')
        ? yuan_req.body.yuan_password
        : yuan_dbConfig.password;
    var yuan_host = yuan_dbConfig.host;
    var yuan_dbName = yuan_dbConfig.database;

    var yuan_serverConn = null;
    var yuan_dbConn = null;
    try {
        // 1. 连接 MySQL 服务器（不指定数据库）
        yuan_serverConn = await yuan_mysql.createConnection({
            host: yuan_host,
            user: yuan_user,
            password: yuan_password,
            connectTimeout: 5000
        });

        // 2. 保证目标数据库存在（幂等，可重复执行）
        await yuan_serverConn.query(
            'CREATE DATABASE IF NOT EXISTS `' + yuan_dbName + '` DEFAULT CHARACTER SET utf8mb4'
        );
        await yuan_serverConn.end();
        yuan_serverConn = null;

        // 3. 连接目标数据库并执行测试查询
        yuan_dbConn = await yuan_mysql.createConnection({
            host: yuan_host,
            user: yuan_user,
            password: yuan_password,
            database: yuan_dbName,
            connectTimeout: 5000
        });
        var yuan_result = await yuan_dbConn.query('SELECT 1 + 1 AS yuan_check');
        await yuan_dbConn.end();
        yuan_dbConn = null;

        yuan_res.json({
            code: 0,
            msg: '数据库连接成功',
            data: {
                yuan_host: yuan_host,
                yuan_database: yuan_dbName,
                yuan_user: yuan_user,
                yuan_check: yuan_result[0][0].yuan_check
            }
        });
    } catch (yuan_err) {
        if (yuan_serverConn) { try { await yuan_serverConn.end(); } catch (yuan_closeErr1) { } }
        if (yuan_dbConn) { try { await yuan_dbConn.end(); } catch (yuan_closeErr2) { } }
        yuan_res.json({
            code: 1,
            msg: '数据库连接失败：' + yuan_err.message,
            data: null
        });
    }
};
