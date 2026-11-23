// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-19 14:29:19 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：后台管理控制器（管理员鉴权拦截 + 用户/问题/回答 3 个实体的增删改查 + 搜索 + 分页 + 仪表盘真实数据统计）
// 接口统一 JSON：{ code, msg, data }，请求与响应均输出到后端终端
const yuan_crypto = require('crypto');
const yuan_mysql = require('mysql2/promise');
const yuan_dbConfig = require('../config/yuan_db');

// 数据库连接池
const yuan_pool = yuan_mysql.createPool(yuan_dbConfig);

// 密码加密：sha256(盐 + 明文密码)，与登录注册保持同一套加密方式
const yuan_salt = 'yuan_zhihu_salt_2026';
function yuan_hashPassword(yuan_plain) {
    return yuan_crypto.createHash('sha256').update(yuan_salt + String(yuan_plain)).digest('hex');
}

// ============ 实体白名单（只允许管理以下 3 张表，防 SQL 注入） ============
// 每个实体：表名、中文名、搜索字段、可写字段、必填字段、列表展示字段
const yuan_entityMap = {
    yuan_user: {
        yuan_table: 'yuan_user',
        yuan_label: '用户',
        yuan_search: ['yuan_username', 'yuan_nickname'],
        yuan_writable: ['yuan_nickname', 'yuan_role', 'yuan_password'],
        yuan_required: { yuan_username: '用户名', yuan_password: '密码' },
        yuan_listSql: 'SELECT yuan_id, yuan_username, yuan_nickname, yuan_role, yuan_created_at FROM yuan_user',
        yuan_detailSql: 'SELECT yuan_id, yuan_username, yuan_nickname, yuan_role, yuan_created_at FROM yuan_user'
    },
    yuan_question: {
        yuan_table: 'yuan_question',
        yuan_label: '问题',
        yuan_search: ['yuan_title', 'yuan_author'],
        yuan_writable: ['yuan_title', 'yuan_content', 'yuan_author', 'yuan_views'],
        yuan_required: { yuan_title: '标题' },
        yuan_listSql: 'SELECT * FROM yuan_question',
        yuan_detailSql: 'SELECT * FROM yuan_question'
    },
    yuan_answer: {
        yuan_table: 'yuan_answer',
        yuan_label: '回答',
        yuan_search: ['yuan_content', 'yuan_author'],
        yuan_writable: ['yuan_question_id', 'yuan_content', 'yuan_author', 'yuan_votes'],
        yuan_required: { yuan_question_id: '所属问题 ID', yuan_content: '回答内容' },
        yuan_listSql: 'SELECT * FROM yuan_answer',
        yuan_detailSql: 'SELECT * FROM yuan_answer'
    }
};

