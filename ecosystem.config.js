module.exports = {
  apps: [
    {
      name: 'scheduler-dashboard',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BACKEND_API_BASE: 'http://localhost:8010/api/v1',
        API_KEY: 'scheduler-api-key-2025'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        BACKEND_API_BASE: 'http://localhost:8010/api/v1',
        API_KEY: 'scheduler-api-key-2025'
      },
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3001,
        BACKEND_API_BASE: 'http://localhost:8010/api/v1',
        API_KEY: 'scheduler-api-key-2025'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        BACKEND_API_BASE: 'http://localhost:8010/api/v1',
        API_KEY: 'scheduler-api-key-2025'
      },
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 进程管理
      min_uptime: '10s',
      max_restarts: 10,
      // 集群模式（可选）
      // instances: 'max', // 使用所有CPU核心
      // exec_mode: 'cluster'
    }
  ]
};