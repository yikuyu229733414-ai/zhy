// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-12 | 大模型：DeepSeek-V4-Pro 正式版
// 知识库管理脚本：文件上传、列表加载、删除，结果均输出到浏览器控制台
(function () {
    var yuan_uploadZone = document.getElementById('yuan_uploadZone');
    var yuan_fileInput = document.getElementById('yuan_fileInput');
    var yuan_uploadFilename = document.getElementById('yuan_uploadFilename');
    var yuan_uploadBtn = document.getElementById('yuan_uploadBtn');
    var yuan_msgBox = document.getElementById('yuan_msgBox');
    var yuan_listBox = document.getElementById('yuan_listBox');

    var yuan_selectedFile = null;

    // 点击上传区触发文件选择
    yuan_uploadZone.addEventListener('click', function () {
        yuan_fileInput.click();
    });

    // 拖拽上传
    yuan_uploadZone.addEventListener('dragover', function (yuan_ev) {
        yuan_ev.preventDefault();
        yuan_uploadZone.classList.add('dragover');
    });
    yuan_uploadZone.addEventListener('dragleave', function () {
        yuan_uploadZone.classList.remove('dragover');
    });
    yuan_uploadZone.addEventListener('drop', function (yuan_ev) {
        yuan_ev.preventDefault();
        yuan_uploadZone.classList.remove('dragover');
        if (yuan_ev.dataTransfer.files.length) {
            yuan_setFile(yuan_ev.dataTransfer.files[0]);
        }
    });

    // 文件选择
    yuan_fileInput.addEventListener('change', function () {
        if (yuan_fileInput.files.length) {
            yuan_setFile(yuan_fileInput.files[0]);
        }
    });

    function yuan_setFile(file) {
        yuan_selectedFile = file;
        yuan_uploadFilename.textContent = '已选择：' + file.name;
        yuan_uploadBtn.disabled = false;
    }

    // 提示消息
    function yuan_showMessage(text, isErr) {
        var yuan_div = document.createElement('div');
        yuan_div.className = isErr ? 'yuan_msg-fail' : 'yuan_msg-ok';
        yuan_div.textContent = text;
        yuan_msgBox.appendChild(yuan_div);
    }

    // 上传文件
    function yuan_upload() {
        if (!yuan_selectedFile) { return; }

        var yuan_form = new FormData();
        yuan_form.append('yuan_file', yuan_selectedFile);

        console.log('【上传文件】', yuan_selectedFile.name, '大小：', yuan_selectedFile.size, '字节');

        yuan_uploadBtn.disabled = true;
        yuan_uploadBtn.textContent = '正在上传并解析…';

        fetch('/api/kb/upload', {
            method: 'POST',
            body: yuan_form
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_data) {
                console.log('【上传结果】', JSON.stringify(yuan_data, null, 2));
                if (yuan_data.code === 0) {
                    yuan_showMessage('上传成功：' + yuan_data.data.yuan_filename + '，切分为 ' + yuan_data.data.yuan_chunks + ' 个分块');
                    yuan_selectedFile = null;
                    yuan_fileInput.value = '';
                    yuan_uploadFilename.textContent = '';
                    yuan_loadList();
                } else {
                    yuan_showMessage('上传失败：' + yuan_data.msg, true);
                }
            })
            .catch(function (yuan_err) {
                console.error('【上传请求失败】', yuan_err);
                yuan_showMessage('上传请求失败：' + yuan_err.message + '（请确认后端已启动）', true);
            })
            .finally(function () {
                yuan_uploadBtn.disabled = !yuan_selectedFile;
                yuan_uploadBtn.textContent = '上传到知识库';
            });
    }

    // 加载文件列表
    function yuan_loadList() {
        fetch('/api/kb/list')
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_data) {
                console.log('【知识库文件列表】', JSON.stringify(yuan_data, null, 2));
                if (yuan_data.code === 0) {
                    yuan_renderList(yuan_data.data);
                } else {
                    yuan_listBox.innerHTML = '<div class="yuan_kb-empty">加载失败：' + yuan_escapeHtml(yuan_data.msg) + '</div>';
                }
            })
            .catch(function (yuan_err) {
                console.error('【列表请求失败】', yuan_err);
                yuan_listBox.innerHTML = '<div class="yuan_kb-empty">请求失败：' + yuan_escapeHtml(yuan_err.message) + '（请确认后端已启动）</div>';
            });
    }

    function yuan_renderList(rows) {
        if (!rows || !rows.length) {
            yuan_listBox.innerHTML = '<div class="yuan_kb-empty">知识库为空，请先上传文件。</div>';
            return;
        }
        var yuan_html = '<table class="yuan_kb-table"><thead><tr><th>文件名</th><th>分块数</th><th>操作</th></tr></thead><tbody>';
        for (var yuan_i = 0; yuan_i < rows.length; yuan_i++) {
            var yuan_name = yuan_escapeHtml(rows[yuan_i].yuan_filename);
            yuan_html += '<tr><td>' + yuan_name + '</td><td>' + rows[yuan_i].yuan_chunks + '</td>' +
                '<td><button class="yuan_kb-delete" data-name="' + yuan_name + '">删除</button></td></tr>';
        }
        yuan_html += '</tbody></table>';
        yuan_listBox.innerHTML = yuan_html;

        // 绑定删除事件
        var yuan_btns = yuan_listBox.querySelectorAll('.yuan_kb-delete');
        for (var yuan_j = 0; yuan_j < yuan_btns.length; yuan_j++) {
            yuan_btns[yuan_j].addEventListener('click', function () {
                yuan_delete(this.getAttribute('data-name'));
            });
        }
    }

    // HTML 转义
    function yuan_escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 删除文件
    function yuan_delete(filename) {
        if (!window.confirm('确认删除知识文件：' + filename + ' ？')) { return; }
        fetch('/api/kb/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yuan_filename: filename })
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_data) {
                console.log('【删除结果】', JSON.stringify(yuan_data, null, 2));
                yuan_showMessage('删除完成：' + (yuan_data.code === 0 ? yuan_data.msg : yuan_data.msg), yuan_data.code !== 0);
                yuan_loadList();
            })
            .catch(function (yuan_err) {
                console.error('【删除请求失败】', yuan_err);
                yuan_showMessage('删除请求失败：' + yuan_err.message, true);
            });
    }

    yuan_uploadBtn.addEventListener('click', yuan_upload);

    // 初始化：加载文件列表
    yuan_loadList();
})();