// ============ 建表 + 种子数据（幂等） ============
async function yuan_ensureTables() {
    // 问题表
    await yuan_pool.query(
        'CREATE TABLE IF NOT EXISTS `yuan_question` (' +
        '`yuan_id` INT AUTO_INCREMENT PRIMARY KEY,' +
        '`yuan_title` VARCHAR(200) NOT NULL,' +
        '`yuan_content` TEXT,' +
        '`yuan_author` VARCHAR(50) DEFAULT \'匿名\',' +
        '`yuan_views` INT DEFAULT 0,' +
        '`yuan_created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    // 回答表
    await yuan_pool.query(
        'CREATE TABLE IF NOT EXISTS `yuan_answer` (' +
        '`yuan_id` INT AUTO_INCREMENT PRIMARY KEY,' +
        '`yuan_question_id` INT NOT NULL,' +
        '`yuan_content` TEXT,' +
        '`yuan_author` VARCHAR(50) DEFAULT \'匿名\',' +
        '`yuan_votes` INT DEFAULT 0,' +
        '`yuan_created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    // 用户表补 yuan_role 列（管理员/普通用户），已有则跳过
    var yuan_col = await yuan_pool.query(
        "SELECT COUNT(*) AS yuan_c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'yuan_user' AND COLUMN_NAME = 'yuan_role'"
    );
    if (Number(yuan_col[0][0].yuan_c) === 0) {
        await yuan_pool.query("ALTER TABLE `yuan_user` ADD COLUMN `yuan_role` VARCHAR(10) NOT NULL DEFAULT 'user'");
    }
    // 种子管理员账号：admin / 123456
    var yuan_admin = await yuan_pool.query("SELECT yuan_id FROM yuan_user WHERE yuan_username = 'admin'");
    if (yuan_admin[0].length === 0) {
        await yuan_pool.query(
            "INSERT INTO yuan_user (yuan_username, yuan_password, yuan_nickname, yuan_role) VALUES ('admin', ?, '超级管理员', 'admin')",
            [yuan_hashPassword('123456')]
        );
        console.log('【后台管理】已初始化管理员账号：admin / 123456');
    }
    // 种子演示数据：问题（表为空时写入 10 条）
    var yuan_qCount = await yuan_pool.query('SELECT COUNT(*) AS yuan_c FROM yuan_question');
    if (Number(yuan_qCount[0][0].yuan_c) === 0) {
        var yuan_questions = [
            ['如何评价 2026 年前端开发的就业前景？', '最近在找工作，想了解一下前端开发现在的行情如何，应该重点学习哪些技术？', '求职小白', 1286],
            ['自学编程有哪些高效的学习方法？', '非计算机专业，想转行做开发，希望大家分享一下自学路上的经验和踩过的坑。', '转行路上', 2310],
            ['Node.js 适合做大型项目吗？', '公司准备用 Node.js 做新项目后端，有点担心在高并发场景下的表现，有实际经验的朋友吗？', '后端老王', 986],
            ['MySQL 索引到底怎么优化？', '一张千万级数据的表查询很慢，加了索引也没明显效果，应该从哪些角度排查？', 'DBA 小陈', 1754],
            ['原生 JavaScript 还有必要深入学吗？', '现在框架这么多，Vue / React 用得很顺，还有必要花时间深入原生 JS 吗？', '前端学徒', 1120],
            ['大学生应该如何准备毕业设计？', '马上要开始毕业设计了，选题和时间安排上有什么建议？', '大三学生', 3402],
            ['CSS 布局有什么推荐的写法？', 'Flex 和 Grid 到底该怎么选？有没有一套通用的布局最佳实践？', '样式爱好者', 875],
            ['做项目时如何写出清晰的接口文档？', '团队协作中接口文档总是更新不及时，大家都是怎么管理接口文档的？', '项目组长', 654],
            ['为什么大家都说 Redis 快？', 'Redis 单线程为什么还能这么快？底层原理是什么？', '好奇宝宝', 1988],
            ['前端需要学习数据库知识吗？', '作为前端开发，需要花时间学 MySQL、Redis 这些后端技术吗？', '萌新前端', 1432]
        ];
        for (var yuan_i = 0; yuan_i < yuan_questions.length; yuan_i++) {
            await yuan_pool.query(
                'INSERT INTO yuan_question (yuan_title, yuan_content, yuan_author, yuan_views) VALUES (?, ?, ?, ?)',
                yuan_questions[yuan_i]
            );
        }
        console.log('【后台管理】已初始化演示问题数据：10 条');
    }
    // 种子演示数据：回答（表为空时写入 12 条）
    var yuan_aCount = await yuan_pool.query('SELECT COUNT(*) AS yuan_c FROM yuan_answer');
    if (Number(yuan_aCount[0][0].yuan_c) === 0) {
        var yuan_answers = [
            [1, '前端岗位竞争确实比前些年激烈，但掌握工程化 + 一到两个主流框架依然很有竞争力，建议多做项目。', '前端老兵', 326],
            [1, '现在更看重综合能力：性能优化、工程化、跨端能力，光会写页面已经不够了。', '面试官老张', 218],
            [2, '最高效的方法是做中学：定一个真实的小项目目标，遇到问题再针对性查资料，比纯看书记得牢。', '自学两年', 512],
            [2, '建议每天固定时间学习，加入学习社群互相监督，坚持三个月就能看到明显进步。', '自律达人', 188],
            [3, 'Node.js 做中小型项目完全没问题，大型项目要做好模块拆分和压力测试，我们公司线上跑了几百万日活。', '架构师李哥', 275],
            [4, '先用 EXPLAIN 看执行计划，确认索引有没有被用到，再看是不是隐式类型转换导致索引失效。', 'DBA 小陈', 431],
            [5, '非常有必要，框架的更新换代很快，原生 JS 扎实了学任何框架都快。', '前端学徒', 264],
            [6, '选题尽量结合实际需求，早开题、早动手，给调试和写论文留出充足时间。', '答辩通过', 398],
            [7, '一维布局用 Flex，二维布局用 Grid，实际项目里两者经常配合使用。', '样式爱好者', 156],
            [8, '推荐接口文档随代码一起维护，用注释生成文档，改代码时顺手更新文档。', '项目组长', 143],
            [9, '一是纯内存操作，二是单线程避免了上下文切换和锁竞争，三是 IO 多路复用。', '好奇宝宝', 352],
            [10, '建议至少了解数据库基本原理和 SQL，前后端联调排查问题时会省很多时间。', '全栈小吴', 197]
        ];
        for (var yuan_j = 0; yuan_j < yuan_answers.length; yuan_j++) {
            await yuan_pool.query(
                'INSERT INTO yuan_answer (yuan_question_id, yuan_content, yuan_author, yuan_votes) VALUES (?, ?, ?, ?)',
                yuan_answers[yuan_j]
            );
        }
        console.log('【后台管理】已初始化演示回答数据：12 条');
    }
}

// 导出初始化方法：服务启动时建表 + 种子数据（保证管理员账号在登录前已存在）
exports.yuan_init = yuan_ensureTables;

// ============ 管理员鉴权中间件：未登录或非管理员一律拦截 ============
exports.yuan_adminAuth = async function (yuan_req, yuan_res, yuan_next) {
    try {
        var yuan_auth = yuan_req.headers['authorization'] || '';
        var yuan_token = yuan_auth.replace(/^Bearer\s+/i, '') || (yuan_req.query && yuan_req.query.yuan_token) || '';
        if (!yuan_token) {
            console.log('【后台管理】拦截：未携带 token 访问 ' + yuan_req.method + ' ' + yuan_req.originalUrl);
            return yuan_res.json({ code: 401, msg: '未登录：请先登录管理员账号', data: null });
        }
        await yuan_ensureTables();
        var yuan_rows = await yuan_pool.query(
            "SELECT yuan_id, yuan_username, yuan_nickname, yuan_role FROM yuan_user WHERE yuan_token = ?",
            [yuan_token]
        );
        if (yuan_rows[0].length === 0) {
            console.log('【后台管理】拦截：token 已失效 ' + yuan_req.method + ' ' + yuan_req.originalUrl);
            return yuan_res.json({ code: 401, msg: '登录已失效：请重新登录', data: null });
        }
        if (yuan_rows[0][0].yuan_role !== 'admin') {
            console.log('【后台管理】拦截：非管理员账号 ' + yuan_rows[0][0].yuan_username);
            return yuan_res.json({ code: 401, msg: '无权限：仅管理员可访问后台管理', data: null });
        }
        // 把当前管理员信息挂到 req 上，供后续删除保护等使用
        yuan_req.yuan_adminUser = yuan_rows[0][0];
        yuan_next();
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '鉴权失败：' + yuan_err.message, data: null });
    }
};

