rem 姓名：张浩扬 | 学号：24001010302 | 时间：2026-11-09 | 大模型：Xiaomi MiMo-V2.6-Pro
@echo off
chcp 65001 >nul
title 知乎网站模仿 - 后端服务
cd /d "%~dp0backend"
echo ============================================
echo   知乎网站模仿（三级项目）后端启动中...
echo   服务地址: http://localhost:8302
echo   按 Ctrl+C 可停止服务
echo ============================================
node app.js
pause
