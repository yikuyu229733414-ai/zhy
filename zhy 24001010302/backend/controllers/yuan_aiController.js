// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:02:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：AI 对话代理控制器
// 通用对话中间层：前端只传 messages，后端转发大模型并按统一格式返回，请求体与响应体打印到终端留证
const yuan_llm = require('../config/yuan_llm');

// POST /api/ai/chat —— 通用对话代理
exports.yuan_chat = async function (yuan_req, yuan_res) {
    try {
        var yuan_messages = (yuan_req.body && yuan_req.body.yuan_messages) || [];
        if (!Array.isArray(yuan_messages) || yuan_messages.length === 0) {
            return yuan_res.json({ code: 1, msg: '消息不能为空', data: null });
        }

        // 发送给大模型的请求体
        var yuan_llmRequest = {
            model: yuan_llm.yuan_llmModel,
            messages: yuan_messages,
            stream: false,
            temperature: 0.7
        };
        console.log('【/api/ai/chat 发送给 LLM 的提示词（请求体）】', JSON.stringify(yuan_llmRequest, null, 2));

        // 从大模型获得的响应
        var yuan_llmResponse = await yuan_llm.yuan_callLlm(yuan_llmRequest);
        console.log('【/api/ai/chat 收到的 LLM 信息（响应）】', JSON.stringify(yuan_llmResponse, null, 2));

        if (yuan_llmResponse.error) {
            return yuan_res.json({
                code: 2,
                msg: '大模型接口错误：' + (yuan_llmResponse.error.message || JSON.stringify(yuan_llmResponse.error)),
                data: null
            });
        }
        var yuan_reply = '';
        if (yuan_llmResponse.choices && yuan_llmResponse.choices.length > 0) {
            yuan_reply = yuan_llmResponse.choices[0].message.content;
        }

        yuan_res.json({
            code: 0,
            msg: 'ok',
            data: {
                yuan_reply: yuan_reply,
                yuan_llmRequest: yuan_llmRequest,
                yuan_llmResponse: yuan_llmResponse
            }
        });
    } catch (yuan_err) {
        console.error('【/api/ai/chat 调用失败】', yuan_err);
        yuan_res.json({ code: 5001, msg: '大模型调用失败：' + yuan_err.message, data: null });
    }
};