// 解析分页参数（默认第 1 页、每页 10 条）
function yuan_parsePage(yuan_query) {
    var yuan_page = parseInt(yuan_query && yuan_query.yuan_page, 10);
    var yuan_pageSize = parseInt(yuan_query && yuan_query.yuan_pageSize, 10);
    if (!yuan_page || yuan_page < 1) { yuan_page = 1; }
    if (!yuan_pageSize || yuan_pageSize < 1) { yuan_pageSize = 10; }
    if (yuan_pageSize > 100) { yuan_pageSize = 100; }
    return { yuan_page: yuan_page, yuan_pageSize: yuan_pageSize };
}

// ============ 仪表盘统计：全部由数据库实时聚合计算（真实数据） ============
// GET /api/admin/stats
exports.yuan_stats = async function (yuan_req, yuan_res) {
    try {
        console.log('===== /api/admin/stats 请求 =====');
        await yuan_ensureTables();

        // 1）三个实体的总数
        var yuan_totalRows = await yuan_pool.query(
            'SELECT (SELECT COUNT(*) FROM yuan_user) AS yuan_userCount,' +
            '(SELECT COUNT(*) FROM yuan_question) AS yuan_questionCount,' +
            '(SELECT COUNT(*) FROM yuan_answer) AS yuan_answerCount'
        );
        var yuan_totals = {
            yuan_user: Number(yuan_totalRows[0][0].yuan_userCount),
            yuan_question: Number(yuan_totalRows[0][0].yuan_questionCount),
            yuan_answer: Number(yuan_totalRows[0][0].yuan_answerCount)
        };

        // 2）最近 7 天用户注册趋势（折线图数据）
        var yuan_trendRows = await yuan_pool.query(
            'SELECT DATE(yuan_created_at) AS yuan_day, COUNT(*) AS yuan_count FROM yuan_user ' +
            'WHERE yuan_created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(yuan_created_at)'
        );
        var yuan_trendMap = {};
        for (var yuan_t = 0; yuan_t < yuan_trendRows[0].length; yuan_t++) {
            var yuan_row = yuan_trendRows[0][yuan_t];
            var yuan_d = new Date(yuan_row.yuan_day);
            yuan_trendMap[yuan_d.getFullYear() + '-' + String(yuan_d.getMonth() + 1).padStart(2, '0') + '-' + String(yuan_d.getDate()).padStart(2, '0')] = Number(yuan_row.yuan_count);
        }
        var yuan_userTrend = [];
        for (var yuan_i = 6; yuan_i >= 0; yuan_i--) {
            var yuan_day = new Date(Date.now() - yuan_i * 24 * 60 * 60 * 1000);
            var yuan_key = yuan_day.getFullYear() + '-' + String(yuan_day.getMonth() + 1).padStart(2, '0') + '-' + String(yuan_day.getDate()).padStart(2, '0');
            yuan_userTrend.push({ yuan_day: yuan_key, yuan_count: yuan_trendMap[yuan_key] || 0 });
        }

        // 3）问题浏览量 Top5（饼图数据）
        var yuan_topRows = await yuan_pool.query(
            'SELECT yuan_title, yuan_views FROM yuan_question ORDER BY yuan_views DESC LIMIT 5'
        );
        var yuan_questionTop = [];
        for (var yuan_j = 0; yuan_j < yuan_topRows[0].length; yuan_j++) {
            yuan_questionTop.push({ yuan_title: yuan_topRows[0][yuan_j].yuan_title, yuan_views: Number(yuan_topRows[0][yuan_j].yuan_views) });
        }

        // 4）用户角色分布（环形图数据）
        var yuan_roleRows = await yuan_pool.query(
            'SELECT yuan_role, COUNT(*) AS yuan_count FROM yuan_user GROUP BY yuan_role'
        );
        var yuan_roleDist = [];
        for (var yuan_k = 0; yuan_k < yuan_roleRows[0].length; yuan_k++) {
            yuan_roleDist.push({ yuan_role: yuan_roleRows[0][yuan_k].yuan_role === 'admin' ? '管理员' : '普通用户', yuan_count: Number(yuan_roleRows[0][yuan_k].yuan_count) });
        }

        var yuan_data = {
            yuan_totals: yuan_totals,
            yuan_userTrend: yuan_userTrend,
            yuan_questionTop: yuan_questionTop,
            yuan_roleDist: yuan_roleDist
        };
        console.log('===== /api/admin/stats 响应 =====\n' + JSON.stringify({ code: 0, msg: 'ok', data: yuan_data }, null, 2));
        yuan_res.json({ code: 0, msg: 'ok', data: yuan_data });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '统计失败：' + yuan_err.message, data: null });
    }
};

