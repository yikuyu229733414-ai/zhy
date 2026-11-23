// 姓名：张浩扬 | 学号：24001010302 | 建立时间：2026-11-19 13:36:32 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：登录页面（表单校验 + 图形验证码 + token 保持登录状态），请求与响应输出到浏览器控制台
(function () {
    'use strict';

    var yuan_card = document.getElementById('yuan_loginCard');
    var yuan_form = document.getElementById('yuan_loginForm');
    var yuan_username = document.getElementById('yuan_username');
    var yuan_password = document.getElementById('yuan_password');
    var yuan_captchaCode = document.getElementById('yuan_captchaCode');
    var yuan_captchaBox = document.getElementById('yuan_captchaBox');
    var yuan_captchaImg = document.getElementById('yuan_captchaImg');
    var yuan_msg = document.getElementById('yuan_msg');
    var yuan_submitBtn = document.getElementById('yuan_submitBtn');
    var yuan_loggedPanel = document.getElementById('yuan_loggedPanel');
    var yuan_loggedName = document.getElementById('yuan_loggedName');
    var yuan_logoutBtn = document.getElementById('yuan_logoutBtn');
    var yuan_captchaId = '';

    // 显示提示消息（带渐入动画）
    function yuan_showMsg(yuan_text, yuan_type) {
        yuan_msg.textContent = yuan_text;
        yuan_msg.className = 'yuan_msg yuan_show yuan_msg-' + yuan_type;
    }

    // 报错时卡片抖动（动画结束后移除 class，避免挡住卡片倾斜微交互）
    function yuan_shake() {
        yuan_card.classList.remove('yuan_shake');
        void yuan_card.offsetWidth;
        yuan_card.classList.add('yuan_shake');
    }
    yuan_card.addEventListener('animationend', function (yuan_e) {
        if (yuan_e.target === yuan_card) { yuan_card.classList.remove('yuan_shake'); }
    });

    // 鼠标视差：卡片随鼠标轻微倾斜，更显灵动
    yuan_card.style.transition = 'transform 0.25s ease-out';
    document.addEventListener('mousemove', function (yuan_e) {
        var yuan_rect = yuan_card.getBoundingClientRect();
        var yuan_in = yuan_e.clientX >= yuan_rect.left && yuan_e.clientX <= yuan_rect.right &&
            yuan_e.clientY >= yuan_rect.top && yuan_e.clientY <= yuan_rect.bottom;
        if (!yuan_in) {
            yuan_card.style.transform = '';
            return;
        }
        var yuan_x = (yuan_e.clientX - yuan_rect.left) / yuan_rect.width - 0.5;
        var yuan_y = (yuan_e.clientY - yuan_rect.top) / yuan_rect.height - 0.5;
        yuan_card.style.transform = 'perspective(900px) rotateY(' + (yuan_x * 4).toFixed(2) + 'deg) rotateX(' + (-yuan_y * 4).toFixed(2) + 'deg)';
    });

    // 获取图形验证码
    function yuan_loadCaptcha() {
        fetch('/api/user/captcha')
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 图形验证码响应 =====');
                console.log(yuan_result);
                if (yuan_result.code === 0) {
                    yuan_captchaId = yuan_result.data.yuan_captchaId;
                    yuan_captchaImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(yuan_result.data.yuan_captchaSvg);
                }
            })
            .catch(function (yuan_err) {
                console.log(yuan_err);
                yuan_showMsg('验证码加载失败：' + yuan_err.message + '（请先运行 run.bat 并通过 http://localhost:8302/login.html 访问）', 'err');
            });
    }

    // 点击验证码图片刷新（带轻微旋转过渡）
    yuan_captchaBox.addEventListener('click', function () {
        yuan_captchaImg.style.transition = 'transform 0.3s ease';
        yuan_captchaImg.style.transform = 'rotate(6deg) scale(0.94)';
        setTimeout(function () {
            yuan_captchaImg.style.transform = 'rotate(0deg) scale(1)';
            yuan_loadCaptcha();
        }, 180);
    });

    // 表单校验
    function yuan_validate() {
        var yuan_u = yuan_username.value.trim();
        var yuan_p = yuan_password.value;
        var yuan_c = yuan_captchaCode.value.trim();
        yuan_username.classList.remove('yuan_input-err');
        yuan_password.classList.remove('yuan_input-err');
        yuan_captchaCode.classList.remove('yuan_input-err');
        if (!yuan_u) { yuan_username.classList.add('yuan_input-err'); return '请填写用户名'; }
        if (!/^[\w一-龥]{3,20}$/.test(yuan_u)) { yuan_username.classList.add('yuan_input-err'); return '用户名须为 3~20 位字母、数字、中文或下划线'; }
        if (!yuan_p) { yuan_password.classList.add('yuan_input-err'); return '请填写密码'; }
        if (yuan_p.length < 6 || yuan_p.length > 20) { yuan_password.classList.add('yuan_input-err'); return '密码长度须为 6~20 位'; }
        if (!yuan_c) { yuan_captchaCode.classList.add('yuan_input-err'); return '请填写图形验证码'; }
        return '';
    }

    // 提交登录
    yuan_form.addEventListener('submit', function (yuan_e) {
        yuan_e.preventDefault();
        var yuan_errMsg = yuan_validate();
        if (yuan_errMsg) {
            yuan_showMsg(yuan_errMsg, 'err');
            yuan_shake();
            return;
        }

        var yuan_body = {
            yuan_username: yuan_username.value.trim(),
            yuan_password: yuan_password.value,
            yuan_captchaId: yuan_captchaId,
            yuan_captchaCode: yuan_captchaCode.value.trim()
        };
        console.log('===== 发送给后端的登录请求 =====');
        console.log(yuan_body);

        yuan_submitBtn.disabled = true;
        yuan_submitBtn.textContent = '登录中……';

        fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yuan_body)
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 后端返回的登录响应 =====');
                console.log(yuan_result);
                if (yuan_result.code === 0) {
                    // token 存 localStorage，保持登录状态
                    if (document.getElementById('yuan_remember').checked) {
                        localStorage.setItem('yuan_token', yuan_result.data.yuan_token);
                        localStorage.setItem('yuan_nickname', yuan_result.data.yuan_nickname);
                    } else {
                        sessionStorage.setItem('yuan_token', yuan_result.data.yuan_token);
                    }
                    yuan_showMsg('登录成功，正在进入……', 'ok');
                    setTimeout(function () {
                        yuan_form.style.display = 'none';
                        yuan_loggedName.textContent = yuan_result.data.yuan_nickname;
                        yuan_loggedPanel.style.display = 'block';
                        // 管理员账号显示"进入后台管理"入口
                        if (yuan_result.data.yuan_role === 'admin') {
                            document.getElementById('yuan_adminLink').style.display = 'inline-block';
                        }
                    }, 500);
                } else {
                    yuan_showMsg(yuan_result.msg, 'err');
                    yuan_shake();
                    yuan_loadCaptcha();
                    yuan_captchaCode.value = '';
                }
            })
            .catch(function (yuan_err) {
                console.log(yuan_err);
                yuan_showMsg('请求失败：' + yuan_err.message + '（请确认后端已启动：运行 run.bat 后通过 http://localhost:8302/login.html 访问本页）', 'err');
            })
            .finally(function () {
                yuan_submitBtn.disabled = false;
                yuan_submitBtn.textContent = '登 录';
            });
    });

    // 退出登录
    yuan_logoutBtn.addEventListener('click', function () {
        var yuan_token = localStorage.getItem('yuan_token') || sessionStorage.getItem('yuan_token') || '';
        fetch('/api/user/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + yuan_token },
            body: JSON.stringify({ yuan_token: yuan_token })
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 退出登录响应 =====');
                console.log(yuan_result);
                localStorage.removeItem('yuan_token');
                localStorage.removeItem('yuan_nickname');
                sessionStorage.removeItem('yuan_token');
                yuan_loggedPanel.style.display = 'none';
                yuan_form.style.display = 'block';
                yuan_showMsg('已退出登录', 'ok');
                yuan_loadCaptcha();
            });
    });

    // 页面加载：若已有 token，向后端确认登录状态（登录状态保持演示）
    var yuan_savedToken = localStorage.getItem('yuan_token') || sessionStorage.getItem('yuan_token');
    if (yuan_savedToken) {
        fetch('/api/user/me', { headers: { 'Authorization': 'Bearer ' + yuan_savedToken } })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 登录状态校验响应 =====');
                console.log(yuan_result);
                if (yuan_result.code === 0) {
                    yuan_form.style.display = 'none';
                    yuan_loggedName.textContent = yuan_result.data.yuan_nickname;
                    yuan_loggedPanel.style.display = 'block';
                    // 管理员账号显示"进入后台管理"入口
                    if (yuan_result.data.yuan_role === 'admin') {
                        document.getElementById('yuan_adminLink').style.display = 'inline-block';
                    }
                } else {
                    localStorage.removeItem('yuan_token');
                    sessionStorage.removeItem('yuan_token');
                    yuan_loadCaptcha();
                }
            })
            .catch(function () { yuan_loadCaptcha(); });
    } else {
        yuan_loadCaptcha();
    }

    // file:// 直接双击打开时请求不到接口，给出明确提示
    if (window.location.protocol === 'file:') {
        yuan_showMsg('注意：本页依赖后端接口。请先运行 zhy 24001010302 目录下的 run.bat 启动后端，再通过 http://localhost:8302/login.html 访问本页。', 'err');
    }
})();
