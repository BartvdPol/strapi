@echo off
setlocal
set ROOT=%~dp0
"%ROOT%.tools\node\node.exe" --test "%ROOT%tests\*.test.js"