// ============ 查（列表）：GET /api/admin/:entity/list?yuan_keyword=&yuan_page=&yuan_pageSize= ============
exports.yuan_list = async function (yuan_req, yuan_res) {
    try {
        var yuan_entity = yuan_entityMap[yuan_req.params.yuan_entity];
        if (!yuan_entity) { return yuan_res.json({ code: 1, msg: '不支持的管理实体', data: null }); }
        console.log('===== /api/admin/' + yuan_req.params.yuan_entity + '/list 请求 =====\n' + JSON.stringify(yuan_req.query, null, 2));
        await yuan_ensureTables();

        var yuan_pageObj = yuan_parsePage(yuan_req.query);
        var yuan_keyword = ((yuan_req.query && yuan_req.query.yuan_keyword) || '').trim();

        var yuan_where = '';
        var yuan_params = [];
        if (yuan_keyword) {
            var yuan_likes = [];
            for (var yuan_i = 0; yuan_i < yuan_entity.yuan_search.length; yuan_i++) {
                yuan_likes.push(yuan_entity.yuan_search[yuan_i] + ' LIKE ?');
                yuan_params.push('%' + yuan_keyword + '%');
            }
            yuan_where = ' WHERE ' + yuan_likes.join(' OR ');
        }

        var yuan_countRows = await yuan_pool.query(
            'SELECT COUNT(*) AS yuan_total FROM ' + yuan_entity.yuan_table + yuan_where, yuan_params
        );
        var yuan_total = Number(yuan_countRows[0][0].yuan_total);

        var yuan_offset = (yuan_pageObj.yuan_page - 1) * yuan_pageObj.yuan_pageSize;
        var yuan_listRows = await yuan_pool.query(
            yuan_entity.yuan_listSql + yuan_where + ' ORDER BY yuan_id DESC LIMIT ?, ?',
            yuan_params.concat([yuan_offset, yuan_pageObj.yuan_pageSize])
        );

        var yuan_data = {
            yuan_total: yuan_total,
            yuan_page: yuan_pageObj.yuan_page,
            yuan_pageSize: yuan_pageObj.yuan_pageSize,
            yuan_list: yuan_listRows[0]
        };
        console.log('===== /api/admin/' + yuan_req.params.yuan_entity + '/list 响应 =====\n' + JSON.stringify({ code: 0, msg: 'ok', data: { yuan_total: yuan_total, yuan_page: yuan_data.yuan_page, yuan_pageSize: yuan_data.yuan_pageSize, yuan_listCount: yuan_listRows[0].length } }, null, 2));
        yuan_res.json({ code: 0, msg: 'ok', data: yuan_data });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '查询列表失败：' + yuan_err.message, data: null });
    }
};

