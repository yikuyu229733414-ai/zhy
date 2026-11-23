// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-19 13:36:32 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：登录与注册（图形验证码 + 密码加密存储 + token 保持登录状态）
// 控制器：注册 / 登录 / 退出 / 当前用户 / 图形验证码，接口统一 JSON：{ code, msg, data }
const yuan_crypto = require('crypto');
const yuan_mysql = require('mysql2/promise');
const yuan_dbConfig = require('../config/yuan_db');

// 数据库连接池
const yuan_pool = yuan_mysql.createPool(yuan_dbConfig);

// 密码加密存储：sha256(盐 + 明文密码)，数据库只存密文（高阶功能 1）
const yuan_salt = 'yuan_zhihu_salt_2026';
function yuan_hashPassword(yuan_plain) {
    return yuan_crypto.createHash('sha256').update(yuan_salt + String(yuan_plain)).digest('hex');
}

// 图形验证码：内存 Map，key=验证码 id，value={ code, expire }（高阶功能 2）
const yuan_captchaMap = new Map();

// 生成 4 位随机验证码（去掉易混淆字符）
function yuan_randomCode() {
    var yuan_chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var yuan_code = '';
    for (var yuan_i = 0; yuan_i < 4; yuan_i++) {
        yuan_code += yuan_chars.charAt(Math.floor(Math.random() * yuan_chars.length));
    }
    return yuan_code;
}

// 生成验证码 SVG 图片（原生拼 SVG，不依赖任何第三方库）
function yuan_captchaSvg(yuan_code) {
    var yuan_colors = ['#e03131', '#1971c2', '#2f9e44', '#e8590c', '#9c36b5'];
    var yuan_charsHtml = '';
    for (var yuan_i = 0; yuan_i < yuan_code.length; yuan_i++) {
        var yuan_x = 14 + yuan_i * 30;
        var yuan_y = 32 + Math.floor(Math.random() * 10 - 5);
        var yuan_rotate = Math.floor(Math.random() * 30 - 15);
        var yuan_color = yuan_colors[Math.floor(Math.random() * yuan_colors.length)];
        yuan_charsHtml += '<text x="' + yuan_x + '" y="' + yuan_y + '" fill="' + yuan_color + '" font-size="28" font-family="Arial" font-weight="bold" transform="rotate(' + yuan_rotate + ' ' + yuan_x + ' ' + yuan_y + ')">' + yuan_code.charAt(yuan_i) + '</text>';
    }
    // 干扰线
    var yuan_lines = '';
    for (var yuan_j = 0; yuan_j < 4; yuan_j++) {
        yuan_lines += '<line x1="' + Math.floor(Math.random() * 130) + '" y1="' + Math.floor(Math.random() * 48) + '" x2="' + Math.floor(Math.random() * 130) + '" y2="' + Math.floor(Math.random() * 48) + '" stroke="#c3cfdd" stroke-width="1"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="48">' +
        '<rect width="130" height="48" fill="#f1f5f9"/>' + yuan_lines + yuan_charsHtml + '</svg>';
}

// 校验并取出验证码（取出即失效，防重放）
function yuan_checkCaptcha(yuan_captchaId, yuan_captchaCode) {
    if (!yuan_captchaId || !yuan_captchaCode) { return '请填写图形验证码'; }
    var yuan_item = yuan_captchaMap.get(yuan_captchaId);
    yuan_captchaMap.delete(yuan_captchaId);
    if (!yuan_item || Date.now() > yuan_item.expire) { return '验证码已过期，请刷新验证码'; }
    if (String(yuan_item.code).toUpperCase() !== String(yuan_captchaCode).trim().toUpperCase()) { return '图形验证码错误'; }
    return '';
}

// 表单校验：用户名 3~20 位（字母/数字/中文/下划线），密码 6~20 位
function yuan_validateAccount(yuan_username, yuan_password) {
    if (!yuan_username) { return '请填写用户名'; }
    if (!/^[\w\u4e00-\u9fa5]{3,20}$/.test(yuan_username)) { return '用户名须为 3~20 位字母、数字、中文或下划线'; }
    if (!yuan_password) { return '请填写密码'; }
    if (yuan_password.length < 6 || yuan_password.length > 20) { return '密码长度须为 6~20 位'; }
    return '';
}

// 确保用户表存在（幂等）
async function yuan_ensureTable() {
    await yuan_pool.query(
        'CREATE TABLE IF NOT EXISTS `yuan_user` (' +
        '`yuan_id` INT AUTO_INCREMENT PRIMARY KEY,' +
        '`yuan_username` VARCHAR(50) NOT NULL UNIQUE,' +
        '`yuan_password` VARCHAR(64) NOT NULL,' +
        '`yuan_nickname` VARCHAR(50) DEFAULT NULL,' +
        '`yuan_token` VARCHAR(64) DEFAULT NULL,' +
        '`yuan_created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
}

// GET /api/user/captcha —— 获取图形验证码
exports.yuan_captcha = async function (yuan_req, yuan_res) {
    try {
        var yuan_code = yuan_randomCode();
        var yuan_id = yuan_crypto.randomBytes(16).toString('hex');
        yuan_captchaMap.set(yuan_id, { code: yuan_code, expire: Date.now() + 5 * 60 * 1000 });
        // 过期验证码清理
        yuan_captchaMap.forEach(function (yuan_v, yuan_k) {
            if (Date.now() > yuan_v.expire) { yuan_captchaMap.delete(yuan_k); }
        });
        var yuan_data = { yuan_captchaId: yuan_id, yuan_captchaSvg: yuan_captchaSvg(yuan_code) };
        console.log('===== /api/user/captcha 响应 =====\n' + JSON.stringify({ code: 0, msg: 'ok', data: { yuan_captchaId: yuan_id, yuan_captchaSvg: '（SVG 略）' } }, null, 2));
        yuan_res.json({ code: 0, msg: 'ok', data: yuan_data });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '验证码生成失败：' + yuan_err.message, data: null });
    }
};

