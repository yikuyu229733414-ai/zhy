// 姓名：张浩扬 | 学号：24001010302 | 建立时间：2026-11-16 14:40:00 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：语音识别（Qwen ASR）+ 图片识别（DeepSeek V4.1-Flash）
// 上传文件到 Express 中间层接口，请求与响应均输出到浏览器控制台

(function () {
    'use strict';

    // ============ 语音识别 ============
    var yuan_asrFileInput = document.getElementById('yuan_asrFileInput');
    var yuan_asrBtn = document.getElementById('yuan_asrBtn');
    var yuan_asrAudio = document.getElementById('yuan_asrAudio');
    var yuan_asrStatus = document.getElementById('yuan_asrStatus');
    var yuan_asrText = document.getElementById('yuan_asrText');
    var yuan_asrJson = document.getElementById('yuan_asrJson');

    // ============ 图片识别 ============
    var yuan_visionFileInput = document.getElementById('yuan_visionFileInput');
    var yuan_visionBtn = document.getElementById('yuan_visionBtn');
    var yuan_visionPreview = document.getElementById('yuan_visionPreview');
    var yuan_visionStatus = document.getElementById('yuan_visionStatus');
    var yuan_visionText = document.getElementById('yuan_visionText');
    var yuan_visionJson = document.getElementById('yuan_visionJson');

    // 设置状态条（type: ok / err / load）
    function yuan_setStatus(yuan_el, yuan_msg, yuan_type) {
        yuan_el.textContent = yuan_msg;
        yuan_el.className = 'yuan_status yuan_show yuan_status-' + yuan_type;
    }

    // ============ 语音：选择文件后预览播放 ============
    yuan_asrFileInput.addEventListener('change', function () {
        var yuan_file = yuan_asrFileInput.files[0];
        if (!yuan_file) {
            yuan_asrAudio.style.display = 'none';
            return;
        }
        yuan_asrAudio.src = URL.createObjectURL(yuan_file);
        yuan_asrAudio.style.display = 'block';
        yuan_setStatus(yuan_asrStatus, '已选择音频：' + yuan_file.name + '（' + Math.round(yuan_file.size / 1024) + ' KB）', 'load');
    });

    // ============ 语音识别请求 ============
    yuan_asrBtn.addEventListener('click', function () {
        var yuan_file = yuan_asrFileInput.files[0];
        if (!yuan_file) {
            yuan_setStatus(yuan_asrStatus, '请先选择音频文件', 'err');
            return;
        }

        var yuan_formData = new FormData();
        yuan_formData.append('yuan_file', yuan_file);
        var yuan_requestInfo = {
            yuan_url: '/api/media/asr',
            yuan_method: 'POST',
            yuan_bodyType: 'multipart/form-data',
            yuan_filename: yuan_file.name,
            yuan_fileSize: yuan_file.size,
            yuan_model: 'Qwen/Qwen3-ASR-1.7B'
        };
        console.log('===== 发送给后端的语音识别请求 =====');
        console.log(yuan_requestInfo);

        yuan_setStatus(yuan_asrStatus, '正在识别语音，请稍候……', 'load');
        yuan_asrBtn.disabled = true;
        yuan_asrText.textContent = '（识别中……）';

        fetch('/api/media/asr', {
            method: 'POST',
            body: yuan_formData
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 后端返回的语音识别响应 =====');
                console.log(yuan_result);

                if (yuan_result.code === 0) {
                    var yuan_data = yuan_result.data;
                    yuan_asrText.textContent = yuan_data.yuan_text || '（无识别文本）';
                    yuan_asrJson.textContent = JSON.stringify(yuan_result, null, 2);
                    yuan_asrJson.classList.add('yuan_show');
                    yuan_setStatus(yuan_asrStatus, '识别成功（模型：' + yuan_data.yuan_model + '），请求与响应已输出到浏览器控制台（F12）', 'ok');
                } else {
                    yuan_setStatus(yuan_asrStatus, '识别失败：' + yuan_result.msg, 'err');
                    yuan_asrText.textContent = '（识别失败）';
                }
            })
            .catch(function (yuan_err) {
                console.log('===== 语音识别请求异常 =====');
                console.log(yuan_err);
                yuan_setStatus(yuan_asrStatus, '请求失败：' + yuan_err.message + '（请确认后端已启动：运行 run.bat 后通过 http://localhost:8302/media.html 访问本页）', 'err');
                yuan_asrText.textContent = '（请求失败）';
            })
            .finally(function () {
                yuan_asrBtn.disabled = false;
            });
    });

    // ============ 图片：选择文件后预览 ============
    yuan_visionFileInput.addEventListener('change', function () {
        var yuan_file = yuan_visionFileInput.files[0];
        if (!yuan_file) {
            yuan_visionPreview.style.display = 'none';
            return;
        }
        yuan_visionPreview.src = URL.createObjectURL(yuan_file);
        yuan_visionPreview.style.display = 'block';
        yuan_setStatus(yuan_visionStatus, '已选择图片：' + yuan_file.name + '（' + Math.round(yuan_file.size / 1024) + ' KB）', 'load');
    });

    // ============ 图片识别请求 ============
    yuan_visionBtn.addEventListener('click', function () {
        var yuan_file = yuan_visionFileInput.files[0];
        if (!yuan_file) {
            yuan_setStatus(yuan_visionStatus, '请先选择图片文件', 'err');
            return;
        }

        var yuan_formData = new FormData();
        yuan_formData.append('yuan_file', yuan_file);
        var yuan_requestInfo = {
            yuan_url: '/api/media/vision',
            yuan_method: 'POST',
            yuan_bodyType: 'multipart/form-data',
            yuan_filename: yuan_file.name,
            yuan_fileSize: yuan_file.size,
            yuan_model: 'deepseek-ai/DeepSeek-V4.1-Flash'
        };
        console.log('===== 发送给后端的图片识别请求 =====');
        console.log(yuan_requestInfo);

        yuan_setStatus(yuan_visionStatus, '正在识别图片，请稍候……', 'load');
        yuan_visionBtn.disabled = true;
        yuan_visionText.textContent = '（识别中……）';

        fetch('/api/media/vision', {
            method: 'POST',
            body: yuan_formData
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 后端返回的图片识别响应 =====');
                console.log(yuan_result);

                if (yuan_result.code === 0) {
                    var yuan_data = yuan_result.data;
                    yuan_visionText.textContent = yuan_data.yuan_answer || '（无识别结果）';
                    yuan_visionJson.textContent = JSON.stringify(yuan_result, null, 2);
                    yuan_visionJson.classList.add('yuan_show');
                    yuan_setStatus(yuan_visionStatus, '识别成功（模型：' + yuan_data.yuan_model + '），请求与响应已输出到浏览器控制台（F12）', 'ok');
                } else {
                    yuan_setStatus(yuan_visionStatus, '识别失败：' + yuan_result.msg, 'err');
                    yuan_visionText.textContent = '（识别失败）';
                }
            })
            .catch(function (yuan_err) {
                console.log('===== 图片识别请求异常 =====');
                console.log(yuan_err);
                yuan_setStatus(yuan_visionStatus, '请求失败：' + yuan_err.message + '（请确认后端已启动：运行 run.bat 后通过 http://localhost:8302/media.html 访问本页）', 'err');
                yuan_visionText.textContent = '（请求失败）';
            })
            .finally(function () {
                yuan_visionBtn.disabled = false;
            });
    });

    // file:// 直接双击打开时请求不到接口，给出明确提示
    if (window.location.protocol === 'file:') {
        yuan_setStatus(yuan_asrStatus, '注意：本页依赖后端接口。请先运行 zhy 24001010302 目录下的 run.bat 启动后端，再通过 http://localhost:8302/media.html 访问本页；直接双击打开 HTML 文件会导致请求失败。', 'err');
    }
})();