// ============ 查（详情）：GET /api/admin/:entity/:id ============
exports.yuan_detail = async function (yuan_req, yuan_res) {
    try {
        var yuan_entity = yuan_entityMap[yuan_req.params.yuan_entity];
        if (!yuan_entity) { return yuan_res.json({ code: 1, msg: '不支持的管理实体', data: null }); }
        console.log('===== /api/admin/' + yuan_req.params.yuan_entity + '/' + yuan_req.params.yuan_id + ' 详情请求 =====');
        await yuan_ensureTables();

        var yuan_rows = await yuan_pool.query(
            yuan_entity.yuan_detailSql + ' WHERE yuan_id = ?', [yuan_req.params.yuan_id]
        );
        if (yuan_rows[0].length === 0) {
            return yuan_res.json({ code: 1, msg: yuan_entity.yuan_label + '不存在（ID：' + yuan_req.params.yuan_id + '）', data: null });
        }
        console.log('===== 详情响应 =====\n' + JSON.stringify({ code: 0, msg: 'ok', data: yuan_rows[0][0] }, null, 2));
        yuan_res.json({ code: 0, msg: 'ok', data: yuan_rows[0][0] });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '查询详情失败：' + yuan_err.message, data: null });
    }
};

// 校验并取出实体的可写字段（增/改共用），返回 { yuan_err, yuan_fields }
function yuan_pickFields(yuan_entityKey, yuan_body, yuan_isCreate) {
    var yuan_entity = yuan_entityMap[yuan_entityKey];
    var yuan_bodyObj = yuan_body || {};
    var yuan_fields = {};

    // 必填校验（新增时全部必填；修改时只校验传了的字段不为空）
    var yuan_requiredKeys = Object.keys(yuan_entity.yuan_required);
    for (var yuan_i = 0; yuan_i < yuan_requiredKeys.length; yuan_i++) {
        var yuan_key = yuan_requiredKeys[yuan_i];
        var yuan_has = Object.prototype.hasOwnProperty.call(yuan_bodyObj, yuan_key);
        if (yuan_isCreate || yuan_has) {
            if (yuan_bodyObj[yuan_key] === undefined || yuan_bodyObj[yuan_key] === null || String(yuan_bodyObj[yuan_key]).trim() === '') {
                return { yuan_err: yuan_entity.yuan_required[yuan_key] + '不能为空', yuan_fields: null };
            }
        }
    }

    // 按白名单取字段（用户表密码单独加密处理）
    for (var yuan_j = 0; yuan_j < yuan_entity.yuan_writable.length; yuan_j++) {
        var yuan_field = yuan_entity.yuan_writable[yuan_j];
        if (!Object.prototype.hasOwnProperty.call(yuan_bodyObj, yuan_field)) { continue; }
        var yuan_val = yuan_bodyObj[yuan_field];
        if (yuan_field === 'yuan_password') {
            if (String(yuan_val).length < 6 || String(yuan_val).length > 20) {
                return { yuan_err: '密码长度须为 6~20 位', yuan_fields: null };
            }
            yuan_fields.yuan_password = yuan_hashPassword(yuan_val);
        } else if (yuan_field === 'yuan_role') {
            if (yuan_val !== 'admin' && yuan_val !== 'user') {
                return { yuan_err: '角色只能是 admin 或 user', yuan_fields: null };
            }
            yuan_fields.yuan_role = yuan_val;
        } else if (yuan_field === 'yuan_views' || yuan_field === 'yuan_votes' || yuan_field === 'yuan_question_id') {
            var yuan_num = parseInt(yuan_val, 10);
            if (isNaN(yuan_num) || yuan_num < 0) {
                return { yuan_err: (yuan_field === 'yuan_question_id' ? '所属问题 ID' : '数值') + '必须是不小于 0 的整数', yuan_fields: null };
            }
            yuan_fields[yuan_field] = yuan_num;
        } else {
            yuan_fields[yuan_field] = String(yuan_val);
        }
    }
    return { yuan_err: '', yuan_fields: yuan_fields };
}

