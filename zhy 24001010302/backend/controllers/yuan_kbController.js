// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-12 | 大模型：DeepSeek-V4-Pro 正式版
// 知识库控制器（RAG）：文件上传解析分块入库、列表、删除、基于知识库检索 + 调用 LLM 问答
const yuan_mysql = require('mysql2/promise');
const yuan_dbConfig = require('../config/yuan_db');
const yuan_llm = require('../config/yuan_llm');

// 数据库连接池
const yuan_pool = yuan_mysql.createPool(yuan_dbConfig);

// SiliconFlow LLM 接口配置（密钥等从 backend/.env 读取，见 config/yuan_llm.js）
const yuan_llmModel = yuan_llm.yuan_llmModel;

// PDF 解析（可选依赖，缺失时仅支持 TXT）
let yuan_pdfParse = null;
try {
    yuan_pdfParse = require('pdf-parse');
} catch (yuan_e) {
    console.warn('未安装 pdf-parse，将仅支持 TXT 文件解析：', yuan_e.message);
}

// 确保知识库表存在（幂等）
async function yuan_ensureTable() {
    await yuan_pool.query(
        'CREATE TABLE IF NOT EXISTS `yuan_knowledge_base` (' +
        '`yuan_id` INT AUTO_INCREMENT PRIMARY KEY,' +
        '`yuan_filename` VARCHAR(255) NOT NULL,' +
        '`yuan_chunk_index` INT NOT NULL DEFAULT 0,' +
        '`yuan_content` TEXT NOT NULL,' +
        '`yuan_created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
}

// 解析文本文件（TXT 等）
function yuan_parseText(buffer) {
    return buffer.toString('utf8');
}

// 解析 PDF 文件
async function yuan_parsePdf(buffer) {
    if (!yuan_pdfParse) {
        throw new Error('缺少 pdf-parse 依赖，无法解析 PDF，请上传 TXT 文件');
    }
    var yuan_data = await yuan_pdfParse(buffer);
    return yuan_data.text || '';
}

// 文本分块（按段落 + 固定长度）
function yuan_chunkText(text, chunkSize) {
    chunkSize = chunkSize || 400;
    var yuan_cleaned = String(text).replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    var yuan_paragraphs = yuan_cleaned.split(/\n{2,}/);
    var yuan_chunks = [];
    var yuan_current = '';
    for (var yuan_i = 0; yuan_i < yuan_paragraphs.length; yuan_i++) {
        var yuan_p = yuan_paragraphs[yuan_i].trim();
        if (!yuan_p) { continue; }
        if (yuan_current && (yuan_current + '\n' + yuan_p).length > chunkSize) {
            yuan_chunks.push(yuan_current.trim());
            yuan_current = yuan_p;
        } else {
            yuan_current = yuan_current ? yuan_current + '\n' + yuan_p : yuan_p;
        }
    }
    if (yuan_current.trim()) { yuan_chunks.push(yuan_current.trim()); }

    // 超长块硬切
    var yuan_final = [];
    for (var yuan_j = 0; yuan_j < yuan_chunks.length; yuan_j++) {
        var yuan_c = yuan_chunks[yuan_j];
        while (yuan_c.length > chunkSize) {
            yuan_final.push(yuan_c.substring(0, chunkSize));
            yuan_c = yuan_c.substring(chunkSize);
        }
        if (yuan_c) { yuan_final.push(yuan_c); }
    }
    return yuan_final;
}

// 简单关键词检索：计算问题字符在分块中的命中得分，取 Top 3
function yuan_retrieve(question, rows) {
    var yuan_q = String(question);
    var yuan_scored = rows.map(function (yuan_r) {
        var yuan_content = yuan_r.yuan_content || '';
        var yuan_score = 0;
        for (var yuan_i = 0; yuan_i < yuan_q.length; yuan_i++) {
            var yuan_ch = yuan_q[yuan_i];
            if (yuan_ch === ' ' || '，。？?！!、；;：:""\'\'（）()'.indexOf(yuan_ch) !== -1) { continue; }
            if (yuan_content.indexOf(yuan_ch) !== -1) { yuan_score++; }
        }
        return { yuan_content: yuan_content, yuan_score: yuan_score };
    });
    yuan_scored.sort(function (yuan_a, yuan_b) { return yuan_b.yuan_score - yuan_a.yuan_score; });
    var yuan_top = yuan_scored.filter(function (yuan_s) { return yuan_s.yuan_score > 0; }).slice(0, 3);
    return yuan_top.map(function (yuan_s) { return yuan_s.yuan_content; }).join('\n\n');
}

// 调用 SiliconFlow LLM 接口（统一走 config/yuan_llm.js）
function yuan_callLlm(requestBody) {
    return yuan_llm.yuan_callLlm(requestBody);
}

// POST /api/kb/upload —— 上传知识文件
exports.yuan_upload = async function (yuan_req, yuan_res) {
    try {
        await yuan_ensureTable();
        if (!yuan_req.file) {
            return yuan_res.json({ code: 1, msg: '未接收到文件，请选择 PDF 或 TXT 文件', data: null });
        }
        var yuan_filename = yuan_req.file.originalname;
        var yuan_buffer = yuan_req.file.buffer;
        var yuan_mimetype = yuan_req.file.mimetype || '';

        var yuan_text = '';
        if (yuan_mimetype === 'application/pdf' || /\.pdf$/i.test(yuan_filename)) {
            yuan_text = await yuan_parsePdf(yuan_buffer);
        } else {
            yuan_text = yuan_parseText(yuan_buffer);
        }

        if (!yuan_text || !yuan_text.trim()) {
            return yuan_res.json({ code: 1, msg: '文件解析后内容为空', data: null });
        }

        var yuan_chunks = yuan_chunkText(yuan_text);
        // 覆盖式入库：先删同名旧数据，再插入新分块
        await yuan_pool.query('DELETE FROM yuan_knowledge_base WHERE yuan_filename = ?', [yuan_filename]);
        for (var yuan_i = 0; yuan_i < yuan_chunks.length; yuan_i++) {
            await yuan_pool.query(
                'INSERT INTO yuan_knowledge_base (yuan_filename, yuan_chunk_index, yuan_content) VALUES (?, ?, ?)',
                [yuan_filename, yuan_i, yuan_chunks[yuan_i]]
            );
        }
        yuan_res.json({ code: 0, msg: '上传成功', data: { yuan_filename: yuan_filename, yuan_chunks: yuan_chunks.length } });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '上传失败：' + yuan_err.message, data: null });
    }
};