// POST /api/user/register —— 注册
exports.yuan_register = async function (yuan_req, yuan_res) {
    try {
        console.log('===== /api/user/register 请求 =====\n' + JSON.stringify(yuan_req.body, null, 2));
        await yuan_ensureTable();
        var yuan_username = ((yuan_req.body && yuan_req.body.yuan_username) || '').trim();
        var yuan_password = (yuan_req.body && yuan_req.body.yuan_password) || '';
        var yuan_nickname = ((yuan_req.body && yuan_req.body.yuan_nickname) || '').trim() || yuan_username;
        var yuan_captchaId = (yuan_req.body && yuan_req.body.yuan_captchaId) || '';
        var yuan_captchaCode = (yuan_req.body && yuan_req.body.yuan_captchaCode) || '';

        var yuan_errMsg = yuan_validateAccount(yuan_username, yuan_password) || yuan_checkCaptcha(yuan_captchaId, yuan_captchaCode);
        if (yuan_errMsg) {
            console.log('===== /api/user/register 响应 =====\n' + JSON.stringify({ code: 1, msg: yuan_errMsg }, null, 2));
            return yuan_res.json({ code: 1, msg: yuan_errMsg, data: null });
        }

        var yuan_exist = await yuan_pool.query('SELECT yuan_id FROM yuan_user WHERE yuan_username = ?', [yuan_username]);
        if (yuan_exist[0].length > 0) {
            return yuan_res.json({ code: 1, msg: '该用户名已被注册', data: null });
        }

        // 密码加密存储（sha256 加盐），数据库不存明文
        var yuan_hash = yuan_hashPassword(yuan_password);
        await yuan_pool.query(
            'INSERT INTO yuan_user (yuan_username, yuan_password, yuan_nickname) VALUES (?, ?, ?)',
            [yuan_username, yuan_hash, yuan_nickname]
        );
        var yuan_result = { yuan_username: yuan_username, yuan_nickname: yuan_nickname };
        console.log('===== /api/user/register 响应 =====\n' + JSON.stringify({ code: 0, msg: '注册成功', data: yuan_result }, null, 2));
        yuan_res.json({ code: 0, msg: '注册成功', data: yuan_result });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '注册失败：' + yuan_err.message, data: null });
    }
};