// ============ 增：POST /api/admin/:entity ============
exports.yuan_create = async function (yuan_req, yuan_res) {
    try {
        var yuan_entityKey = yuan_req.params.yuan_entity;
        var yuan_entity = yuan_entityMap[yuan_entityKey];
        if (!yuan_entity) { return yuan_res.json({ code: 1, msg: '不支持的管理实体', data: null }); }
        console.log('===== /api/admin/' + yuan_entityKey + ' 新增请求 =====\n' + JSON.stringify(yuan_req.body, null, 2));
        await yuan_ensureTables();

        // 用户实体：用户名必填且唯一
        if (yuan_entityKey === 'yuan_user') {
            var yuan_username = ((yuan_req.body && yuan_req.body.yuan_username) || '').trim();
            if (!/^[\w一-龥]{3,20}$/.test(yuan_username)) {
                return yuan_res.json({ code: 1, msg: '用户名须为 3~20 位字母、数字、中文或下划线', data: null });
            }
            var yuan_exist = await yuan_pool.query('SELECT yuan_id FROM yuan_user WHERE yuan_username = ?', [yuan_username]);
            if (yuan_exist[0].length > 0) {
                return yuan_res.json({ code: 1, msg: '该用户名已存在', data: null });
            }
        }

        var yuan_pick = yuan_pickFields(yuan_entityKey, yuan_req.body, true);
        if (yuan_pick.yuan_err) { return yuan_res.json({ code: 1, msg: yuan_pick.yuan_err, data: null }); }

        if (yuan_entityKey === 'yuan_user') {
            var yuan_nickname = ((yuan_req.body && yuan_req.body.yuan_nickname) || '').trim() || yuan_username;
            await yuan_pool.query(
                'INSERT INTO yuan_user (yuan_username, yuan_password, yuan_nickname, yuan_role) VALUES (?, ?, ?, ?)',
                [yuan_username, yuan_pick.yuan_fields.yuan_password, yuan_nickname, yuan_pick.yuan_fields.yuan_role || 'user']
            );
        } else {
            var yuan_keys = Object.keys(yuan_pick.yuan_fields);
            var yuan_cols = yuan_keys.join(', ');
            var yuan_marks = yuan_keys.map(function () { return '?'; }).join(', ');
            var yuan_vals = yuan_keys.map(function (yuan_k) { return yuan_pick.yuan_fields[yuan_k]; });
            await yuan_pool.query(
                'INSERT INTO ' + yuan_entity.yuan_table + ' (' + yuan_cols + ') VALUES (' + yuan_marks + ')', yuan_vals
            );
        }
        console.log('===== 新增响应 =====\n' + JSON.stringify({ code: 0, msg: yuan_entity.yuan_label + '新增成功' }, null, 2));
        yuan_res.json({ code: 0, msg: yuan_entity.yuan_label + '新增成功', data: null });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '新增失败：' + yuan_err.message, data: null });
    }
};

