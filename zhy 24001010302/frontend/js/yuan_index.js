// 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
// 前端首页脚本：canvas 背景动画（漂浮粒子 + 近距连线），原生 JavaScript 实现
(function () {
    var yuan_canvas = document.getElementById('yuan_bgCanvas');
    var yuan_ctx = yuan_canvas.getContext('2d');
    var yuan_dpr = window.devicePixelRatio || 1;
    var yuan_particles = [];
    var yuan_width = 0;
    var yuan_height = 0;

    // 画布尺寸适配高清屏
    function yuan_resize() {
        yuan_width = window.innerWidth;
        yuan_height = window.innerHeight;
        yuan_canvas.width = yuan_width * yuan_dpr;
        yuan_canvas.height = yuan_height * yuan_dpr;
        yuan_ctx.setTransform(yuan_dpr, 0, 0, yuan_dpr, 0, 0);
    }

    // 生成粒子
    function yuan_initParticles() {
        yuan_particles = [];
        var yuan_count = Math.min(80, Math.floor(yuan_width / 14));
        for (var yuan_i = 0; yuan_i < yuan_count; yuan_i++) {
            yuan_particles.push({
                x: Math.random() * yuan_width,
                y: Math.random() * yuan_height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                r: Math.random() * 2.2 + 1
            });
        }
    }

    // 绘制一帧
    function yuan_draw() {
        // 背景渐变
        var yuan_grad = yuan_ctx.createLinearGradient(0, 0, yuan_width, yuan_height);
        yuan_grad.addColorStop(0, '#eaf4ff');
        yuan_grad.addColorStop(1, '#f6f8fb');
        yuan_ctx.fillStyle = yuan_grad;
        yuan_ctx.fillRect(0, 0, yuan_width, yuan_height);

        // 更新并绘制粒子
        var yuan_i = 0;
        for (yuan_i = 0; yuan_i < yuan_particles.length; yuan_i++) {
            var yuan_p = yuan_particles[yuan_i];
            yuan_p.x += yuan_p.vx;
            yuan_p.y += yuan_p.vy;
            if (yuan_p.x < 0 || yuan_p.x > yuan_width) { yuan_p.vx = -yuan_p.vx; }
            if (yuan_p.y < 0 || yuan_p.y > yuan_height) { yuan_p.vy = -yuan_p.vy; }

            yuan_ctx.beginPath();
            yuan_ctx.arc(yuan_p.x, yuan_p.y, yuan_p.r, 0, Math.PI * 2);
            yuan_ctx.fillStyle = 'rgba(0, 132, 255, 0.35)';
            yuan_ctx.fill();
        }

        // 近距粒子连线
        for (yuan_i = 0; yuan_i < yuan_particles.length; yuan_i++) {
            for (var yuan_j = yuan_i + 1; yuan_j < yuan_particles.length; yuan_j++) {
                var yuan_dx = yuan_particles[yuan_i].x - yuan_particles[yuan_j].x;
                var yuan_dy = yuan_particles[yuan_i].y - yuan_particles[yuan_j].y;
                var yuan_dist = Math.sqrt(yuan_dx * yuan_dx + yuan_dy * yuan_dy);
                if (yuan_dist < 130) {
                    yuan_ctx.beginPath();
                    yuan_ctx.moveTo(yuan_particles[yuan_i].x, yuan_particles[yuan_i].y);
                    yuan_ctx.lineTo(yuan_particles[yuan_j].x, yuan_particles[yuan_j].y);
                    yuan_ctx.strokeStyle = 'rgba(0, 132, 255, ' + (0.16 * (1 - yuan_dist / 130)).toFixed(3) + ')';
                    yuan_ctx.lineWidth = 1;
                    yuan_ctx.stroke();
                }
            }
        }

        window.requestAnimationFrame(yuan_draw);
    }

    yuan_resize();
    yuan_initParticles();
    yuan_draw();
    window.addEventListener('resize', function () {
        yuan_resize();
        yuan_initParticles();
    });
})();
