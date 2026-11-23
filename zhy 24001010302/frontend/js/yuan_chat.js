// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-12 | 大模型：DeepSeek-V4-Pro 正式版
// （2026-11-16 修改：改为调用后端中间层 /api/ai/chat，API Key 不再出现在前端，模型：Xiaomi MiMo-V2.6-Pro）
// AI 聊天脚本：前端只传消息，由后端转发 SiliconFlow 大模型接口（deepseek-ai/DeepSeek-V4-Flash）
// 发送的提示词（请求体）与接收的数据（响应）均输出到浏览器控制台
(function () {
    var yuan_chatList = document.getElementById('yuan_chatList');
    var yuan_chatInput = document.getElementById('yuan_chatInput');
    var yuan_sendBtn = document.getElementById('yuan_sendBtn');

    // 后端中间层接口（API Key 由服务端从 .env 读取并转发）
    var yuan_apiUrl = '/api/ai/chat';

    // 对话上下文（含 system 提示 + 历史消息）
    var yuan_messages = [
        { role: 'system', content: '你是一个乐于助人的中文助手，请用简洁友好的中文回答。' }
    ];

    // 向消息列表追加一条消息
    function yuan_addMessage(yuan_role, yuan_text) {
        var yuan_div = document.createElement('div');
        yuan_div.className = 'yuan_msg ' + (yuan_role === 'user' ? 'yuan_msg-user' : 'yuan_msg-ai');
        yuan_div.textContent = yuan_text;
        yuan_chatList.appendChild(yuan_div);
        yuan_chatList.scrollTop = yuan_chatList.scrollHeight;
        return yuan_div;
    }

    // 发送消息并调用后端接口
    function yuan_send() {
        var yuan_text = yuan_chatInput.value.trim();
        if (!yuan_text) { return; }

        // 记录用户消息并展示
        yuan_messages.push({ role: 'user', content: yuan_text });
        yuan_addMessage('user', yuan_text);
        yuan_chatInput.value = '';

        // 构造请求体（只传消息，不传密钥）
        var yuan_requestBody = { yuan_messages: yuan_messages };

        // 控制台输出：发送的提示词（请求体）
        console.log('【发送的提示词 / 请求体】', JSON.stringify(yuan_requestBody, null, 2));

        // 等待提示
        yuan_sendBtn.disabled = true;
        var yuan_waitDiv = document.createElement('div');
        yuan_waitDiv.className = 'yuan_msg yuan_msg-wait';
        yuan_waitDiv.textContent = '正在思考…';
        yuan_chatList.appendChild(yuan_waitDiv);
        yuan_chatList.scrollTop = yuan_chatList.scrollHeight;

        fetch(yuan_apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yuan_requestBody)
        })
            .then(function (yuan_resp) {
                return yuan_resp.json();
            })
            .then(function (yuan_data) {
                // 控制台输出：接收的数据（响应）
                console.log('【接收的数据 / 响应】', JSON.stringify(yuan_data, null, 2));

                // 移除等待提示
                yuan_chatList.removeChild(yuan_waitDiv);

                var yuan_reply = '';
                if (yuan_data.code === 0 && yuan_data.data) {
                    yuan_reply = yuan_data.data.yuan_reply;
                } else {
                    yuan_reply = '接口返回错误：' + yuan_data.msg;
                }

                // 记录助手回复并展示
                if (yuan_data.code === 0 && yuan_data.data) {
                    yuan_messages.push({ role: 'assistant', content: yuan_reply });
                    yuan_addMessage('ai', yuan_reply);
                } else {
                    var yuan_errDiv = document.createElement('div');
                    yuan_errDiv.className = 'yuan_msg yuan_msg-err';
                    yuan_errDiv.textContent = yuan_reply;
                    yuan_chatList.appendChild(yuan_errDiv);
                }
                yuan_chatList.scrollTop = yuan_chatList.scrollHeight;
            })
            .catch(function (yuan_err) {
                // 错误输出到控制台
                console.error('【请求失败】', yuan_err);

                yuan_chatList.removeChild(yuan_waitDiv);
                var yuan_errDiv = document.createElement('div');
                yuan_errDiv.className = 'yuan_msg yuan_msg-err';
                yuan_errDiv.textContent = '请求失败：' + yuan_err.message;
                yuan_chatList.appendChild(yuan_errDiv);
                yuan_chatList.scrollTop = yuan_chatList.scrollHeight;
            })
            .finally(function () {
                yuan_sendBtn.disabled = false;
                yuan_chatInput.focus();
            });
    }

    yuan_sendBtn.addEventListener('click', yuan_send);
    yuan_chatInput.addEventListener('keydown', function (yuan_ev) {
        if (yuan_ev.key === 'Enter') { yuan_send(); }
    });
})();
