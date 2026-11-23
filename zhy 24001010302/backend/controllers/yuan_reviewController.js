// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:02:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：商业评论上传与 LLM 评价控制器
// Harness Engineering：商业评论情感分类。Excel 评论上传解析 → 调用 LLM 输出结构化 JSON → 字段与类型校验、失败重试与兜底
const yuan_xlsx = require('xlsx');
const yuan_llm = require('../config/yuan_llm');

// 情感极性枚举（返回 JSON 结构中固定使用英文枚举，页面展示时映射为 好评/中评/差评）
var yuan_sentimentEnum = ['positive', 'neutral', 'negative'];

// ---------------- 返回 JSON 结构（先设计好的数据结构，见 yuan_interface.md） ----------------
// 单条评论结果：
// {
//   "id": 1,                                  // 评论编号
//   "text": "评论原文",                        // 评论原文
//   "sentiment": "positive",                  // 情感极性：positive(好评) / neutral(中评) / negative(差评)
//   "confidence": 0.93,                       // 置信度 0~1
//   "aspects": ["物流", "包装"],               // 涉及的评论维度
//   "entities": [{ "name": "某某品牌", "type": "brand" }],   // 实体：type 取 brand/product/store/service/other
//   "summary": "整体满意，物流较慢。",          // 一句话摘要
//   "valuable": true,                         // 对商家是否有参考价值
//   "valuable_reason": "指出具体物流问题",      // 价值判断理由
//   "need_review": false                      // 低置信度时标记人工复核
// }

// 构造 system 提示词：角色设定 + 任务约束 + 输出格式 + 少样本示例
function yuan_buildSystemPrompt() {
    return [
        '你是资深商业评论分析专家。任务：对用户给出的每一条商业评论输出结构化 JSON 分析。',
        '判断标准：',
        '1. sentiment：情感极性，只能取 "positive"（好评）、"neutral"（中评）、"negative"（差评）之一；整体正面为 positive，整体负面为 negative，褒贬参半或平淡为 neutral。',
        '2. confidence：判断置信度，0~1 之间的数字。',
        '3. aspects：评论涉及的维度（如 口味、物流、包装、服务、价格、质量），0~3 个。',
        '4. entities：评论提到的实体，每项格式 {"name": "名称", "type": "类型"}，type 只能取 brand/product/store/service/other，没有则为空数组。',
        '5. summary：不超过 30 字的一句话摘要。',
        '6. valuable：该评论对商家是否有参考价值；包含具体问题、具体建议或具体细节的为 true，纯灌水（如“好评”“还行”“不错”）为 false。',
        '7. valuable_reason：不超过 40 字的价值判断理由。',
        '8. need_review：低置信度（confidence < 0.6）或难以判断时为 true，否则 false。',
        '输出格式（必须严格遵守）：',
        '只输出一个 JSON 数组，不要输出任何解释文字，不要使用 markdown 代码块。数组元素结构示例：',
        '{"id": 1, "sentiment": "positive", "confidence": 0.93, "aspects": ["物流", "包装"], "entities": [{"name": "某某品牌", "type": "brand"}], "summary": "整体满意，物流较慢。", "valuable": true, "valuable_reason": "指出具体物流问题，有参考价值", "need_review": false}',
        '少样本示例：',
        '输入：{"id": 1, "text": "电池续航很虚，宣传说能用两天，实际半天就要充电，客服还一直推诿。"}',
        '输出：{"id": 1, "sentiment": "negative", "confidence": 0.95, "aspects": ["质量", "服务"], "entities": [], "summary": "续航虚标且客服推诿。", "valuable": true, "valuable_reason": "指出续航虚标与客服问题，可指导改进", "need_review": false}',
        '输入：{"id": 2, "text": "好评"}',
        '输出：{"id": 2, "sentiment": "positive", "confidence": 0.8, "aspects": [], "entities": [], "summary": "用户表示满意。", "valuable": false, "valuable_reason": "无具体细节，参考价值低", "need_review": false}',
        '要求：数组元素顺序与输入的 id 一一对应，每个输入评论必须有且仅有一个输出元素。'
    ].join('\n');
}

