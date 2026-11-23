// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
// 数据库连接测试脚本：fetch 调用 POST /api/db/test，成功与错误信息输出到控制台并给出页面提示
(function () {
    var yuan_userInput = document.getElementById('yuan_userInput');
    var yuan_passwordInput = document.getElementById('yuan_passwordInput');
    var yuan_connectBtn = document.getElementById('yuan_connectBtn');
    var yuan_resultBox = document.getElementById('yuan_resultBox');

    // 显示测试结果
    function yuan_showResult(yuan_isOk, yuan_html) {
        yuan_resultBox.className = 'yuan_result ' + (yuan_isOk ? 'yuan_result-ok' : 'yuan_result-err');
        yuan_resultBox.innerHTML = yuan_html;
    }

    // 连接数据库测试
    function yuan_testDb() {
        var yuan_user = yuan_userInput.value.trim();
        var yuan_password = yuan_passwordInput.value;

        if (!yuan_user) {
            yuan_showResult(false, '<b>提示信息</b>用户名不能为空，请输入数据库用户名。');
            console.error('提示信息：用户名不能为空');
            return;
        }

        var yuan_payload = {
            yuan_user: yuan_user,
            yuan_password: yuan_password
        };

        yuan_connectBtn.disabled = true;
        yuan_connectBtn.textContent = '正在连接…';
        yuan_resultBox.className = 'yuan_result';
        yuan_resultBox.innerHTML = '<span class="yuan_result-wait">正在连接数据库，请稍候…</span>';

        fetch('/api/db/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yuan_payload)
        })
            .then(function (yuan_resp) {
                return yuan_resp.json();
            })
            .then(function (yuan_data) {
                // 服务器返回的数据输出到浏览器控制台
                console.log('服务器返回数据：', yuan_data);
                if (yuan_data.code === 0) {
                    yuan_showResult(true,
                        '<b>连接成功</b>' + yuan_data.msg +
                        '：主机 ' + yuan_data.data.yuan_host +
                        '，数据库 ' + yuan_data.data.yuan_database +
                        '，用户 ' + yuan_data.data.yuan_user +
                        '（测试查询结果：' + yuan_data.data.yuan_check + '）'
                    );
                } else {
                    // 错误信息输出到浏览器控制台
                    console.error('服务器返回错误：', yuan_data.msg);
                    yuan_showResult(false, '<b>连接失败</b>' + yuan_data.msg + '。请检查用户名、密码后重试。');
                }
            })
            .catch(function (yuan_err) {
                console.error('请求失败：', yuan_err);
                yuan_showResult(false, '<b>请求失败</b>' + yuan_err.message + '。请确认后端服务已启动（run.bat）。');
            })
            .finally(function () {
                yuan_connectBtn.disabled = false;
                yuan_connectBtn.textContent = '连接数据库';
            });
    }

    yuan_connectBtn.addEventListener('click', yuan_testDb);
    // 回车直接测试
    yuan_passwordInput.addEventListener('keydown', function (yuan_ev) {
        if (yuan_ev.key === 'Enter') { yuan_testDb(); }
    });
})();
