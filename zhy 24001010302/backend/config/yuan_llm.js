// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-16 14:02:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：LLM 接口统一配置
// 大模型服务配置：API Key 等仅保存在 backend/.env，由服务端统一转发请求，前端不接触密钥
const yuan_path = require('path');
require('dotenv').config({ path: yuan_path.join(__dirname, '..', '.env') });

const yuan_llmKey = process.env.LLM_API_KEY || '';
const yuan_llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1';
const yuan_llmModel = process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V4-Flash';
const yuan_asrModel = process.env.ASR_MODEL || 'Qwen/Qwen3-ASR-1.7B';
const yuan_visionModel = process.env.VISION_MODEL || 'deepseek-ai/DeepSeek-V4.1-Flash';

// 调用大模型 chat/completions 接口
async function yuan_callLlm(yuan_requestBody) {
    var yuan_resp = await fetch(yuan_llmBaseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + yuan_llmKey
        },
        body: JSON.stringify(yuan_requestBody)
    });
    return yuan_resp.json();
}

module.exports = {
    yuan_llmKey: yuan_llmKey,
    yuan_llmBaseUrl: yuan_llmBaseUrl,
    yuan_llmModel: yuan_llmModel,
    yuan_asrModel: yuan_asrModel,
    yuan_visionModel: yuan_visionModel,
    yuan_callLlm: yuan_callLlm
};
