// 姓名：张浩扬 | 学号：24001010302 | 建立时间：2026-11-16 14:06:00 | 大模型：Xiaomi MiMo-V2.6-Pro | 功能：商业评论上传与 LLM 评价脚本
// 流程：上传 Excel → 后端解析评论 → 后端逐条调用 LLM 评价（好评/中评/差评 + 有价值）→ 饼状图 + 有价值评论 + 返回 JSON
// 发送给后端/LLM 的请求与返回的数据均输出到浏览器控制台
(function () {
    // ---------------- DOM 元素 ----------------
    var yuan_fileInput = document.getElementById('yuan_fileInput');
    var yuan_uploadBtn = document.getElementById('yuan_uploadBtn');
    var yuan_analyzeBtn = document.getElementById('yuan_analyzeBtn');
    var yuan_statusBar = document.getElementById('yuan_statusBar');
    var yuan_previewList = document.getElementById('yuan_previewList');
    var yuan_resultSection = document.getElementById('yuan_resultSection');
    var yuan_stats = document.getElementById('yuan_stats');
    var yuan_pieCanvas = document.getElementById('yuan_pieCanvas');
    var yuan_pieLegend = document.getElementById('yuan_pieLegend');
    var yuan_valuableList = document.getElementById('yuan_valuableList');
    var yuan_tableBody = document.getElementById('yuan_tableBody');
    var yuan_jsonSpec = document.getElementById('yuan_jsonSpec');
    var yuan_jsonView = document.getElementById('yuan_jsonView');
    var yuan_downloadJsonBtn = document.getElementById('yuan_downloadJsonBtn');

    // 情感极性映射与配色
    var yuan_sentimentMap = {
        positive: { label: '好评', color: '#52c41a', cls: 'yuan_badge-good' },
        neutral: { label: '中评', color: '#fa8c16', cls: 'yuan_badge-mid' },
        negative: { label: '差评', color: '#ff4d4f', cls: 'yuan_badge-bad' }
    };

    // 返回 JSON 数据结构约定（与后端设计保持一致）
    var yuan_jsonFormat = [
        '{',
        '  "code": 0,                       // 0 成功，非 0 失败',
        '  "msg": "分析完成",',
        '  "data": {',
        '    "yuan_results": [              // 逐条评论的结构化评价',
        '      {',
        '        "id": 1,                   // 评论编号',
        '        "text": "评论原文",',
        '        "sentiment": "positive",   // 情感极性：positive(好评)/neutral(中评)/negative(差评)',
        '        "confidence": 0.93,        // 置信度 0~1',
        '        "aspects": ["物流"],       // 涉及的评论维度',
        '        "entities": [{"name": "某品牌", "type": "brand"}],   // 实体：brand/product/store/service/other',
        '        "summary": "整体满意，物流较慢。",',
        '        "valuable": true,          // 是否为有价值的评论',
        '        "valuable_reason": "指出具体物流问题",',
        '        "need_review": false       // 低置信度时标记人工复核',
        '      }',
        '    ],',
        '    "yuan_summary": { "yuan_total": 20, "yuan_positive": 8, "yuan_neutral": 6, "yuan_negative": 6, "yuan_valuable": 15, "yuan_needReview": 0 },',
        '    "yuan_llmRequests": [ ... ],   // 发送给 LLM 的请求体（留证）',
        '    "yuan_llmResponses": [ ... ]   // 收到的 LLM 信息（留证）',
        '  }',
        '}'
    ].join('\n');

    // ---------------- 状态提示 ----------------
    function yuan_setStatus(yuan_text, yuan_type) {
        yuan_statusBar.textContent = yuan_text || '';
        yuan_statusBar.className = 'yuan_status' + (yuan_type ? ' yuan_status-' + yuan_type : '');
    }

    // ---------------- 上传并解析 Excel ----------------
    function yuan_upload() {
        var yuan_file = yuan_fileInput.files[0];
        if (!yuan_file) {
            yuan_setStatus('请先选择 Excel 文件（可先下载模板填写）', 'err');
            return;
        }
        var yuan_formData = new FormData();
        yuan_formData.append('yuan_file', yuan_file);
        console.log('【上传商业评论文件】', yuan_file.name);

        yuan_uploadBtn.disabled = true;
        yuan_setStatus('正在上传并解析 Excel…');

        fetch('/api/review/upload', { method: 'POST', body: yuan_formData })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_data) {
                // 控制台输出：后端返回的解析结果
                console.log('【/api/review/upload 返回】', JSON.stringify(yuan_data, null, 2));
                yuan_uploadBtn.disabled = false;
                if (yuan_data.code !== 0) {
                    yuan_setStatus('解析失败：' + yuan_data.msg, 'err');
                    return;
                }
                var yuan_comments = yuan_data.data.yuan_comments || [];
                yuan_analyzeBtn.disabled = false;

                // 预览解析出的评论
                yuan_previewList.innerHTML = '';
                for (var yuan_i = 0; yuan_i < yuan_comments.length; yuan_i++) {
                    var yuan_li = document.createElement('li');
                    yuan_li.textContent = yuan_comments[yuan_i];
                    yuan_previewList.appendChild(yuan_li);
                }
                yuan_setStatus('解析成功：文件「' + yuan_data.data.yuan_filename + '」共 ' + yuan_data.data.yuan_total + ' 条评论，点击「开始 AI 评价」继续', 'ok');
            })
            .catch(function (yuan_err) {
                console.error('【上传解析失败】', yuan_err);
                yuan_uploadBtn.disabled = false;
                yuan_setStatus('上传解析失败：' + yuan_err.message + '（请确认后端已启动：运行 run.bat 后通过 http://localhost:8302/review.html 访问本页）', 'err');
            });
    }

    // ---------------- 开始 AI 评价 ----------------
    function yuan_analyze() {
        var yuan_items = [];
        var yuan_lis = yuan_previewList.querySelectorAll('li');
        for (var yuan_i = 0; yuan_i < yuan_lis.length; yuan_i++) {
            yuan_items.push(yuan_lis[yuan_i].textContent);
        }
        if (!yuan_items.length) {
            yuan_setStatus('没有可评价的评论，请先上传 Excel 文件', 'err');
            return;
        }

        var yuan_requestBody = { yuan_comments: yuan_items };
        // 控制台输出：发送的提示词（请求体）
        console.log('【发送给后端的评论列表 / 请求体】', JSON.stringify(yuan_requestBody, null, 2));

        yuan_analyzeBtn.disabled = true;
        yuan_uploadBtn.disabled = true;
        yuan_setStatus('AI 正在逐条评价，请稍候…');

        fetch('/api/review/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yuan_requestBody)
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_data) {
                // 控制台输出：接收的数据（响应）
                console.log('【/api/review/analyze 返回】', JSON.stringify(yuan_data, null, 2));
                yuan_analyzeBtn.disabled = false;
                yuan_uploadBtn.disabled = false;
                if (yuan_data.code !== 0) {
                    yuan_setStatus('评价失败：' + yuan_data.msg, 'err');
                    return;
                }
                yuan_setStatus(yuan_data.msg + '，结果见下方', 'ok');
                yuan_renderResult(yuan_data.data);
            })
            .catch(function (yuan_err) {
                console.error('【评价请求失败】', yuan_err);
                yuan_analyzeBtn.disabled = false;
                yuan_uploadBtn.disabled = false;
                yuan_setStatus('评价请求失败：' + yuan_err.message + '（请确认后端已启动：运行 run.bat 后通过 http://localhost:8302/review.html 访问本页）', 'err');
            });
    }

    // ---------------- 渲染结果 ----------------
    function yuan_renderResult(yuan_data) {
        var yuan_results = yuan_data.yuan_results || [];
        var yuan_summary = yuan_data.yuan_summary || {};
        yuan_resultSection.style.display = '';

        // 统计卡片
        var yuan_cards = [
            { name: '总评论数', num: yuan_summary.yuan_total, cls: '' },
            { name: '好评', num: yuan_summary.yuan_positive, cls: 'yuan_stat-good' },
            { name: '中评', num: yuan_summary.yuan_neutral, cls: 'yuan_stat-mid' },
            { name: '差评', num: yuan_summary.yuan_negative, cls: 'yuan_stat-bad' },
            { name: '有价值的评论', num: yuan_summary.yuan_valuable, cls: 'yuan_stat-value' },
            { name: '需人工复核', num: yuan_summary.yuan_needReview, cls: '' }
        ];
        yuan_stats.innerHTML = '';
        for (var yuan_i = 0; yuan_i < yuan_cards.length; yuan_i++) {
            var yuan_div = document.createElement('div');
            yuan_div.className = 'yuan_stat-card ' + yuan_cards[yuan_i].cls;
            yuan_div.innerHTML = '<div class="yuan_stat-num"></div><div class="yuan_stat-name"></div>';
            yuan_div.querySelector('.yuan_stat-num').textContent = yuan_cards[yuan_i].num || 0;
            yuan_div.querySelector('.yuan_stat-name').textContent = yuan_cards[yuan_i].name;
            yuan_stats.appendChild(yuan_div);
        }

        // 饼状图 + 图例
        var yuan_counts = [
            { label: '好评', count: yuan_summary.yuan_positive || 0, color: yuan_sentimentMap.positive.color },
            { label: '中评', count: yuan_summary.yuan_neutral || 0, color: yuan_sentimentMap.neutral.color },
            { label: '差评', count: yuan_summary.yuan_negative || 0, color: yuan_sentimentMap.negative.color }
        ];
        yuan_drawPie(yuan_counts);

        // 有价值评论
        yuan_valuableList.innerHTML = '';
        var yuan_hasValuable = false;
        for (var yuan_j = 0; yuan_j < yuan_results.length; yuan_j++) {
            var yuan_r = yuan_results[yuan_j];
            if (!yuan_r.valuable) { continue; }
            yuan_hasValuable = true;
            var yuan_li = document.createElement('li');
            yuan_li.className = 'yuan_valuable-item';

            var yuan_p = document.createElement('p');
            yuan_p.className = 'yuan_valuable-text';
            yuan_p.textContent = '#' + yuan_r.id + '　' + yuan_r.text;
            yuan_li.appendChild(yuan_p);

            var yuan_meta = document.createElement('div');
            yuan_meta.className = 'yuan_valuable-meta';
            var yuan_sent = yuan_sentimentMap[yuan_r.sentiment] || yuan_sentimentMap.neutral;
            var yuan_badge = '<span class="yuan_badge ' + yuan_sent.cls + '">' + yuan_sent.label + '</span>';
            var yuan_tags = '';
            for (var yuan_t = 0; yuan_t < (yuan_r.aspects || []).length; yuan_t++) {
                yuan_tags += '<span class="yuan_tag">' + yuan_r.aspects[yuan_t] + '</span>';
            }
            yuan_meta.innerHTML = yuan_badge + yuan_tags +
                '<span>价值理由：' + (yuan_r.valuable_reason || '—') + '</span>　' +
                '<span>摘要：' + (yuan_r.summary || '—') + '</span>';
            yuan_li.appendChild(yuan_meta);
            yuan_valuableList.appendChild(yuan_li);
        }
        if (!yuan_hasValuable) {
            var yuan_empty = document.createElement('li');
            yuan_empty.className = 'yuan_empty-tip';
            yuan_empty.textContent = '本次没有识别出有价值的评论';
            yuan_valuableList.appendChild(yuan_empty);
        }

        // 全部评论分析表格
        yuan_tableBody.innerHTML = '';
        for (var yuan_k = 0; yuan_k < yuan_results.length; yuan_k++) {
            var yuan_item = yuan_results[yuan_k];
            var yuan_tr = document.createElement('tr');
            var yuan_sent2 = yuan_sentimentMap[yuan_item.sentiment] || yuan_sentimentMap.neutral;
            yuan_tr.innerHTML =
                '<td class="yuan_td-num"></td>' +
                '<td class="yuan_td-text"></td>' +
                '<td><span class="yuan_badge ' + yuan_sent2.cls + '">' + yuan_sent2.label + '</span></td>' +
                '<td class="yuan_td-num"></td>' +
                '<td class="yuan_td-text"></td>' +
                '<td></td>';
            var yuan_tds = yuan_tr.querySelectorAll('td');
            yuan_tds[0].textContent = yuan_item.id;
            yuan_tds[1].textContent = yuan_item.text;
            yuan_tds[3].textContent = (yuan_item.confidence !== undefined ? yuan_item.confidence : '-');
            yuan_tds[4].textContent = yuan_item.summary || '—';
            yuan_tds[5].textContent = yuan_item.valuable ? '是' : '否';
            yuan_tableBody.appendChild(yuan_tr);
        }

        // 返回 JSON 展示
        yuan_jsonView.textContent = JSON.stringify(yuan_data, null, 2);

        // 滚动到结果区
        yuan_resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------------- 饼状图（原生 Canvas） ----------------
    function yuan_drawPie(yuan_counts) {
        var yuan_ctx = yuan_pieCanvas.getContext('2d');
        var yuan_dpr = window.devicePixelRatio || 1;
        var yuan_size = 300;
        yuan_pieCanvas.width = yuan_size * yuan_dpr;
        yuan_pieCanvas.height = yuan_size * yuan_dpr;
        yuan_ctx.scale(yuan_dpr, yuan_dpr);
        yuan_ctx.clearRect(0, 0, yuan_size, yuan_size);

        var yuan_total = 0;
        for (var yuan_i = 0; yuan_i < yuan_counts.length; yuan_i++) { yuan_total += yuan_counts[yuan_i].count; }

        var yuan_cx = yuan_size / 2;
        var yuan_cy = yuan_size / 2;
        var yuan_radius = yuan_size / 2 - 16;

        // 图例
        yuan_pieLegend.innerHTML = '';
        for (var yuan_j = 0; yuan_j < yuan_counts.length; yuan_j++) {
            var yuan_pct = yuan_total ? Math.round(yuan_counts[yuan_j].count / yuan_total * 1000) / 10 : 0;
            var yuan_li = document.createElement('li');
            yuan_li.innerHTML = '<span class="yuan_pie-chip"></span><span></span><span class="yuan_pie-pct"></span>';
            yuan_li.querySelector('.yuan_pie-chip').style.background = yuan_counts[yuan_j].color;
            yuan_li.querySelectorAll('span')[1].textContent = yuan_counts[yuan_j].label + '：' + yuan_counts[yuan_j].count + ' 条';
            yuan_li.querySelector('.yuan_pie-pct').textContent = yuan_pct + '%';
            yuan_pieLegend.appendChild(yuan_li);
        }

        if (!yuan_total) {
            yuan_ctx.fillStyle = '#8590a6';
            yuan_ctx.font = '14px Microsoft YaHei';
            yuan_ctx.textAlign = 'center';
            yuan_ctx.fillText('暂无数据', yuan_cx, yuan_cy);
            return;
        }

        var yuan_start = -Math.PI / 2;
        for (var yuan_k = 0; yuan_k < yuan_counts.length; yuan_k++) {
            if (!yuan_counts[yuan_k].count) { continue; }
            var yuan_angle = yuan_counts[yuan_k].count / yuan_total * Math.PI * 2;
            yuan_ctx.beginPath();
            yuan_ctx.moveTo(yuan_cx, yuan_cy);
            yuan_ctx.arc(yuan_cx, yuan_cy, yuan_radius, yuan_start, yuan_start + yuan_angle);
            yuan_ctx.closePath();
            yuan_ctx.fillStyle = yuan_counts[yuan_k].color;
            yuan_ctx.fill();
            // 白色描边分隔扇区
            yuan_ctx.strokeStyle = '#fff';
            yuan_ctx.lineWidth = 2;
            yuan_ctx.stroke();
            yuan_start += yuan_angle;
        }

        // 中心白圆（环形图效果）+ 总数
        yuan_ctx.beginPath();
        yuan_ctx.arc(yuan_cx, yuan_cy, yuan_radius * 0.58, 0, Math.PI * 2);
        yuan_ctx.fillStyle = '#fff';
        yuan_ctx.fill();
        yuan_ctx.fillStyle = '#1f2a37';
        yuan_ctx.font = 'bold 26px Microsoft YaHei';
        yuan_ctx.textAlign = 'center';
        yuan_ctx.textBaseline = 'middle';
        yuan_ctx.fillText(String(yuan_total), yuan_cx, yuan_cy - 10);
        yuan_ctx.fillStyle = '#8590a6';
        yuan_ctx.font = '13px Microsoft YaHei';
        yuan_ctx.fillText('条评论', yuan_cx, yuan_cy + 18);
    }

    // ---------------- 下载结果 JSON ----------------
    function yuan_downloadJson() {
        var yuan_blob = new Blob([yuan_jsonView.textContent], { type: 'application/json;charset=utf-8' });
        var yuan_url = URL.createObjectURL(yuan_blob);
        var yuan_a = document.createElement('a');
        yuan_a.href = yuan_url;
        yuan_a.download = 'yuan_review_result.json';
        document.body.appendChild(yuan_a);
        yuan_a.click();
        document.body.removeChild(yuan_a);
        URL.revokeObjectURL(yuan_url);
    }

    // ---------------- 事件绑定 ----------------
    yuan_uploadBtn.addEventListener('click', yuan_upload);
    yuan_analyzeBtn.addEventListener('click', yuan_analyze);
    yuan_downloadJsonBtn.addEventListener('click', yuan_downloadJson);
    yuan_jsonSpec.textContent = yuan_jsonFormat;

    // file:// 直接双击打开时请求不到接口，给出明确提示
    if (window.location.protocol === 'file:') {
        yuan_setStatus('注意：本页依赖后端接口。请先运行 zhy 24001010302 目录下的 run.bat 启动后端，再通过 http://localhost:8302/review.html 访问本页；直接双击打开 HTML 文件会导致解析和请求失败。', 'err');
    }
})();