// ============ 改：PUT /api/admin/:entity/:id ============
exports.yuan_update = async function (yuan_req, yuan_res) {
    try {
        var yuan_entityKey = yuan_req.params.yuan_entity;
        var yuan_entity = yuan_entityMap[yuan_entityKey];
        if (!yuan_entity) { return yuan_res.json({ code: 1, msg: '不支持的管理实体', data: null }); }
        console.log('===== /api/admin/' + yuan_entityKey + '/' + yuan_req.params.yuan_id + ' 修改请求 =====\n' + JSON.stringify(yuan_req.body, null, 2));
        await yuan_ensureTables();

        var yuan_exist = await yuan_pool.query(
            'SELECT yuan_id FROM ' + yuan_entity.yuan_table + ' WHERE yuan_id = ?', [yuan_req.params.yuan_id]
        );
        if (yuan_exist[0].length === 0) {
            return yuan_res.json({ code: 1, msg: yuan_entity.yuan_label + '不存在（ID：' + yuan_req.params.yuan_id + '）', data: null });
        }

        var yuan_pick = yuan_pickFields(yuan_entityKey, yuan_req.body, false);
        if (yuan_pick.yuan_err) { return yuan_res.json({ code: 1, msg: yuan_pick.yuan_err, data: null }); }
        var yuan_keys = Object.keys(yuan_pick.yuan_fields);
        if (yuan_keys.length === 0) {
            return yuan_res.json({ code: 1, msg: '没有需要修改的字段', data: null });
        }

        var yuan_setSql = yuan_keys.map(function (yuan_k) { return yuan_k + ' = ?'; }).join(', ');
        var yuan_vals = yuan_keys.map(function (yuan_k) { return yuan_pick.yuan_fields[yuan_k]; });
        yuan_vals.push(yuan_req.params.yuan_id);
        await yuan_pool.query(
            'UPDATE ' + yuan_entity.yuan_table + ' SET ' + yuan_setSql + ' WHERE yuan_id = ?', yuan_vals
        );
        console.log('===== 修改响应 =====\n' + JSON.stringify({ code: 0, msg: yuan_entity.yuan_label + '修改成功' }, null, 2));
        yuan_res.json({ code: 0, msg: yuan_entity.yuan_label + '修改成功', data: null });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '修改失败：' + yuan_err.message, data: null });
    }
};

// ============ 删：DELETE /api/admin/:entity/:id ============
exports.yuan_remove = async function (yuan_req, yuan_res) {
    try {
        var yuan_entityKey = yuan_req.params.yuan_entity;
        var yuan_entity = yuan_entityMap[yuan_entityKey];
        if (!yuan_entity) { return yuan_res.json({ code: 1, msg: '不支持的管理实体', data: null }); }
        console.log('===== /api/admin/' + yuan_entityKey + '/' + yuan_req.params.yuan_id + ' 删除请求 =====');
        await yuan_ensureTables();

        // 保护：不允许删除当前登录的管理员自己
        if (yuan_entityKey === 'yuan_user' && Number(yuan_req.params.yuan_id) === Number(yuan_req.yuan_adminUser.yuan_id)) {
            return yuan_res.json({ code: 1, msg: '不能删除当前登录的管理员账号', data: null });
        }

        var yuan_result = await yuan_pool.query(
            'DELETE FROM ' + yuan_entity.yuan_table + ' WHERE yuan_id = ?', [yuan_req.params.yuan_id]
        );
        if (yuan_result[0].affectedRows === 0) {
            return yuan_res.json({ code: 1, msg: yuan_entity.yuan_label + '不存在（ID：' + yuan_req.params.yuan_id + '）', data: null });
        }
        console.log('===== 删除响应 =====\n' + JSON.stringify({ code: 0, msg: yuan_entity.yuan_label + '删除成功' }, null, 2));
        yuan_res.json({ code: 0, msg: yuan_entity.yuan_label + '删除成功', data: null });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '删除失败：' + yuan_err.message, data: null });
    }
};