// 从模型返回的文本中提取 JSON 数组（容错：去除 markdown 代码块、截取首尾括号）
function yuan_extractJsonArray(yuan_text) {
    var yuan_clean = String(yuan_text || '').replace(/```[a-z]*/gi, '');
    var yuan_start = yuan_clean.indexOf('[');
    var yuan_end = yuan_clean.lastIndexOf(']');
    if (yuan_start === -1 || yuan_end === -1 || yuan_end <= yuan_start) { return null; }
    try {
        var yuan_parsed = JSON.parse(yuan_clean.substring(yuan_start, yuan_end + 1));
        return Array.isArray(yuan_parsed) ? yuan_parsed : null;
    } catch (yuan_e) {
        return null;
    }
}

// 单条结果校验与类型修复（不信任模型输出，逐字段校验）
function yuan_validateItem(yuan_item, yuan_id, yuan_text) {
    var yuan_result = {
        id: yuan_id,
        text: yuan_text,
        sentiment: 'neutral',
        confidence: 0,
        aspects: [],
        entities: [],
        summary: '',
        valuable: false,
        valuable_reason: '',
        need_review: true
    };
    if (yuan_item && typeof yuan_item === 'object') {
        var yuan_sent = String(yuan_item.sentiment || '').toLowerCase();
        // 兼容模型直接输出中文：好评/中评/差评
        if (yuan_sent === '好评') { yuan_sent = 'positive'; }
        if (yuan_sent === '中评') { yuan_sent = 'neutral'; }
        if (yuan_sent === '差评') { yuan_sent = 'negative'; }
        if (yuan_sentimentEnum.indexOf(yuan_sent) !== -1) { yuan_result.sentiment = yuan_sent; }

        var yuan_conf = Number(yuan_item.confidence);
        if (isFinite(yuan_conf)) {
            yuan_result.confidence = Math.round(Math.min(1, Math.max(0, yuan_conf)) * 100) / 100;
        }

        if (Array.isArray(yuan_item.aspects)) {
            yuan_result.aspects = yuan_item.aspects.map(String).map(function (yuan_s) { return yuan_s.trim(); })
                .filter(Boolean).slice(0, 3);
        }

        if (Array.isArray(yuan_item.entities)) {
            yuan_result.entities = yuan_item.entities.filter(function (yuan_e) { return yuan_e && yuan_e.name; })
                .map(function (yuan_e) {
                    return { name: String(yuan_e.name).trim().slice(0, 30), type: String(yuan_e.type || 'other').slice(0, 20) };
                }).slice(0, 5);
        }

        if (typeof yuan_item.summary === 'string') {
            yuan_result.summary = yuan_item.summary.trim().slice(0, 50);
        }
        if (typeof yuan_item.valuable === 'boolean') {
            yuan_result.valuable = yuan_item.valuable;
            yuan_result.need_review = false;
        }
        if (typeof yuan_item.valuable_reason === 'string') {
            yuan_result.valuable_reason = yuan_item.valuable_reason.trim().slice(0, 80);
        }
        if (typeof yuan_item.need_review === 'boolean') {
            yuan_result.need_review = yuan_item.need_review;
        }
    }
    return yuan_result;
}

// 调用 LLM 分析一批评论：失败自动重试 1 次，返回解析出的数组或 null（由调用方兜底）
async function yuan_analyzeBatch(yuan_batch) {
    var yuan_llmRequest = {
        model: yuan_llm.yuan_llmModel,
        messages: [
            { role: 'system', content: yuan_buildSystemPrompt() },
            { role: 'user', content: '请按要求分析以下评论：\n' + JSON.stringify(yuan_batch) }
        ],
        stream: false,
        temperature: 0.2
    };
    var yuan_attempts = [];
    for (var yuan_try = 0; yuan_try < 2; yuan_try++) {
        console.log('【/api/review/analyze 发送给 LLM 的提示词（请求体）】', JSON.stringify(yuan_llmRequest, null, 2));
        var yuan_llmResponse = await yuan_llm.yuan_callLlm(yuan_llmRequest);
        console.log('【/api/review/analyze 收到的 LLM 信息（响应）】', JSON.stringify(yuan_llmResponse, null, 2));
        yuan_attempts.push({ yuan_llmRequest: yuan_llmRequest, yuan_llmResponse: yuan_llmResponse });

        if (yuan_llmResponse.error) { continue; }
        var yuan_reply = '';
        if (yuan_llmResponse.choices && yuan_llmResponse.choices.length > 0) {
            yuan_reply = yuan_llmResponse.choices[0].message.content;
        }
        var yuan_items = yuan_extractJsonArray(yuan_reply);
        if (yuan_items && yuan_items.length) {
            return { yuan_items: yuan_items, yuan_attempts: yuan_attempts };
        }
    }
    return { yuan_items: null, yuan_attempts: yuan_attempts };
}

// GET /api/review/template —— 下载 Excel 评论模板（格式自拟：A 列编号、B 列评论内容）
exports.yuan_template = function (yuan_req, yuan_res) {
    try {
        var yuan_rows = [
            ['编号', '评论内容'],
            [1, '这家店的牛肉面分量很足，汤头浓郁，配送小哥态度也很好，下次还会回购！'],
            [2, '还行吧'],
            [3, '包装漏汤了，洒了一袋子，联系客服也没人回复，体验很差。']
        ];
        var yuan_wb = yuan_xlsx.utils.book_new();
        var yuan_ws = yuan_xlsx.utils.aoa_to_sheet(yuan_rows);
        yuan_ws['!cols'] = [{ wch: 8 }, { wch: 80 }];
        yuan_xlsx.utils.book_append_sheet(yuan_wb, yuan_ws, '商业评论');
        var yuan_buffer = yuan_xlsx.write(yuan_wb, { type: 'buffer', bookType: 'xlsx' });

        console.log('【/api/review/template】已生成 Excel 评论模板');
        yuan_res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        yuan_res.setHeader('Content-Disposition', "attachment; filename=\"yuan_review_template.xlsx\"; filename*=UTF-8''" + encodeURIComponent('商业评论模板.xlsx'));
        yuan_res.send(yuan_buffer);
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: '模板生成失败：' + yuan_err.message, data: null });
    }
};

// POST /api/review/upload —— 上传 Excel 商业评论文件并解析出评论列表
exports.yuan_upload = function (yuan_req, yuan_res) {
    try {
        if (!yuan_req.file) {
            return yuan_res.json({ code: 1, msg: '未接收到文件，请上传 Excel 文件（.xlsx / .xls）', data: null });
        }
        var yuan_filename = yuan_req.file.originalname;
        if (!/\.(xlsx|xls)$/i.test(yuan_filename)) {
            return yuan_res.json({ code: 1, msg: '仅支持 .xlsx / .xls 格式的 Excel 文件', data: null });
        }

        var yuan_wb = yuan_xlsx.read(yuan_req.file.buffer, { type: 'buffer' });
        var yuan_sheetName = yuan_wb.SheetNames[0];
        if (!yuan_sheetName) {
            return yuan_res.json({ code: 1, msg: 'Excel 中没有工作表', data: null });
        }
        var yuan_matrix = yuan_xlsx.utils.sheet_to_json(yuan_wb.Sheets[yuan_sheetName], { header: 1, defval: '' });

        // 定位表头行与“评论内容”列（首 5 行内含“评论”字样的单元格）
        var yuan_headerRow = -1;
        var yuan_col = -1;
        for (var yuan_i = 0; yuan_i < Math.min(yuan_matrix.length, 5) && yuan_col === -1; yuan_i++) {
            for (var yuan_j = 0; yuan_j < yuan_matrix[yuan_i].length; yuan_j++) {
                if (String(yuan_matrix[yuan_i][yuan_j]).indexOf('评论') !== -1) {
                    yuan_headerRow = yuan_i;
                    yuan_col = yuan_j;
                    break;
                }
            }
        }
        // 无表头时：优先取第二列（B 列），否则取第一列
        if (yuan_col === -1) {
            yuan_col = (yuan_matrix[0] && yuan_matrix[0].length > 1) ? 1 : 0;
        }

        var yuan_comments = [];
        for (var yuan_k = yuan_headerRow + 1; yuan_k < yuan_matrix.length; yuan_k++) {
            var yuan_text = String((yuan_matrix[yuan_k] && yuan_matrix[yuan_k][yuan_col]) || '').trim();
            if (yuan_text) { yuan_comments.push(yuan_text); }
        }
        if (yuan_comments.length === 0) {
            return yuan_res.json({ code: 1, msg: '未解析到任何评论内容，请按模板格式填写', data: null });
        }
        if (yuan_comments.length > 200) {
            return yuan_res.json({ code: 1, msg: '评论数量过多（' + yuan_comments.length + ' 条），单次最多 200 条', data: null });
        }

        console.log('【/api/review/upload 解析结果】文件：' + yuan_filename + '，共解析出 ' + yuan_comments.length + ' 条评论');
        yuan_res.json({
            code: 0,
            msg: '解析成功',
            data: {
                yuan_filename: yuan_filename,
                yuan_total: yuan_comments.length,
                yuan_comments: yuan_comments
            }
        });
    } catch (yuan_err) {
        yuan_res.json({ code: 1, msg: 'Excel 解析失败：' + yuan_err.message, data: null });
    }
};

// POST /api/review/analyze —— 对每条评论调用 LLM 判断 好评/中评/差评 并标记有价值评论
exports.yuan_analyze = async function (yuan_req, yuan_res) {
    try {
        var yuan_comments = (yuan_req.body && yuan_req.body.yuan_comments) || [];
        if (!Array.isArray(yuan_comments) || yuan_comments.length === 0) {
            return yuan_res.json({ code: 1, msg: '评论列表不能为空，请先上传 Excel 文件', data: null });
        }
        // 清洗并限制单条评论长度
        var yuan_list = yuan_comments
            .map(function (yuan_c) { return String(yuan_c || '').trim(); })
            .filter(Boolean)
            .map(function (yuan_c) { return yuan_c.slice(0, 500); });
        if (yuan_list.length === 0) {
            return yuan_res.json({ code: 1, msg: '评论列表不能为空，请先上传 Excel 文件', data: null });
        }

        // 分批调用 LLM（每批 10 条，降低输出截断风险）
        var yuan_batchSize = 10;
        var yuan_allAttempts = [];
        var yuan_results = [];
        var yuan_failedCount = 0;
        for (var yuan_start = 0; yuan_start < yuan_list.length; yuan_start += yuan_batchSize) {
            var yuan_slice = yuan_list.slice(yuan_start, yuan_start + yuan_batchSize);
            var yuan_batch = yuan_slice.map(function (yuan_text, yuan_idx) {
                return { id: yuan_start + yuan_idx + 1, text: yuan_text };
            });

            var yuan_out = await yuan_analyzeBatch(yuan_batch);
            yuan_allAttempts = yuan_allAttempts.concat(yuan_out.yuan_attempts);

            for (var yuan_n = 0; yuan_n < yuan_batch.length; yuan_n++) {
                var yuan_item = yuan_out.yuan_items ? yuan_out.yuan_items[yuan_n] : null;
                var yuan_valid = yuan_validateItem(yuan_item, yuan_batch[yuan_n].id, yuan_batch[yuan_n].text);
                if (!yuan_item) { yuan_failedCount++; }
                yuan_results.push(yuan_valid);
            }
        }

        // 全部批次均失败：返回错误，不伪造结果
        if (yuan_failedCount === yuan_results.length) {
            var yuan_lastError = '大模型未返回有效 JSON';
            var yuan_lastResp = yuan_allAttempts.length ? yuan_allAttempts[yuan_allAttempts.length - 1].yuan_llmResponse : null;
            if (yuan_lastResp && yuan_lastResp.error) {
                yuan_lastError = yuan_lastResp.error.message || JSON.stringify(yuan_lastResp.error);
            }
            return yuan_res.json({ code: 2, msg: '大模型调用失败：' + yuan_lastError, data: null });
        }

        // 汇总统计
        var yuan_summary = {
            yuan_total: yuan_results.length,
            yuan_positive: 0,
            yuan_neutral: 0,
            yuan_negative: 0,
            yuan_valuable: 0,
            yuan_needReview: 0
        };
        for (var yuan_m = 0; yuan_m < yuan_results.length; yuan_m++) {
            var yuan_r = yuan_results[yuan_m];
            if (yuan_r.sentiment === 'positive') { yuan_summary.yuan_positive++; }
            else if (yuan_r.sentiment === 'neutral') { yuan_summary.yuan_neutral++; }
            else { yuan_summary.yuan_negative++; }
            if (yuan_r.valuable) { yuan_summary.yuan_valuable++; }
            if (yuan_r.need_review) { yuan_summary.yuan_needReview++; }
        }

        var yuan_msg = '分析完成';
        if (yuan_failedCount > 0) {
            yuan_msg = '分析完成（' + yuan_failedCount + ' 条为兜底结果，已标记人工复核）';
        }
        console.log('【/api/review/analyze 分析完成】', JSON.stringify(yuan_summary));

        yuan_res.json({
            code: 0,
            msg: yuan_msg,
            data: {
                yuan_results: yuan_results,
                yuan_summary: yuan_summary,
                yuan_llmRequests: yuan_allAttempts.map(function (yuan_a) { return yuan_a.yuan_llmRequest; }),
                yuan_llmResponses: yuan_allAttempts.map(function (yuan_a) { return yuan_a.yuan_llmResponse; })
            }
        });
    } catch (yuan_err) {
        console.error('【/api/review/analyze 分析失败】', yuan_err);
        yuan_res.json({ code: 1, msg: '分析失败：' + yuan_err.message, data: null });
    }
};
