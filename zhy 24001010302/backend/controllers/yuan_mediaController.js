// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:33:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：语音识别与图片识别控制器
// 语音识别：硅基流动 /v1/audio/transcriptions（Qwen/Qwen3-ASR-1.7B）
// 图片识别：硅基流动 /v1/chat/completions 图片输入（deepseek-ai/DeepSeek-V4.1-Flash）
const yuan_llm = require('../config/yuan_llm');

// POST /api/media/asr —— 语音识别（上传音频文件，返回识别出的文字）
exports.yuan_asr = async function (yuan_req, yuan_res) {
    try {
        if (!yuan_req.file) {
            return yuan_res.json({ code: 1, msg: '未接收到音频文件，请上传 mp3 / wav / m4a 等音频', data: null });
        }
        if (!/^audio\//.test(yuan_req.file.mimetype) && !/\.(mp3|wav|m4a|flac|aac|ogg|wma)$/i.test(yuan_req.file.originalname)) {
            return yuan_res.json({ code: 1, msg: '仅支持音频文件（mp3 / wav / m4a / flac 等）', data: null });
        }

        // 构造 multipart/form-data 转发给硅基流动转写接口
        var yuan_form = new FormData();
        yuan_form.append('file', new Blob([yuan_req.file.buffer], { type: yuan_req.file.mimetype || 'audio/mpeg' }), yuan_req.file.originalname);
        yuan_form.append('model', yuan_llm.yuan_asrModel);

        // 终端留证：发送的请求（音频不打印内容，只打印元信息）
        console.log('【/api/media/asr 发送给 ASR 接口的请求】', JSON.stringify({
            url: yuan_llm.yuan_llmBaseUrl + '/audio/transcriptions',
            model: yuan_llm.yuan_asrModel,
            file: yuan_req.file.originalname,
            mimetype: yuan_req.file.mimetype,
            size: yuan_req.file.size
        }, null, 2));

        var yuan_resp = await fetch(yuan_llm.yuan_llmBaseUrl + '/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + yuan_llm.yuan_llmKey },
            body: yuan_form
        });
        var yuan_data = await yuan_resp.json();
        // 终端留证：收到的识别结果
        console.log('【/api/media/asr 收到的识别信息（响应）】', JSON.stringify(yuan_data, null, 2));

        if (yuan_data.error) {
            return yuan_res.json({ code: 2, msg: '语音识别接口错误：' + (yuan_data.error.message || JSON.stringify(yuan_data.error)), data: null });
        }
        if (!yuan_resp.ok) {
            return yuan_res.json({ code: 2, msg: '语音识别接口错误（HTTP ' + yuan_resp.status + '）：' + JSON.stringify(yuan_data), data: null });
        }

        yuan_res.json({
            code: 0,
            msg: '识别成功',
            data: {
                yuan_filename: yuan_req.file.originalname,
                yuan_text: String(yuan_data.text || ''),
                yuan_model: yuan_llm.yuan_asrModel,
                yuan_response: yuan_data
            }
        });
    } catch (yuan_err) {
        console.error('【/api/media/asr 识别失败】', yuan_err);
        yuan_res.json({ code: 1, msg: '语音识别失败：' + yuan_err.message, data: null });
    }
};

// POST /api/media/vision —— 图片识别（上传图片，返回图片内容描述与图中文字）
exports.yuan_vision = async function (yuan_req, yuan_res) {
    try {
        if (!yuan_req.file) {
            return yuan_res.json({ code: 1, msg: '未接收到图片文件，请上传 png / jpg 等图片', data: null });
        }
        if (!/^image\//.test(yuan_req.file.mimetype) && !/\.(png|jpe?g|gif|webp|bmp)$/i.test(yuan_req.file.originalname)) {
            return yuan_res.json({ code: 1, msg: '仅支持图片文件（png / jpg / webp 等）', data: null });
        }

        // 图片以 base64 data URL 形式传给视觉模型
        var yuan_dataUrl = 'data:' + (yuan_req.file.mimetype || 'image/png') + ';base64,' + yuan_req.file.buffer.toString('base64');
        var yuan_llmRequest = {
            model: yuan_llm.yuan_visionModel,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: yuan_dataUrl } },
                    { type: 'text', text: '请详细描述这张图片的内容；如果图片是截图或包含文字，请把图中文字完整转写出来。' }
                ]
            }],
            stream: false,
            temperature: 0.3
        };
        // 终端留证：发送的请求（图片 base64 只打印前 80 字符）
        var yuan_logRequest = JSON.parse(JSON.stringify(yuan_llmRequest));
        yuan_logRequest.messages[0].content[0].image_url.url = yuan_dataUrl.substring(0, 80) + '...（base64 略）';
        console.log('【/api/media/vision 发送给 LLM 的提示词（请求体）】', JSON.stringify(yuan_logRequest, null, 2));

        var yuan_llmResponse = await yuan_llm.yuan_callLlm(yuan_llmRequest);
        // 终端留证：收到的识别结果
        console.log('【/api/media/vision 收到的 LLM 信息（响应）】', JSON.stringify(yuan_llmResponse, null, 2));

        if (yuan_llmResponse.error) {
            return yuan_res.json({ code: 2, msg: '图片识别接口错误：' + (yuan_llmResponse.error.message || JSON.stringify(yuan_llmResponse.error)), data: null });
        }
        var yuan_answer = '';
        if (yuan_llmResponse.choices && yuan_llmResponse.choices.length > 0) {
            yuan_answer = yuan_llmResponse.choices[0].message.content;
        }

        yuan_res.json({
            code: 0,
            msg: '识别成功',
            data: {
                yuan_filename: yuan_req.file.originalname,
                yuan_answer: yuan_answer,
                yuan_model: yuan_llm.yuan_visionModel,
                yuan_llmRequest: yuan_logRequest,
                yuan_llmResponse: yuan_llmResponse
            }
        });
    } catch (yuan_err) {
        console.error('【/api/media/vision 识别失败】', yuan_err);
        yuan_res.json({ code: 1, msg: '图片识别失败：' + yuan_err.message, data: null });
    }
};
