#!/bin/bash

# PM2 部署脚本
# 使用方法: ./scripts/deploy.sh [port] [environment]


echo "🚀 开始部署 Scheduler Dashboard..."

# 构建应用
echo "📦 构建应用..."
npm run build

# 停止现有的PM2进程
echo "🛑 停止现有进程..."
pm2 stop scheduler-dashboard 2>/dev/null || true
pm2 delete scheduler-dashboard 2>/dev/null || true

# 启动新的PM2进程
echo "▶️ 启动新进程..."
pm2 start ecosystem.config.js 

# 显示状态
echo "📊 进程状态:"
pm2 status

echo "✅ 部署完成!"
