// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
// 数据库配置：凭据从 backend/.env 读取（DB_USER、DB_PASSWORD、DB_HOST、DB_NAME），不在代码中硬编码
const yuan_path = require('path');
require('dotenv').config({ path: yuan_path.join(__dirname, '..', '.env') });

const yuan_dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yuan_zhihu'
};

module.exports = yuan_dbConfig;
