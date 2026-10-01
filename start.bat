@echo off
title SIAP PINTAR Launcher
color 0A

echo ============================================
echo    SIAP PINTAR - Auto Launcher
echo ============================================
echo.
echo [1/2] Menjalankan Backend...
start "SIAP PINTAR - Backend" cmd /k "cd /d D:\siap_pintar\backend && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Menjalankan Frontend...
start "SIAP PINTAR - Frontend" cmd /k "cd /d D:\siap_pintar\frontend && npm run dev -- --host"

echo.
echo ============================================
echo  ✅ SIAP PINTAR sudah berjalan!
echo.
echo  Backend  : http://localhost:5000
echo  Frontend : http://localhost:5173
echo  Network  : cek jendela Frontend
echo ============================================
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul