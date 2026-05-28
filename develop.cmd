@echo off
setlocal
set ROOT=%~dp0
"%ROOT%.tools\node\node.exe" "%ROOT%node_modules\@strapi\strapi\bin\strapi.js" develop