// GET /api/kb/list —— 知识库文件列表
exports.yuan_list = async function (yuan_req, yuan_res) {
    try {
        await yuan_ensureTable();
        var yuan_rows = await yuan_pool.query(
            'SELECT yuan_filename, COUNT(*) AS yuan_chunks FROM yuan_knowledge_base GROUP BY yuan_filename ORDER BY yuan_filename'
        );
        yuan_res.json({ code: 0, msg: '查询成功', data: yuan_rows[0] });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '查询失败：' + yuan_err.message, data: null });
    }
};

// POST /api/kb/delete —— 删除知识文件
exports.yuan_delete = async function (yuan_req, yuan_res) {
    try {
        await yuan_ensureTable();
        var yuan_filename = (yuan_req.body && yuan_req.body.yuan_filename) || '';
        if (!yuan_filename) {
            return yuan_res.json({ code: 1, msg: '缺少文件名', data: null });
        }
        var yuan_result = await yuan_pool.query('DELETE FROM yuan_knowledge_base WHERE yuan_filename = ?', [yuan_filename]);
        yuan_res.json({ code: 0, msg: '删除成功', data: { yuan_deleted: yuan_result[0].affectedRows } });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '删除失败：' + yuan_err.message, data: null });
    }
};

// POST /api/kb/chat —— 基于知识库的客服问答（检索 + LLM）
exports.yuan_chat = async function (yuan_req, yuan_res) {
    try {
        await yuan_ensureTable();
        var yuan_question = ((yuan_req.body && yuan_req.body.yuan_question) || '').trim();
        if (!yuan_question) {
            return yuan_res.json({ code: 1, msg: '问题不能为空', data: null });
        }

        var yuan_rows = await yuan_pool.query('SELECT yuan_content FROM yuan_knowledge_base');
        var yuan_list = yuan_rows[0];
        if (!yuan_list.length) {
            return yuan_res.json({ code: 1, msg: '知识库为空，请先上传知识文件', data: null });
        }

        var yuan_context = yuan_retrieve(yuan_question, yuan_list);
        if (!yuan_context) {
            yuan_context = '（知识库中未检索到相关内容）';
        }

        // 发送给 LLM 的请求体
        var yuan_llmRequest = {
            model: yuan_llmModel,
            messages: [
                { role: 'system', content: '你是知乎的智能客服助手，请严格依据下方【知识库内容】回答用户问题，用简洁中文回答；若知识库没有相关信息，请明确说明「知识库中暂无相关信息」。\n\n【知识库内容】\n' + yuan_context },
                { role: 'user', content: yuan_question }
            ],
            stream: false,
            temperature: 0.3
        };

        // 从 LLM 获取的响应
        var yuan_llmResponse = await yuan_callLlm(yuan_llmRequest);

        var yuan_answer = '';
        if (yuan_llmResponse.choices && yuan_llmResponse.choices.length > 0) {
            yuan_answer = yuan_llmResponse.choices[0].message.content;
        } else if (yuan_llmResponse.error) {
            yuan_answer = 'LLM 接口错误：' + (yuan_llmResponse.error.message || JSON.stringify(yuan_llmResponse.error));
        } else {
            yuan_answer = '未获取到有效回复';
        }

        yuan_res.json({
            code: 0,
            msg: '回答成功',
            data: {
                yuan_answer: yuan_answer,
                yuan_context: yuan_context,
                yuan_llmRequest: yuan_llmRequest,
                yuan_llmResponse: yuan_llmResponse
            }
        });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '问答失败：' + yuan_err.message, data: null });
    }
};
