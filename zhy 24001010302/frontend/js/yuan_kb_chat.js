// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-12 | 大模型：DeepSeek-V4-Pro 正式版
// 智能客服脚本：调用 /api/kb/chat，后端检索知识库并调用 LLM 回答；
// 发送给 LLM 的请求与 LLM 返回的数据均输出到浏览器控制台
(function () {
    var yuan_chatList = document.getElementById('yuan_chatList');
    var yuan_chatInput = document.getElementById('yuan_chatInput');
    var yuan_sendBtn = document.getElementById('yuan_sendBtn');

    // 追加一条消息（role：user / ai / context / err）
    function yuan_addMessage(role, text) {
        var yuan_div = document.createElement('div');
        var yuan_cls = 'yuan_msg ';
        if (role === 'user') { yuan_cls += 'yuan_msg-user'; }
        else if (role === 'context') { yuan_cls += 'yuan_msg-context'; }
        else if (role === 'err') { yuan_cls += 'yuan_msg-err'; }
        else { yuan_cls += 'yuan_msg-ai'; }
        yuan_div.className = yuan_cls;
        yuan_div.textContent = text;
        yuan_chatList.appendChild(yuan_div);
        yuan_chatList.scrollTop = yuan_chatList.scrollHeight;
        return yuan_div;
    }

    // 发送问题
    function yuan_send() {
        var yuan_question = yuan_chatInput.value.trim();
        if (!yuan_question) { return; }

        yuan_addMessage('user', yuan_question);
        yuan_chatInput.value = '';

        // 发送给后端的请求体
        var yuan_requestBody = { yuan_question: yuan_question };
        console.log('【发送给后端的请求】', JSON.stringify(yuan_requestBody, null, 2));

        yuan_sendBtn.disabled = true;
        var yuan_waitDiv = yuan_addMessage('ai', '正在检索知识库并调用大模型…');

        fetch('/api/kb/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yuan_requestBody)
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_data) {
                yuan_chatList.removeChild(yuan_waitDiv);

                if (yuan_data.code === 0) {
                    var yuan_d = yuan_data.data;
                    // 控制台输出：发送给 LLM 的请求 + LLM 返回的数据 + 检索上下文
                    console.log('【发送给 LLM 的请求】', JSON.stringify(yuan_d.yuan_llmRequest, null, 2));
                    console.log('【LLM 返回的数据】', JSON.stringify(yuan_d.yuan_llmResponse, null, 2));
                    console.log('【检索到的知识库上下文】', yuan_d.yuan_context);

                    // 展示检索上下文与最终回答
                    yuan_addMessage('context', '知识库上下文：\n' + yuan_d.yuan_context);
                    yuan_addMessage('ai', yuan_d.yuan_answer);
                } else {
                    console.error('【接口返回错误】', yuan_data.msg);
                    yuan_addMessage('err', yuan_data.msg);
                }
            })
            .catch(function (yuan_err) {
                console.error('【请求失败】', yuan_err);
                yuan_chatList.removeChild(yuan_waitDiv);
                yuan_addMessage('err', '请求失败：' + yuan_err.message + '（请确认后端已启动）');
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
