// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-19 14:29:19 | 大模型：Xiaomi MiMo-V2.6-Pro
// 功能：后台管理（仪表盘 Canvas 图表 + 用户/问题/回答 3 个实体的增删改查 + 搜索 + 分页 + 未登录跳转登录页）
// 所有接口请求与响应均输出到浏览器控制台；图表数据全部来自后端 /api/admin/stats 实时统计
(function () {
    'use strict';

    // ============ 登录鉴权：未登录直接跳转登录页 ============
    var yuan_token = localStorage.getItem('yuan_token') || sessionStorage.getItem('yuan_token') || '';
    if (!yuan_token) {
        location.href = './login.html';
        return;
    }

    // 统一请求头（携带 token，后端鉴权拦截）
    function yuan_headers() {
        return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + yuan_token };
    }

    // 后端返回 401（未登录 / 无权限）时清缓存并跳转登录页
    function yuan_checkAuth(yuan_result) {
        if (yuan_result && yuan_result.code === 401) {
            localStorage.removeItem('yuan_token');
            localStorage.removeItem('yuan_nickname');
            sessionStorage.removeItem('yuan_token');
            location.href = './login.html';
            return true;
        }
        return false;
    }

    // ============ DOM 引用 ============
    var yuan_viewTitle = document.getElementById('yuan_viewTitle');
    var yuan_viewDashboard = document.getElementById('yuan_view-dashboard');
    var yuan_viewEntity = document.getElementById('yuan_view-entity');
    var yuan_adminName = document.getElementById('yuan_adminName');
    var yuan_logoutBtn = document.getElementById('yuan_logoutBtn');
    var yuan_searchInput = document.getElementById('yuan_searchInput');
    var yuan_searchBtn = document.getElementById('yuan_searchBtn');
    var yuan_resetBtn = document.getElementById('yuan_resetBtn');
    var yuan_addBtn = document.getElementById('yuan_addBtn');
    var yuan_tableHead = document.getElementById('yuan_tableHead');
    var yuan_tableBody = document.getElementById('yuan_tableBody');
    var yuan_pageInfo = document.getElementById('yuan_pageInfo');
    var yuan_pageNum = document.getElementById('yuan_pageNum');
    var yuan_prevBtn = document.getElementById('yuan_prevBtn');
    var yuan_nextBtn = document.getElementById('yuan_nextBtn');
    var yuan_modalForm = document.getElementById('yuan_modalForm');
    var yuan_formTitle = document.getElementById('yuan_formTitle');
    var yuan_formBody = document.getElementById('yuan_formBody');
    var yuan_formMsg = document.getElementById('yuan_formMsg');
    var yuan_formCancel = document.getElementById('yuan_formCancel');
    var yuan_formSave = document.getElementById('yuan_formSave');
    var yuan_modalDetail = document.getElementById('yuan_modalDetail');
    var yuan_detailBody = document.getElementById('yuan_detailBody');
    var yuan_detailClose = document.getElementById('yuan_detailClose');
    var yuan_modalConfirm = document.getElementById('yuan_modalConfirm');
    var yuan_confirmText = document.getElementById('yuan_confirmText');
    var yuan_confirmCancel = document.getElementById('yuan_confirmCancel');
    var yuan_confirmOk = document.getElementById('yuan_confirmOk');

    // ============ 实体配置：用户 / 问题 / 回答（对应数据库 3 张表） ============
    function yuan_formatTime(yuan_v) {
        if (!yuan_v) { return '-'; }
        return String(yuan_v).replace('T', ' ').slice(0, 19);
    }
    function yuan_roleText(yuan_v) {
        return yuan_v === 'admin' ? '管理员' : '普通用户';
    }
    function yuan_cut(yuan_v, yuan_len) {
        var yuan_s = yuan_v === undefined || yuan_v === null ? '' : String(yuan_v);
        return yuan_s.length > yuan_len ? yuan_s.slice(0, yuan_len) + '…' : yuan_s;
    }

    var yuan_entityConf = {
        yuan_user: {
            yuan_label: '用户管理',
            yuan_searchTip: '搜索用户名 / 昵称',
            yuan_columns: [
                { yuan_key: 'yuan_id', yuan_title: 'ID' },
                { yuan_key: 'yuan_username', yuan_title: '用户名' },
                { yuan_key: 'yuan_nickname', yuan_title: '昵称' },
                {
                    yuan_key: 'yuan_role', yuan_title: '角色', yuan_render: function (yuan_v) {
                        var yuan_cls = yuan_v === 'admin' ? 'yuan_badge-admin' : 'yuan_badge-user';
                        return '<span class="yuan_badge ' + yuan_cls + '">' + yuan_roleText(yuan_v) + '</span>';
                    }
                },
                { yuan_key: 'yuan_created_at', yuan_title: '注册时间', yuan_render: yuan_formatTime }
            ],
            yuan_fields: [
                { yuan_key: 'yuan_username', yuan_label: '用户名', yuan_type: 'text', yuan_must: true, yuan_createOnly: true, yuan_placeholder: '3~20 位字母、数字、中文或下划线' },
                { yuan_key: 'yuan_password', yuan_label: '密码', yuan_type: 'password', yuan_must: true, yuan_placeholder: '6~20 位密码（编辑时留空则不修改）' },
                { yuan_key: 'yuan_nickname', yuan_label: '昵称', yuan_type: 'text' },
                { yuan_key: 'yuan_role', yuan_label: '角色', yuan_type: 'select', yuan_options: [{ yuan_value: 'user', yuan_text: '普通用户' }, { yuan_value: 'admin', yuan_text: '管理员' }] }
            ],
            yuan_detailKeys: [
                { yuan_key: 'yuan_id', yuan_label: 'ID' },
                { yuan_key: 'yuan_username', yuan_label: '用户名' },
                { yuan_key: 'yuan_nickname', yuan_label: '昵称' },
                { yuan_key: 'yuan_role', yuan_label: '角色', yuan_render: yuan_roleText },
                { yuan_key: 'yuan_created_at', yuan_label: '注册时间', yuan_render: yuan_formatTime }
            ]
        },
        yuan_question: {
            yuan_label: '问题管理',
            yuan_searchTip: '搜索标题 / 作者',
            yuan_columns: [
                { yuan_key: 'yuan_id', yuan_title: 'ID' },
                { yuan_key: 'yuan_title', yuan_title: '标题', yuan_render: function (yuan_v) { return '<span class="yuan_cell-cut" title="' + yuan_v + '">' + yuan_cut(yuan_v, 24) + '</span>'; } },
                { yuan_key: 'yuan_author', yuan_title: '作者' },
                { yuan_key: 'yuan_views', yuan_title: '浏览量' },
                { yuan_key: 'yuan_created_at', yuan_title: '发布时间', yuan_render: yuan_formatTime }
            ],
            yuan_fields: [
                { yuan_key: 'yuan_title', yuan_label: '标题', yuan_type: 'text', yuan_must: true, yuan_placeholder: '问题标题（必填）' },
                { yuan_key: 'yuan_content', yuan_label: '问题描述', yuan_type: 'textarea' },
                { yuan_key: 'yuan_author', yuan_label: '作者', yuan_type: 'text' },
                { yuan_key: 'yuan_views', yuan_label: '浏览量', yuan_type: 'number' }
            ],
            yuan_detailKeys: [
                { yuan_key: 'yuan_id', yuan_label: 'ID' },
                { yuan_key: 'yuan_title', yuan_label: '标题' },
                { yuan_key: 'yuan_content', yuan_label: '问题描述' },
                { yuan_key: 'yuan_author', yuan_label: '作者' },
                { yuan_key: 'yuan_views', yuan_label: '浏览量' },
                { yuan_key: 'yuan_created_at', yuan_label: '发布时间', yuan_render: yuan_formatTime }
            ]
        },
        yuan_answer: {
            yuan_label: '回答管理',
            yuan_searchTip: '搜索回答内容 / 作者',
            yuan_columns: [
                { yuan_key: 'yuan_id', yuan_title: 'ID' },
                { yuan_key: 'yuan_question_id', yuan_title: '所属问题' },
                { yuan_key: 'yuan_content', yuan_title: '回答内容', yuan_render: function (yuan_v) { return '<span class="yuan_cell-cut" title="' + yuan_v + '">' + yuan_cut(yuan_v, 24) + '</span>'; } },
                { yuan_key: 'yuan_author', yuan_title: '作者' },
                { yuan_key: 'yuan_votes', yuan_title: '赞同数' },
                { yuan_key: 'yuan_created_at', yuan_title: '回答时间', yuan_render: yuan_formatTime }
            ],
            yuan_fields: [
                { yuan_key: 'yuan_question_id', yuan_label: '所属问题 ID', yuan_type: 'number', yuan_must: true, yuan_placeholder: '填写已存在问题的 ID（必填）' },
                { yuan_key: 'yuan_content', yuan_label: '回答内容', yuan_type: 'textarea', yuan_must: true },
                { yuan_key: 'yuan_author', yuan_label: '作者', yuan_type: 'text' },
                { yuan_key: 'yuan_votes', yuan_label: '赞同数', yuan_type: 'number' }
            ],
            yuan_detailKeys: [
                { yuan_key: 'yuan_id', yuan_label: 'ID' },
                { yuan_key: 'yuan_question_id', yuan_label: '所属问题 ID' },
                { yuan_key: 'yuan_content', yuan_label: '回答内容' },
                { yuan_key: 'yuan_author', yuan_label: '作者' },
                { yuan_key: 'yuan_votes', yuan_label: '赞同数' },
                { yuan_key: 'yuan_created_at', yuan_label: '回答时间', yuan_render: yuan_formatTime }
            ]
        }
    };

    // 当前实体列表状态（搜索 + 分页）
    var yuan_state = { yuan_entity: 'yuan_user', yuan_keyword: '', yuan_page: 1, yuan_pageSize: 10, yuan_total: 0 };
    // 新增 / 编辑弹窗状态
    var yuan_formMode = 'add';
    var yuan_formRecord = null;

    // ============ 通用请求封装（请求与响应输出到控制台） ============
    function yuan_request(yuan_url, yuan_method, yuan_body) {
        console.log('===== 后台管理请求 =====');
        console.log(yuan_method + ' ' + yuan_url);
        if (yuan_body) { console.log(yuan_body); }
        return fetch(yuan_url, {
            method: yuan_method,
            headers: yuan_headers(),
            body: yuan_body ? JSON.stringify(yuan_body) : undefined
        })
            .then(function (yuan_resp) { return yuan_resp.json(); })
            .then(function (yuan_result) {
                console.log('===== 后台管理响应 =====');
                console.log(yuan_result);
                return yuan_result;
            });
    }

    // ============ 仪表盘：统计数据 + Canvas 图表 ============
    function yuan_loadStats() {
        yuan_request('/api/admin/stats', 'GET').then(function (yuan_result) {
            if (yuan_checkAuth(yuan_result)) { return; }
            if (yuan_result.code !== 0) { return; }
            var yuan_d = yuan_result.data;
            document.getElementById('yuan_statUser').textContent = yuan_d.yuan_totals.yuan_user;
            document.getElementById('yuan_statQuestion').textContent = yuan_d.yuan_totals.yuan_question;
            document.getElementById('yuan_statAnswer').textContent = yuan_d.yuan_totals.yuan_answer;

            // 图表数据（全部来自后端真实统计）
            yuan_chartData = {
                yuan_trend: yuan_d.yuan_userTrend,
                yuan_totals: yuan_d.yuan_totals,
                yuan_top: yuan_d.yuan_questionTop,
                yuan_role: yuan_d.yuan_roleDist
            };
            yuan_drawAllCharts();
        });
    }
    var yuan_chartData = null;

    // ---- Canvas 基础：按设备像素比放大，保证文字清晰 ----
    function yuan_setupCanvas(yuan_canvas) {
        var yuan_rect = yuan_canvas.getBoundingClientRect();
        var yuan_dpr = window.devicePixelRatio || 1;
        yuan_canvas.width = Math.round(yuan_rect.width * yuan_dpr);
        yuan_canvas.height = Math.round(yuan_rect.height * yuan_dpr);
        var yuan_ctx = yuan_canvas.getContext('2d');
        yuan_ctx.scale(yuan_dpr, yuan_dpr);
        return { yuan_ctx: yuan_ctx, yuan_w: yuan_rect.width, yuan_h: yuan_rect.height };
    }
    var yuan_colors = ['#0084ff', '#2f9e44', '#e8590c', '#9254de', '#e03131'];

    // ---- 折线图：最近 7 天注册趋势 ----
    function yuan_drawLine(yuan_canvas, yuan_items) {
        var yuan_c = yuan_setupCanvas(yuan_canvas);
        var yuan_ctx = yuan_c.yuan_ctx;
        var yuan_padL = 46, yuan_padR = 18, yuan_padT = 26, yuan_padB = 32;
        var yuan_w = yuan_c.yuan_w - yuan_padL - yuan_padR;
        var yuan_h = yuan_c.yuan_h - yuan_padT - yuan_padB;
        var yuan_values = yuan_items.map(function (y) { return y.yuan_count; });
        var yuan_max = Math.max.apply(null, yuan_values.concat([1]));
        var yuan_niceMax = Math.max(4, Math.ceil(yuan_max * 1.25));

        // 网格线 + Y 轴刻度
        yuan_ctx.font = '11px Microsoft YaHei';
        yuan_ctx.textAlign = 'right';
        yuan_ctx.textBaseline = 'middle';
        for (var yuan_i = 0; yuan_i <= 4; yuan_i++) {
            var yuan_y = yuan_padT + yuan_h - (yuan_h * yuan_i / 4);
            yuan_ctx.strokeStyle = '#e6ecf3';
            yuan_ctx.lineWidth = 1;
            yuan_ctx.beginPath();
            yuan_ctx.moveTo(yuan_padL, yuan_y);
            yuan_ctx.lineTo(yuan_padL + yuan_w, yuan_y);
            yuan_ctx.stroke();
            yuan_ctx.fillStyle = '#8590a6';
            yuan_ctx.fillText(String(Math.round(yuan_niceMax * yuan_i / 4)), yuan_padL - 8, yuan_y);
        }

        // 数据点
        var yuan_points = [];
        for (var yuan_j = 0; yuan_j < yuan_items.length; yuan_j++) {
            var yuan_x = yuan_padL + (yuan_items.length === 1 ? yuan_w / 2 : yuan_w * yuan_j / (yuan_items.length - 1));
            var yuan_py = yuan_padT + yuan_h - (yuan_h * yuan_items[yuan_j].yuan_count / yuan_niceMax);
            yuan_points.push({ x: yuan_x, y: yuan_py });
        }

        // 面积填充（扁平浅色）
        yuan_ctx.beginPath();
        yuan_ctx.moveTo(yuan_points[0].x, yuan_padT + yuan_h);
        for (var yuan_k = 0; yuan_k < yuan_points.length; yuan_k++) { yuan_ctx.lineTo(yuan_points[yuan_k].x, yuan_points[yuan_k].y); }
        yuan_ctx.lineTo(yuan_points[yuan_points.length - 1].x, yuan_padT + yuan_h);
        yuan_ctx.closePath();
        yuan_ctx.fillStyle = 'rgba(0, 132, 255, 0.12)';
        yuan_ctx.fill();

        // 折线
        yuan_ctx.beginPath();
        yuan_ctx.moveTo(yuan_points[0].x, yuan_points[0].y);
        for (var yuan_m = 1; yuan_m < yuan_points.length; yuan_m++) { yuan_ctx.lineTo(yuan_points[yuan_m].x, yuan_points[yuan_m].y); }
        yuan_ctx.strokeStyle = '#0084ff';
        yuan_ctx.lineWidth = 2.5;
        yuan_ctx.stroke();

        // 数据点圆点 + 数值标签 + X 轴日期
        yuan_ctx.textAlign = 'center';
        for (var yuan_n = 0; yuan_n < yuan_points.length; yuan_n++) {
            var yuan_p = yuan_points[yuan_n];
            yuan_ctx.beginPath();
            yuan_ctx.arc(yuan_p.x, yuan_p.y, 4, 0, Math.PI * 2);
            yuan_ctx.fillStyle = '#ffffff';
            yuan_ctx.fill();
            yuan_ctx.strokeStyle = '#0084ff';
            yuan_ctx.lineWidth = 2;
            yuan_ctx.stroke();
            // 数值
            yuan_ctx.fillStyle = '#0084ff';
            yuan_ctx.textBaseline = 'bottom';
            yuan_ctx.fillText(String(yuan_items[yuan_n].yuan_count), yuan_p.x, yuan_p.y - 8);
            // 日期（MM-DD）
            yuan_ctx.fillStyle = '#8590a6';
            yuan_ctx.textBaseline = 'top';
            yuan_ctx.fillText(yuan_items[yuan_n].yuan_day.slice(5), yuan_p.x, yuan_padT + yuan_h + 8);
        }
    }

    // ---- 柱状图：各实体数据量对比 ----
    function yuan_drawBar(yuan_canvas, yuan_items) {
        var yuan_c = yuan_setupCanvas(yuan_canvas);
        var yuan_ctx = yuan_c.yuan_ctx;
        var yuan_padL = 46, yuan_padR = 18, yuan_padT = 26, yuan_padB = 32;
        var yuan_w = yuan_c.yuan_w - yuan_padL - yuan_padR;
        var yuan_h = yuan_c.yuan_h - yuan_padT - yuan_padB;
        var yuan_values = yuan_items.map(function (y) { return y.yuan_value; });
        var yuan_max = Math.max.apply(null, yuan_values.concat([1]));
        var yuan_niceMax = Math.max(4, Math.ceil(yuan_max * 1.25));

        yuan_ctx.font = '11px Microsoft YaHei';
        // 网格 + Y 刻度
        for (var yuan_i = 0; yuan_i <= 4; yuan_i++) {
            var yuan_y = yuan_padT + yuan_h - (yuan_h * yuan_i / 4);
            yuan_ctx.strokeStyle = '#e6ecf3';
            yuan_ctx.lineWidth = 1;
            yuan_ctx.beginPath();
            yuan_ctx.moveTo(yuan_padL, yuan_y);
            yuan_ctx.lineTo(yuan_padL + yuan_w, yuan_y);
            yuan_ctx.stroke();
            yuan_ctx.fillStyle = '#8590a6';
            yuan_ctx.textAlign = 'right';
            yuan_ctx.textBaseline = 'middle';
            yuan_ctx.fillText(String(Math.round(yuan_niceMax * yuan_i / 4)), yuan_padL - 8, yuan_y);
        }

        // 柱子
        var yuan_slot = yuan_w / yuan_items.length;
        var yuan_barW = Math.min(64, yuan_slot * 0.5);
        for (var yuan_j = 0; yuan_j < yuan_items.length; yuan_j++) {
            var yuan_bh = yuan_h * yuan_items[yuan_j].yuan_value / yuan_niceMax;
            var yuan_bx = yuan_padL + yuan_slot * yuan_j + (yuan_slot - yuan_barW) / 2;
            var yuan_by = yuan_padT + yuan_h - yuan_bh;
            yuan_ctx.fillStyle = yuan_colors[yuan_j % yuan_colors.length];
            yuan_ctx.fillRect(yuan_bx, yuan_by, yuan_barW, yuan_bh);
            // 数值
            yuan_ctx.fillStyle = '#1f2a37';
            yuan_ctx.textAlign = 'center';
            yuan_ctx.textBaseline = 'bottom';
            yuan_ctx.fillText(String(yuan_items[yuan_j].yuan_value), yuan_bx + yuan_barW / 2, yuan_by - 6);
            // X 标签
            yuan_ctx.fillStyle = '#8590a6';
            yuan_ctx.textBaseline = 'top';
            yuan_ctx.fillText(yuan_items[yuan_j].yuan_name, yuan_bx + yuan_barW / 2, yuan_padT + yuan_h + 8);
        }
    }

    // ---- 饼图 / 环形图（doughnut 为 true 时中间留白） ----
    function yuan_drawPie(yuan_canvas, yuan_items, yuan_doughnut) {
        var yuan_c = yuan_setupCanvas(yuan_canvas);
        var yuan_ctx = yuan_c.yuan_ctx;
        var yuan_total = 0;
        for (var yuan_i = 0; yuan_i < yuan_items.length; yuan_i++) { yuan_total += yuan_items[yuan_i].yuan_value; }

        if (yuan_total === 0) {
            yuan_ctx.fillStyle = '#b3bdcc';
            yuan_ctx.font = '14px Microsoft YaHei';
            yuan_ctx.textAlign = 'center';
            yuan_ctx.textBaseline = 'middle';
            yuan_ctx.fillText('暂无数据', yuan_c.yuan_w / 2, yuan_c.yuan_h / 2);
            return;
        }

        // 饼在左，图例在右
        var yuan_cx = yuan_c.yuan_w * 0.32;
        var yuan_cy = yuan_c.yuan_h / 2;
        var yuan_r = Math.min(yuan_c.yuan_w * 0.28, yuan_c.yuan_h / 2 - 18);
        var yuan_start = -Math.PI / 2;
        for (var yuan_j = 0; yuan_j < yuan_items.length; yuan_j++) {
            var yuan_slice = Math.PI * 2 * yuan_items[yuan_j].yuan_value / yuan_total;
            yuan_ctx.beginPath();
            yuan_ctx.moveTo(yuan_cx, yuan_cy);
            yuan_ctx.arc(yuan_cx, yuan_cy, yuan_r, yuan_start, yuan_start + yuan_slice);
            yuan_ctx.closePath();
            yuan_ctx.fillStyle = yuan_colors[yuan_j % yuan_colors.length];
            yuan_ctx.fill();

            // 扇区内百分比标签（占比较大才显示，避免拥挤）
            var yuan_pct = yuan_items[yuan_j].yuan_value / yuan_total * 100;
            if (yuan_pct >= 8) {
                var yuan_mid = yuan_start + yuan_slice / 2;
                var yuan_lx = yuan_cx + Math.cos(yuan_mid) * yuan_r * 0.62;
                var yuan_ly = yuan_cy + Math.sin(yuan_mid) * yuan_r * 0.62;
                yuan_ctx.fillStyle = '#ffffff';
                yuan_ctx.font = 'bold 11px Microsoft YaHei';
                yuan_ctx.textAlign = 'center';
                yuan_ctx.textBaseline = 'middle';
                yuan_ctx.fillText(yuan_pct.toFixed(0) + '%', yuan_lx, yuan_ly);
            }
            yuan_start += yuan_slice;
        }

        // 环形图中心留白 + 合计
        if (yuan_doughnut) {
            yuan_ctx.beginPath();
            yuan_ctx.arc(yuan_cx, yuan_cy, yuan_r * 0.58, 0, Math.PI * 2);
            yuan_ctx.fillStyle = '#ffffff';
            yuan_ctx.fill();
            yuan_ctx.fillStyle = '#1f2a37';
            yuan_ctx.font = 'bold 16px Microsoft YaHei';
            yuan_ctx.textAlign = 'center';
            yuan_ctx.textBaseline = 'middle';
            yuan_ctx.fillText('合计 ' + yuan_total, yuan_cx, yuan_cy);
        }

        // 图例
        var yuan_lx2 = yuan_c.yuan_w * 0.62;
        var yuan_ly2 = yuan_cy - (yuan_items.length - 1) * 16;
        yuan_ctx.textAlign = 'left';
        yuan_ctx.textBaseline = 'middle';
        for (var yuan_k = 0; yuan_k < yuan_items.length; yuan_k++) {
            var yuan_ty = yuan_ly2 + yuan_k * 32;
            yuan_ctx.fillStyle = yuan_colors[yuan_k % yuan_colors.length];
            yuan_ctx.fillRect(yuan_lx2, yuan_ty - 6, 12, 12);
            yuan_ctx.fillStyle = '#1f2a37';
            yuan_ctx.font = '12px Microsoft YaHei';
            yuan_ctx.fillText(yuan_cut(yuan_items[yuan_k].yuan_name, 10), yuan_lx2 + 20, yuan_ty);
            yuan_ctx.fillStyle = '#8590a6';
            yuan_ctx.font = '11px Microsoft YaHei';
            yuan_ctx.fillText(yuan_items[yuan_k].yuan_value + '（' + (yuan_items[yuan_k].yuan_value / yuan_total * 100).toFixed(1) + '%）', yuan_lx2 + 20, yuan_ty + 15);
        }
    }

    // ---- 一次性绘制 4 个图表 ----
    function yuan_drawAllCharts() {
        if (!yuan_chartData) { return; }
        var yuan_trendItems = yuan_chartData.yuan_trend.map(function (y) { return { yuan_day: y.yuan_day, yuan_count: y.yuan_count }; });
        yuan_drawLine(document.getElementById('yuan_chartTrend'), yuan_trendItems);
        yuan_drawBar(document.getElementById('yuan_chartBar'), [
            { yuan_name: '用户', yuan_value: yuan_chartData.yuan_totals.yuan_user },
            { yuan_name: '问题', yuan_value: yuan_chartData.yuan_totals.yuan_question },
            { yuan_name: '回答', yuan_value: yuan_chartData.yuan_totals.yuan_answer }
        ]);
        var yuan_topItems = yuan_chartData.yuan_top.map(function (y) { return { yuan_name: y.yuan_title, yuan_value: y.yuan_views }; });
        yuan_drawPie(document.getElementById('yuan_chartPie'), yuan_topItems, false);
        var yuan_roleItems = yuan_chartData.yuan_role.map(function (y) { return { yuan_name: y.yuan_role, yuan_value: y.yuan_count }; });
        yuan_drawPie(document.getElementById('yuan_chartRole'), yuan_roleItems, true);
    }

    // 窗口尺寸变化时重绘图表，保证清晰不变形
    window.addEventListener('resize', function () {
        if (yuan_viewDashboard.style.display !== 'none') { yuan_drawAllCharts(); }
    });

    // ============ 视图切换（左侧菜单） ============
    function yuan_switchView(yuan_view) {
        var yuan_menuItems = document.querySelectorAll('.yuan_menu-item');
        for (var yuan_i = 0; yuan_i < yuan_menuItems.length; yuan_i++) {
            yuan_menuItems[yuan_i].classList.toggle('yuan_menu-on', yuan_menuItems[yuan_i].getAttribute('data-yuan-view') === yuan_view);
        }
        if (yuan_view === 'yuan_dashboard') {
            yuan_viewTitle.textContent = '仪表盘';
            yuan_viewDashboard.style.display = 'block';
            yuan_viewEntity.style.display = 'none';
            yuan_loadStats();
            return;
        }
        // 实体管理视图
        var yuan_conf = yuan_entityConf[yuan_view];
        yuan_viewTitle.textContent = yuan_conf.yuan_label;
        yuan_viewDashboard.style.display = 'none';
        yuan_viewEntity.style.display = 'block';
        yuan_state.yuan_entity = yuan_view;
        yuan_state.yuan_keyword = '';
        yuan_state.yuan_page = 1;
        yuan_searchInput.value = '';
        yuan_searchInput.placeholder = yuan_conf.yuan_searchTip;
        yuan_loadList();
    }
    var yuan_menuItems = document.querySelectorAll('.yuan_menu-item');
    for (var yuan_mi = 0; yuan_mi < yuan_menuItems.length; yuan_mi++) {
        (function (yuan_item) {
            yuan_item.addEventListener('click', function () {
                yuan_switchView(yuan_item.getAttribute('data-yuan-view'));
            });
        })(yuan_menuItems[yuan_mi]);
    }

    // ============ 列表加载（搜索 + 分页） ============
    function yuan_loadList() {
        var yuan_conf = yuan_entityConf[yuan_state.yuan_entity];
        var yuan_url = '/api/admin/' + yuan_state.yuan_entity + '/list' +
            '?yuan_keyword=' + encodeURIComponent(yuan_state.yuan_keyword) +
            '&yuan_page=' + yuan_state.yuan_page +
            '&yuan_pageSize=' + yuan_state.yuan_pageSize;
        yuan_request(yuan_url, 'GET').then(function (yuan_result) {
            if (yuan_checkAuth(yuan_result)) { return; }
            if (yuan_result.code !== 0) {
                yuan_tableBody.innerHTML = '<tr><td class="yuan_table-empty" colspan="' + (yuan_conf.yuan_columns.length + 1) + '">' + yuan_result.msg + '</td></tr>';
                return;
            }
            var yuan_d = yuan_result.data;
            yuan_state.yuan_total = yuan_d.yuan_total;

            // 表头
            var yuan_headHtml = '';
            for (var yuan_i = 0; yuan_i < yuan_conf.yuan_columns.length; yuan_i++) {
                yuan_headHtml += '<th>' + yuan_conf.yuan_columns[yuan_i].yuan_title + '</th>';
            }
            yuan_headHtml += '<th>操作</th>';
            yuan_tableHead.innerHTML = yuan_headHtml;

            // 表体
            if (yuan_d.yuan_list.length === 0) {
                yuan_tableBody.innerHTML = '<tr><td class="yuan_table-empty" colspan="' + (yuan_conf.yuan_columns.length + 1) + '">暂无数据</td></tr>';
            } else {
                var yuan_bodyHtml = '';
                for (var yuan_j = 0; yuan_j < yuan_d.yuan_list.length; yuan_j++) {
                    var yuan_row = yuan_d.yuan_list[yuan_j];
                    yuan_bodyHtml += '<tr>';
                    for (var yuan_k = 0; yuan_k < yuan_conf.yuan_columns.length; yuan_k++) {
                        var yuan_col = yuan_conf.yuan_columns[yuan_k];
                        var yuan_val = yuan_row[yuan_col.yuan_key];
                        var yuan_cell = yuan_col.yuan_render ? yuan_col.yuan_render(yuan_val, yuan_row) : (yuan_val === undefined || yuan_val === null ? '-' : String(yuan_val));
                        yuan_bodyHtml += '<td>' + yuan_cell + '</td>';
                    }
                    yuan_bodyHtml += '<td>' +
                        '<button class="yuan_btn-mini yuan_btn-view" data-yuan-act="view" data-yuan-id="' + yuan_row.yuan_id + '">详情</button>' +
                        '<button class="yuan_btn-mini yuan_btn-edit" data-yuan-act="edit" data-yuan-id="' + yuan_row.yuan_id + '">编辑</button>' +
                        '<button class="yuan_btn-mini yuan_btn-del" data-yuan-act="del" data-yuan-id="' + yuan_row.yuan_id + '">删除</button>' +
                        '</td>';
                    yuan_bodyHtml += '</tr>';
                }
                yuan_tableBody.innerHTML = yuan_bodyHtml;
            }

            // 分页信息
            var yuan_totalPage = Math.max(1, Math.ceil(yuan_state.yuan_total / yuan_state.yuan_pageSize));
            yuan_pageInfo.textContent = '共 ' + yuan_state.yuan_total + ' 条，每页 ' + yuan_state.yuan_pageSize + ' 条';
            yuan_pageNum.textContent = '第 ' + yuan_state.yuan_page + ' / ' + yuan_totalPage + ' 页';
            yuan_prevBtn.disabled = yuan_state.yuan_page <= 1;
            yuan_nextBtn.disabled = yuan_state.yuan_page >= yuan_totalPage;
        });
    }

    // 搜索 / 重置 / 分页按钮
    yuan_searchBtn.addEventListener('click', function () {
        yuan_state.yuan_keyword = yuan_searchInput.value.trim();
        yuan_state.yuan_page = 1;
        yuan_loadList();
    });
    yuan_searchInput.addEventListener('keydown', function (yuan_e) {
        if (yuan_e.key === 'Enter') { yuan_searchBtn.click(); }
    });
    yuan_resetBtn.addEventListener('click', function () {
        yuan_searchInput.value = '';
        yuan_state.yuan_keyword = '';
        yuan_state.yuan_page = 1;
        yuan_loadList();
    });
    yuan_prevBtn.addEventListener('click', function () {
        if (yuan_state.yuan_page > 1) { yuan_state.yuan_page--; yuan_loadList(); }
    });
    yuan_nextBtn.addEventListener('click', function () {
        var yuan_totalPage = Math.max(1, Math.ceil(yuan_state.yuan_total / yuan_state.yuan_pageSize));
        if (yuan_state.yuan_page < yuan_totalPage) { yuan_state.yuan_page++; yuan_loadList(); }
    });

    // ============ 新增 / 编辑 弹窗 ============
    function yuan_openForm(yuan_mode, yuan_record) {
        yuan_formMode = yuan_mode;
        yuan_formRecord = yuan_record || null;
        var yuan_conf = yuan_entityConf[yuan_state.yuan_entity];
        yuan_formTitle.textContent = (yuan_mode === 'add' ? '新增' : '编辑') + yuan_conf.yuan_label.replace('管理', '');
        yuan_formMsg.textContent = '';
        yuan_formMsg.className = 'yuan_form-msg';

        var yuan_html = '';
        for (var yuan_i = 0; yuan_i < yuan_conf.yuan_fields.length; yuan_i++) {
            var yuan_f = yuan_conf.yuan_fields[yuan_i];
            var yuan_val = yuan_record ? (yuan_record[yuan_f.yuan_key] === undefined || yuan_record[yuan_f.yuan_key] === null ? '' : yuan_record[yuan_f.yuan_key]) : '';
            var yuan_disabled = (yuan_mode === 'edit' && yuan_f.yuan_createOnly) ? ' disabled' : '';
            // 编辑时密码留空表示不修改
            if (yuan_mode === 'edit' && yuan_f.yuan_key === 'yuan_password') { yuan_val = ''; }
            var yuan_mustHtml = yuan_f.yuan_must ? '<span class="yuan_must">*</span>' : '';
            var yuan_inputHtml;
            if (yuan_f.yuan_type === 'textarea') {
                yuan_inputHtml = '<textarea class="yuan_form-input" data-yuan-key="' + yuan_f.yuan_key + '"' + yuan_disabled + ' placeholder="' + (yuan_f.yuan_placeholder || '') + '">' + yuan_val + '</textarea>';
            } else if (yuan_f.yuan_type === 'select') {
                yuan_inputHtml = '<select class="yuan_form-input" data-yuan-key="' + yuan_f.yuan_key + '"' + yuan_disabled + '>';
                for (var yuan_o = 0; yuan_o < yuan_f.yuan_options.length; yuan_o++) {
                    var yuan_opt = yuan_f.yuan_options[yuan_o];
                    yuan_inputHtml += '<option value="' + yuan_opt.yuan_value + '"' + (String(yuan_val) === yuan_opt.yuan_value ? ' selected' : '') + '>' + yuan_opt.yuan_text + '</option>';
                }
                yuan_inputHtml += '</select>';
            } else {
                yuan_inputHtml = '<input class="yuan_form-input" data-yuan-key="' + yuan_f.yuan_key + '" type="' + yuan_f.yuan_type + '" value="' + yuan_val + '"' + yuan_disabled + ' placeholder="' + (yuan_f.yuan_placeholder || '') + '">';
            }
            yuan_html += '<div class="yuan_form-row"><label class="yuan_form-label">' + yuan_f.yuan_label + yuan_mustHtml + '</label>' + yuan_inputHtml + '</div>';
        }
        yuan_formBody.innerHTML = yuan_html;
        yuan_modalForm.style.display = 'flex';
    }
    function yuan_closeForm() { yuan_modalForm.style.display = 'none'; }
    yuan_formCancel.addEventListener('click', yuan_closeForm);

    // 保存（新增 POST / 编辑 PUT）
    yuan_formSave.addEventListener('click', function () {
        var yuan_conf = yuan_entityConf[yuan_state.yuan_entity];
        var yuan_body = {};
        for (var yuan_i = 0; yuan_i < yuan_conf.yuan_fields.length; yuan_i++) {
            var yuan_f = yuan_conf.yuan_fields[yuan_i];
            var yuan_input = yuan_formBody.querySelector('[data-yuan-key="' + yuan_f.yuan_key + '"]');
            if (!yuan_input || yuan_input.disabled) { continue; }
            var yuan_val = yuan_input.value.trim();
            // 编辑时密码留空 → 不提交该字段（后端不修改密码）
            if (yuan_formMode === 'edit' && yuan_f.yuan_key === 'yuan_password' && yuan_val === '') { continue; }
            if (yuan_f.yuan_type === 'number') {
                if (yuan_val === '') {
                    if (yuan_f.yuan_must) { yuan_formMsg.textContent = '请填写' + yuan_f.yuan_label; yuan_formMsg.className = 'yuan_form-msg yuan_msg-err'; return; }
                    continue;
                }
                yuan_body[yuan_f.yuan_key] = Number(yuan_val);
            } else {
                if (yuan_val === '' && yuan_f.yuan_must) {
                    yuan_formMsg.textContent = '请填写' + yuan_f.yuan_label;
                    yuan_formMsg.className = 'yuan_form-msg yuan_msg-err';
                    return;
                }
                if (yuan_val !== '') { yuan_body[yuan_f.yuan_key] = yuan_val; }
            }
        }
        // 新增用户时提交用户名（createOnly 字段被禁用时从记录外读取）
        if (yuan_formMode === 'add' && yuan_state.yuan_entity === 'yuan_user') {
            var yuan_unInput = yuan_formBody.querySelector('[data-yuan-key="yuan_username"]');
            if (yuan_unInput && !yuan_body.yuan_username) { yuan_body.yuan_username = yuan_unInput.value.trim(); }
        }

        var yuan_url, yuan_method;
        if (yuan_formMode === 'add') {
            yuan_url = '/api/admin/' + yuan_state.yuan_entity;
            yuan_method = 'POST';
        } else {
            yuan_url = '/api/admin/' + yuan_state.yuan_entity + '/' + yuan_formRecord.yuan_id;
            yuan_method = 'PUT';
        }
        yuan_request(yuan_url, yuan_method, yuan_body).then(function (yuan_result) {
            if (yuan_checkAuth(yuan_result)) { return; }
            if (yuan_result.code === 0) {
                yuan_formMsg.textContent = yuan_result.msg;
                yuan_formMsg.className = 'yuan_form-msg yuan_msg-ok';
                setTimeout(function () {
                    yuan_closeForm();
                    yuan_loadList();
                }, 400);
            } else {
                yuan_formMsg.textContent = yuan_result.msg;
                yuan_formMsg.className = 'yuan_form-msg yuan_msg-err';
            }
        });
    });

    // ============ 详情弹窗 ============
    function yuan_openDetail(yuan_id) {
        yuan_request('/api/admin/' + yuan_state.yuan_entity + '/' + yuan_id, 'GET').then(function (yuan_result) {
            if (yuan_checkAuth(yuan_result)) { return; }
            if (yuan_result.code !== 0) {
                alert(yuan_result.msg);
                return;
            }
            var yuan_conf = yuan_entityConf[yuan_state.yuan_entity];
            var yuan_row = yuan_result.data;
            var yuan_html = '';
            for (var yuan_i = 0; yuan_i < yuan_conf.yuan_detailKeys.length; yuan_i++) {
                var yuan_f = yuan_conf.yuan_detailKeys[yuan_i];
                var yuan_raw = yuan_row[yuan_f.yuan_key];
                var yuan_val = yuan_f.yuan_render ? yuan_f.yuan_render(yuan_raw, yuan_row) : (yuan_raw === undefined || yuan_raw === null ? '-' : String(yuan_raw));
                yuan_html += '<div class="yuan_detail-row"><span class="yuan_detail-key">' + yuan_f.yuan_label + '</span><span class="yuan_detail-val">' + yuan_val + '</span></div>';
            }
            yuan_detailBody.innerHTML = yuan_html;
            yuan_modalDetail.style.display = 'flex';
        });
    }
    yuan_detailClose.addEventListener('click', function () { yuan_modalDetail.style.display = 'none'; });

    // ============ 删除确认 ============
    var yuan_deleteId = null;
    function yuan_openConfirm(yuan_id) {
        yuan_deleteId = yuan_id;
        yuan_confirmText.textContent = '确定要删除（ID：' + yuan_id + '）这条记录吗？删除后不可恢复。';
        yuan_modalConfirm.style.display = 'flex';
    }
    yuan_confirmCancel.addEventListener('click', function () { yuan_modalConfirm.style.display = 'none'; });
    yuan_confirmOk.addEventListener('click', function () {
        if (yuan_deleteId === null) { return; }
        yuan_request('/api/admin/' + yuan_state.yuan_entity + '/' + yuan_deleteId, 'DELETE').then(function (yuan_result) {
            if (yuan_checkAuth(yuan_result)) { return; }
            yuan_modalConfirm.style.display = 'none';
            if (yuan_result.code === 0) {
                yuan_loadList();
            } else {
                alert(yuan_result.msg);
            }
        });
    });

    // 表格操作按钮（事件委托：详情 / 编辑 / 删除）
    yuan_tableBody.addEventListener('click', function (yuan_e) {
        var yuan_btn = yuan_e.target.closest ? yuan_e.target.closest('[data-yuan-act]') : null;
        if (!yuan_btn) { return; }
        var yuan_act = yuan_btn.getAttribute('data-yuan-act');
        var yuan_id = Number(yuan_btn.getAttribute('data-yuan-id'));
        if (yuan_act === 'view') {
            yuan_openDetail(yuan_id);
        } else if (yuan_act === 'edit') {
            // 先取详情再打开编辑表单，保证表单内是完整数据
            yuan_request('/api/admin/' + yuan_state.yuan_entity + '/' + yuan_id, 'GET').then(function (yuan_result) {
                if (yuan_checkAuth(yuan_result)) { return; }
                if (yuan_result.code === 0) { yuan_openForm('edit', yuan_result.data); }
                else { alert(yuan_result.msg); }
            });
        } else if (yuan_act === 'del') {
            yuan_openConfirm(yuan_id);
        }
    });

    // 新增按钮
    yuan_addBtn.addEventListener('click', function () { yuan_openForm('add', null); });

    // ============ 退出登录 ============
    yuan_logoutBtn.addEventListener('click', function () {
        yuan_request('/api/user/logout', 'POST', { yuan_token: yuan_token }).then(function () {
            localStorage.removeItem('yuan_token');
            localStorage.removeItem('yuan_nickname');
            sessionStorage.removeItem('yuan_token');
            location.href = './login.html';
        });
    });

    // ============ 页面初始化 ============
    // 管理员昵称（登录时存的）
    yuan_adminName.textContent = localStorage.getItem('yuan_nickname') || 'admin';
    // 先加载仪表盘（同时校验登录状态，未登录会被拦截跳转）
    yuan_switchView('yuan_dashboard');

    // file:// 直接双击打开时请求不到接口，给出明确提示
    if (window.location.protocol === 'file:') {
        alert('注意：本页依赖后端接口。请先运行 zhy 24001010302 目录下的 run.bat 启动后端，再通过 http://localhost:8302/admin.html 访问本页。');
    }
})();