// POST /api/user/login —— 登录（成功后签发 token，保持登录状态）
exports.yuan_login = async function (yuan_req, yuan_res) {
    try {
        console.log('===== /api/user/login 请求 =====\n' + JSON.stringify(yuan_req.body, null, 2));
        await yuan_ensureTable();
        var yuan_username = ((yuan_req.body && yuan_req.body.yuan_username) || '').trim();
        var yuan_password = (yuan_req.body && yuan_req.body.yuan_password) || '';
        var yuan_captchaId = (yuan_req.body && yuan_req.body.yuan_captchaId) || '';
        var yuan_captchaCode = (yuan_req.body && yuan_req.body.yuan_captchaCode) || '';

        var yuan_errMsg = yuan_validateAccount(yuan_username, yuan_password) || yuan_checkCaptcha(yuan_captchaId, yuan_captchaCode);
        if (yuan_errMsg) {
            console.log('===== /api/user/login 响应 =====\n' + JSON.stringify({ code: 1, msg: yuan_errMsg }, null, 2));
            return yuan_res.json({ code: 1, msg: yuan_errMsg, data: null });
        }

        // 用加密后的密码比对，而不是明文
        var yuan_hash = yuan_hashPassword(yuan_password);
        var yuan_rows = await yuan_pool.query(
            'SELECT yuan_id, yuan_username, yuan_nickname, yuan_role FROM yuan_user WHERE yuan_username = ? AND yuan_password = ?',
            [yuan_username, yuan_hash]
        );
        if (yuan_rows[0].length === 0) {
            return yuan_res.json({ code: 1, msg: '用户名或密码错误', data: null });
        }

        // 签发随机 token 并存入用户表（登录状态保持）
        var yuan_token = yuan_crypto.randomBytes(24).toString('hex');
        await yuan_pool.query('UPDATE yuan_user SET yuan_token = ? WHERE yuan_username = ?', [yuan_token, yuan_username]);

        var yuan_user = yuan_rows[0][0];
        var yuan_data = {
            yuan_token: yuan_token,
            yuan_username: yuan_user.yuan_username,
            yuan_nickname: yuan_user.yuan_nickname,
            yuan_role: yuan_user.yuan_role || 'user'
        };
        console.log('===== /api/user/login 响应 =====\n' + JSON.stringify({ code: 0, msg: '登录成功', data: yuan_data }, null, 2));
        yuan_res.json({ code: 0, msg: '登录成功', data: yuan_data });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '登录失败：' + yuan_err.message, data: null });
    }
};

// GET /api/user/me —— 查询当前登录用户（token 从请求头 Authorization: Bearer xxx 或 ?yuan_token= 取）
exports.yuan_me = async function (yuan_req, yuan_res) {
    try {
        var yuan_auth = yuan_req.headers['authorization'] || '';
        var yuan_token = yuan_auth.replace(/^Bearer\s+/i, '') || (yuan_req.query && yuan_req.query.yuan_token) || '';
        if (!yuan_token) {
            return yuan_res.json({ code: 1, msg: '未登录', data: null });
        }
        await yuan_ensureTable();
        var yuan_rows = await yuan_pool.query(
            'SELECT yuan_username, yuan_nickname, yuan_role FROM yuan_user WHERE yuan_token = ?',
            [yuan_token]
        );
        if (yuan_rows[0].length === 0) {
            return yuan_res.json({ code: 1, msg: '登录已失效，请重新登录', data: null });
        }
        var yuan_data = {
            yuan_username: yuan_rows[0][0].yuan_username,
            yuan_nickname: yuan_rows[0][0].yuan_nickname,
            yuan_role: yuan_rows[0][0].yuan_role || 'user'
        };
        console.log('===== /api/user/me 响应 =====\n' + JSON.stringify({ code: 0, msg: 'ok', data: yuan_data }, null, 2));
        yuan_res.json({ code: 0, msg: 'ok', data: yuan_data });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '查询失败：' + yuan_err.message, data: null });
    }
};

// POST /api/user/logout —— 退出登录（清除 token）
exports.yuan_logout = async function (yuan_req, yuan_res) {
    try {
        var yuan_auth = yuan_req.headers['authorization'] || '';
        var yuan_token = yuan_auth.replace(/^Bearer\s+/i, '') || (yuan_req.body && yuan_req.body.yuan_token) || '';
        if (yuan_token) {
            await yuan_ensureTable();
            await yuan_pool.query('UPDATE yuan_user SET yuan_token = NULL WHERE yuan_token = ?', [yuan_token]);
        }
        console.log('===== /api/user/logout 响应 =====\n' + JSON.stringify({ code: 0, msg: '已退出登录', data: null }, null, 2));
        yuan_res.json({ code: 0, msg: '已退出登录', data: null });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '退出失败：' + yuan_err.message, data: null });
    }
};
