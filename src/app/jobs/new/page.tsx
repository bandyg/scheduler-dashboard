"use client";

import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createJob, getSchedulerStatus } from '@/lib/api';
import { createErrorHandler, toast } from '@/lib/error-handler';
import type { JobCreateInput } from '@/lib/types';

const schema = z.object({
  name: z.string().min(1, '作业名称不能为空').max(50, '作业名称不能超过50个字符'),
  description: z.string().optional(),
  type: z.enum(['http_request', 'function_call', 'shell_command', 'workflow']),
  scheduleType: z.enum(['cron', 'interval']),
  cron: z.string().optional(),
  interval: z.number().optional(),
  enabled: z.boolean().default(true),
  tags: z.string().optional(),
  configJson: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewJobPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [lastSubmitAt, setLastSubmitAt] = useState<number>(0);

  // 获取调度器状态
  const { data: schedulerData, isLoading: schedulerLoading, error: schedulerError } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: getSchedulerStatus,
    refetchInterval: 30000, // 每30秒刷新一次状态
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'http_request',
      scheduleType: 'cron',
      enabled: true,
      cron: '0 */5 * * * *', // 默认每5分钟执行一次
      interval: 300000, // 默认5分钟间隔
    },
  });

  const scheduleType = watch('scheduleType');
  const jobType = watch('type');

  const mutation = useMutation({
    mutationFn: async (payload: JobCreateInput) => {
      // 在创建作业前检查调度器状态
      if (!schedulerData?.isRunning) {
        throw new Error('调度器未启动，无法创建作业。请先启动调度器。');
      }
      // 前端去重：使用 localStorage 记录短时间内已创建的作业名称
      const key = `created-job:${payload.name.toLowerCase()}`;
      const prev = localStorage.getItem(key);
      const now = Date.now();
      if (prev && now - Number(prev) < 5000) {
        throw new Error('短时间内重复创建同名作业，已阻止');
      }
      localStorage.setItem(key, String(now));
      return createJob(payload);
    },
    onSuccess: () => {
      toast.success('作业创建成功');
      router.push('/jobs');
    },
    onError: createErrorHandler('创建作业'),
  });

  // 配置验证和清理函数
  const validateAndCleanConfig = (configJson: string, jobType: string) => {
    if (!configJson) return undefined;
    
    const config = JSON.parse(configJson);
    
    // 对HTTP请求类型进行特殊处理
    if (jobType === 'http_request' && config) {
      // 清理URL中的前后空格
      if (config.url && typeof config.url === 'string') {
        config.url = config.url.trim();
        
        // 验证URL格式
        try {
          new URL(config.url);
        } catch (e) {
          throw new Error('URL格式不正确，请检查URL是否有效');
        }
      }
      
      // 验证必需字段
      if (!config.url) {
        throw new Error('HTTP请求作业必须包含URL配置');
      }
      
      if (!config.method) {
        config.method = 'GET'; // 默认方法
      }
      
      // 清理headers中的空值
      if (config.headers) {
        Object.keys(config.headers).forEach(key => {
          if (!config.headers[key] || config.headers[key].trim() === '') {
            delete config.headers[key];
          }
        });
      }
      
      // 设置默认超时时间
      if (!config.timeout) {
        config.timeout = 30000;
      }
    }
    
    return config;
  };

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    // 清除之前的错误
    setError(null);

    // 再次检查调度器状态
    if (!schedulerData?.isRunning) {
      toast.error('调度器未启动，无法创建作业。请先到主页启动调度器。');
      return;
    }

    // 前端防抖：避免快速重复点击提交
    const now = Date.now();
    if (now - lastSubmitAt < 1500) {
      toast.warning('提交过于频繁，请稍后再试');
      return;
    }
    setLastSubmitAt(now);

    try {
      // 验证和清理配置
      const cleanedConfig = validateAndCleanConfig(values.configJson || '', values.type);
      
      const payload: JobCreateInput = {
        name: values.name,
        description: values.description,
        type: values.type,
        schedule:
          values.scheduleType === 'cron'
            ? { type: 'cron', cron: values.cron || '0 */5 * * * *' }
            : { type: 'interval', value: values.interval || 300000 },
        enabled: values.enabled,
        tags: values.tags?.split(',').map(t => t.trim()).filter(Boolean),
        config: cleanedConfig,
      };
      mutation.mutate(payload);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '配置信息格式不正确，请检查JSON格式';
      setError(errorMessage);
    }
  };

  const getTypeIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'http_request':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
        );
      case 'function_call':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'shell_command':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'workflow':
        return (
          <svg className={`${iconClass} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      default:
        return null;
    }
  };

  const HelpIcon = ({ helpKey }: { helpKey: string }) => (
    <button
      type="button"
      onClick={() => setShowHelp(showHelp === helpKey ? null : helpKey)}
      className="ml-2 text-blue-500 hover:text-blue-700 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );

  const getHelpContent = (helpKey: string) => {
    const helpTexts: Record<string, string> = {
      name: '作业名称用于识别和管理您的定时任务，建议使用简洁明了的描述，如"每日数据备份"、"用户报告生成"等。',
      type: 'HTTP请求：调用网络接口；函数调用：执行代码函数；Shell命令：运行系统命令；工作流：执行复杂的多步骤任务。',
      schedule: 'Cron表达式：使用标准的时间格式，如"0 */5 * * * *"表示每5分钟执行一次；间隔执行：设置固定的时间间隔，单位为毫秒。',
      config: '根据作业类型配置具体参数。HTTP请求需要设置URL（注意：URL不能有前后空格，必须是完整的有效URL）和请求方法；Shell命令需要设置要执行的命令；函数调用需要设置函数名和参数。配置格式必须是有效的JSON。',
    };
    return helpTexts[helpKey] || '';
  };

  // 配置样本数据
  const getConfigTemplates = (type: string) => {
    const templates: Record<string, Array<{name: string, description: string, config: string}>> = {
      http_request: [
        {
          name: 'GET请求示例',
          description: '获取API数据的基础GET请求',
          config: `{
  "url": "https://api.example.com/users",
  "method": "GET",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-api-token"
  },
  "timeout": 30000
}`
        },
        {
          name: 'POST请求示例',
          description: '提交数据的POST请求',
          config: `{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-api-token"
  },
  "body": {
    "message": "定时任务执行完成",
    "timestamp": "{{timestamp}}"
  },
  "timeout": 30000
}`
        },
        {
          name: '健康检查',
          description: '定期检查服务状态',
          config: `{
  "url": "https://your-service.com/health",
  "method": "GET",
  "headers": {
    "User-Agent": "SchedulerBot/1.0"
  },
  "expectedStatus": 200,
  "timeout": 10000
}`
        },
        {
          name: '本地服务调用',
          description: '调用本地网络服务',
          config: `{
  "url": "http://192.168.1.100:8080/api/status",
  "method": "GET",
  "headers": {
    "Content-Type": "application/json"
  },
  "timeout": 30000
}`
        },
        {
          name: '数据同步',
          description: '定期同步外部数据',
          config: `{
  "url": "https://api.partner.com/sync",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-API-Key": "your-api-key"
  },
  "body": {
    "syncType": "incremental",
    "lastSync": "{{lastExecutionTime}}"
  },
  "retries": 3
}`
        }
      ],
      function_call: [
        {
          name: '数据处理函数',
          description: '处理和转换数据',
          config: `{
  "functionName": "processUserData",
  "module": "dataProcessor",
  "parameters": {
    "batchSize": 1000,
    "source": "database",
    "target": "warehouse",
    "format": "json"
  },
  "timeout": 300000
}`
        },
        {
          name: '报告生成',
          description: '生成定期报告',
          config: `{
  "functionName": "generateReport",
  "module": "reportGenerator",
  "parameters": {
    "reportType": "daily",
    "format": "pdf",
    "recipients": ["admin@company.com"],
    "includeCharts": true
  },
  "async": true
}`
        },
        {
          name: '缓存清理',
          description: '清理过期缓存数据',
          config: `{
  "functionName": "clearExpiredCache",
  "module": "cacheManager",
  "parameters": {
    "cacheType": "redis",
    "pattern": "temp:*",
    "maxAge": 86400
  },
  "timeout": 60000
}`
        },
        {
          name: '邮件发送',
          description: '批量发送邮件通知',
          config: `{
  "functionName": "sendBulkEmail",
  "module": "emailService",
  "parameters": {
    "template": "weekly-newsletter",
    "userSegment": "active_users",
    "maxBatch": 500
  },
  "retries": 2
}`
        }
      ],
      shell_command: [
        {
          name: '数据库备份',
          description: '定期备份数据库',
          config: `{
  "command": "mysqldump -u backup_user -p'password' --single-transaction mydb > /backups/mydb_$(date +%Y%m%d_%H%M%S).sql",
  "workingDirectory": "/opt/backups",
  "environment": {
    "MYSQL_PWD": "your_password"
  },
  "timeout": 1800000
}`
        },
        {
          name: '日志清理',
          description: '清理旧的日志文件',
          config: `{
  "command": "find /var/log/myapp -name '*.log' -mtime +7 -delete",
  "workingDirectory": "/var/log",
  "user": "logrotate",
  "timeout": 300000
}`
        },
        {
          name: '系统监控',
          description: '检查系统资源使用情况',
          config: `{
  "command": "df -h && free -m && ps aux --sort=-%cpu | head -10",
  "workingDirectory": "/tmp",
  "outputFile": "/var/log/system-monitor.log",
  "timeout": 30000
}`
        },
        {
          name: '文件同步',
          description: '同步文件到远程服务器',
          config: `{
  "command": "rsync -avz --delete /local/data/ user@remote:/backup/data/",
  "workingDirectory": "/local",
  "environment": {
    "SSH_KEY": "/home/user/.ssh/backup_key"
  },
  "timeout": 3600000
}`
        }
      ],
      workflow: [
        {
          name: '数据处理流水线',
          description: '完整的数据处理工作流',
          config: `{
  "steps": [
    {
      "name": "数据提取",
      "type": "http_request",
      "config": {
        "url": "https://api.source.com/data",
        "method": "GET"
      }
    },
    {
      "name": "数据转换",
      "type": "function_call",
      "config": {
        "functionName": "transformData",
        "parameters": {"format": "json"}
      }
    },
    {
      "name": "数据存储",
      "type": "shell_command",
      "config": {
        "command": "mysql -u user -p db < processed_data.sql"
      }
    }
  ],
  "onFailure": "stop",
  "retries": 1
}`
        },
        {
          name: '部署流水线',
          description: '自动化部署工作流',
          config: `{
  "steps": [
    {
      "name": "代码检出",
      "type": "shell_command",
      "config": {
        "command": "git pull origin main"
      }
    },
    {
      "name": "构建应用",
      "type": "shell_command",
      "config": {
        "command": "npm run build"
      }
    },
    {
      "name": "运行测试",
      "type": "shell_command",
      "config": {
        "command": "npm test"
      }
    },
    {
      "name": "部署通知",
      "type": "http_request",
      "config": {
        "url": "https://hooks.slack.com/webhook",
        "method": "POST",
        "body": {"text": "部署完成"}
      }
    }
  ],
  "onFailure": "rollback"
}`
        },
        {
          name: '监控告警',
          description: '系统监控和告警工作流',
          config: `{
  "steps": [
    {
      "name": "检查服务状态",
      "type": "http_request",
      "config": {
        "url": "https://api.myservice.com/health",
        "method": "GET"
      }
    },
    {
      "name": "检查数据库",
      "type": "function_call",
      "config": {
        "functionName": "checkDatabase",
        "parameters": {"timeout": 5000}
      }
    },
    {
      "name": "发送告警",
      "type": "http_request",
      "config": {
        "url": "https://api.alerting.com/alert",
        "method": "POST",
        "condition": "onFailure"
      }
    }
  ],
  "parallel": false
}`
        },
        {
          name: '报表生成流程',
          description: '定期生成和分发报表',
          config: `{
  "steps": [
    {
      "name": "收集数据",
      "type": "function_call",
      "config": {
        "functionName": "collectReportData",
        "parameters": {"period": "daily"}
      }
    },
    {
      "name": "生成报表",
      "type": "function_call",
      "config": {
        "functionName": "generateReport",
        "parameters": {"format": "pdf"}
      }
    },
    {
      "name": "发送邮件",
      "type": "http_request",
      "config": {
        "url": "https://api.email.com/send",
        "method": "POST",
        "body": {"to": "team@company.com"}
      }
    }
  ],
  "schedule": "daily"
}`
        }
      ]
    };
    return templates[type] || [];
  };

  const applyConfigTemplate = (template: string) => {
    setValue('configJson', template);
  };

  return (
    <div className="flex gap-8 max-w-7xl">
      {/* 主表单区域 */}
      <div className="flex-1 max-w-3xl">
        {/* 页面标题和说明 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">创建新的定时作业</h1>
          </div>
          <p className="text-gray-700 leading-relaxed">
            通过简单的配置，您可以创建各种类型的定时任务。系统支持HTTP接口调用、代码函数执行、系统命令运行等多种作业类型。
            请按照下方步骤填写作业信息，我们会为您提供详细的指引和示例。
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-700 font-medium">创建失败</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        )}

        {/* 调度器状态警告 */}
        {schedulerLoading ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-blue-700 font-medium">正在检查调度器状态...</span>
            </div>
          </div>
        ) : schedulerError ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-700 font-medium">无法连接到调度器</span>
            </div>
            <p className="text-yellow-600 mt-2">无法获取调度器状态，请检查系统连接。</p>
          </div>
        ) : !schedulerData?.isRunning ? (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-orange-700 font-medium">调度器未启动</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-3 py-1 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 transition-colors"
              >
                前往启动
              </button>
            </div>
            <p className="text-orange-600 mt-2">
              调度器当前处于停止状态，无法创建新作业。请先启动调度器后再创建作业。
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 font-medium">调度器运行正常</span>
            </div>
            <p className="text-green-600 mt-2">调度器正在运行，您可以正常创建和管理作业。</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 步骤1：基本信息 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">1</span>
              <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center">
                  <label htmlFor="new-job-name" className="block text-sm font-medium text-gray-700">
                    作业名称 <span className="text-red-500">*</span>
                  </label>
                  <HelpIcon helpKey="name" />
                </div>
                <p className="text-xs text-gray-500 mt-1">请输入不超过50字的作业名称，用于识别您的定时任务</p>
                <input 
                  {...register('name')} 
                  id="new-job-name" 
                  placeholder="例如：每日数据备份、用户报告生成"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
                {errors.name && <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.name.message}
                </p>}
                {showHelp === 'name' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    {getHelpContent('name')}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="new-job-description" className="block text-sm font-medium text-gray-700">
                  作业描述
                </label>
                <p className="text-xs text-gray-500 mt-1">可选，详细描述这个作业的用途和功能</p>
                <input 
                  {...register('description')} 
                  id="new-job-description" 
                  placeholder="例如：每天凌晨2点自动备份用户数据到云存储"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
              </div>
            </div>
          </div>

          {/* 步骤2：作业类型 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">2</span>
              <h2 className="text-lg font-semibold text-gray-900">选择作业类型</h2>
              <HelpIcon helpKey="type" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { value: 'http_request', label: 'HTTP请求', desc: '调用网络接口或API' },
                { value: 'function_call', label: '函数调用', desc: '执行预定义的代码函数' },
                { value: 'shell_command', label: 'Shell命令', desc: '运行系统命令或脚本' },
                { value: 'workflow', label: '工作流', desc: '执行复杂的多步骤任务' }
              ].map((type) => (
                <label key={type.value} className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                  jobType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <input
                    {...register('type')}
                    type="radio"
                    value={type.value}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 w-full">
                    {getTypeIcon(type.value)}
                    <div>
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.desc}</div>
                    </div>
                  </div>
                  {jobType === type.value && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
            
            {showHelp === 'type' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                {getHelpContent('type')}
              </div>
            )}
          </div>

          {/* 步骤3：执行计划 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">3</span>
              <h2 className="text-lg font-semibold text-gray-900">设置执行计划</h2>
              <HelpIcon helpKey="schedule" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">计划类型</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    scheduleType === 'cron' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <input
                      {...register('scheduleType')}
                      type="radio"
                      value="cron"
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <div className="font-medium">定时执行</div>
                        <div className="text-sm text-gray-500">按照指定时间执行</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    scheduleType === 'interval' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <input
                      {...register('scheduleType')}
                      type="radio"
                      value="interval"
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <div>
                        <div className="font-medium">间隔执行</div>
                        <div className="text-sm text-gray-500">按照固定间隔执行</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {scheduleType === 'cron' ? (
                <div>
                  <label htmlFor="new-job-cron" className="block text-sm font-medium text-gray-700">
                    定时表达式
                  </label>
                  <p className="text-xs text-gray-500 mt-1">使用标准的Cron格式，推荐使用我们提供的常用模板</p>
                  <input 
                    {...register('cron')} 
                    id="new-job-cron" 
                    placeholder="0 */5 * * * *"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono" 
                  />
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <button type="button" onClick={() => setValue('cron', '0 */5 * * * *')} className="p-2 bg-gray-100 rounded text-left hover:bg-gray-200 transition-colors">
                      <div className="font-medium">每5分钟</div>
                      <div className="text-gray-500 font-mono">0 */5 * * * *</div>
                    </button>
                    <button type="button" onClick={() => setValue('cron', '0 0 */1 * * *')} className="p-2 bg-gray-100 rounded text-left hover:bg-gray-200 transition-colors">
                      <div className="font-medium">每小时</div>
                      <div className="text-gray-500 font-mono">0 0 */1 * * *</div>
                    </button>
                    <button type="button" onClick={() => setValue('cron', '0 0 2 * * *')} className="p-2 bg-gray-100 rounded text-left hover:bg-gray-200 transition-colors">
                      <div className="font-medium">每天凌晨2点</div>
                      <div className="text-gray-500 font-mono">0 0 2 * * *</div>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="new-job-interval" className="block text-sm font-medium text-gray-700">
                    执行间隔（毫秒）
                  </label>
                  <p className="text-xs text-gray-500 mt-1">设置作业执行的时间间隔，1000毫秒 = 1秒</p>
                  <input 
                    type="number" 
                    {...register('interval', { valueAsNumber: true })} 
                    id="new-job-interval" 
                    placeholder="300000"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  />
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: '1分钟', value: 60000 },
                      { label: '5分钟', value: 300000 },
                      { label: '30分钟', value: 1800000 },
                      { label: '1小时', value: 3600000 }
                    ].map((preset) => (
                      <button 
                        key={preset.value}
                        type="button" 
                        onClick={() => setValue('interval', preset.value)} 
                        className="p-2 bg-gray-100 rounded text-center hover:bg-gray-200 transition-colors"
                      >
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-gray-500">{preset.value.toLocaleString()}ms</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {showHelp === 'schedule' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                {getHelpContent('schedule')}
              </div>
            )}
          </div>

          {/* 步骤4：高级配置 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">4</span>
              <h2 className="text-lg font-semibold text-gray-900">高级配置</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input 
                  type="checkbox" 
                  {...register('enabled')} 
                  id="new-job-enabled" 
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="new-job-enabled" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  创建后立即启用作业
                </label>
              </div>

              <div>
                <label htmlFor="new-job-tags" className="block text-sm font-medium text-gray-700">
                  标签分类
                </label>
                <p className="text-xs text-gray-500 mt-1">用逗号分隔多个标签，便于分类管理作业</p>
                <input 
                  {...register('tags')} 
                  id="new-job-tags" 
                  placeholder="例如：数据处理,每日任务,重要"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <label htmlFor="new-job-config" className="block text-sm font-medium text-gray-700">
                      作业配置
                    </label>
                    <HelpIcon helpKey="config" />
                  </div>
                  <div className="text-xs text-gray-500">
                    选择预设模板快速配置 →
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 mb-3">根据作业类型配置具体的执行参数</p>
                
                {/* 配置样本选择区域 */}
                {getConfigTemplates(jobType).length > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">配置模板</span>
                      <span className="text-xs text-gray-500">点击应用到配置框</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getConfigTemplates(jobType).map((template, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => applyConfigTemplate(template.config)}
                          className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm group-hover:text-blue-700">
                                {template.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {template.description}
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea 
                  {...register('configJson')} 
                  id="new-job-config" 
                  rows={12} 
                  placeholder={`请选择上方的配置模板，或手动输入JSON配置...`}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
                {showHelp === 'config' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    {getHelpContent('config')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button 
              type="button" 
              onClick={() => router.push('/jobs')} 
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={mutation.isPending || !schedulerData?.isRunning}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  创建中...
                </>
              ) : !schedulerData?.isRunning ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                  调度器未启动
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  创建作业
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 侧边栏操作指南 */}
      <div className="w-80 bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-fit sticky top-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          操作指南
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-bold rounded-full flex-shrink-0">1</span>
            <div>
              <h4 className="font-medium text-gray-900">填写基本信息</h4>
              <p className="text-sm text-gray-600 mt-1">输入作业名称和描述，名称要简洁明了</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-bold rounded-full flex-shrink-0">2</span>
            <div>
              <h4 className="font-medium text-gray-900">选择作业类型</h4>
              <p className="text-sm text-gray-600 mt-1">根据需要选择HTTP请求、函数调用等类型</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-bold rounded-full flex-shrink-0">3</span>
            <div>
              <h4 className="font-medium text-gray-900">设置执行计划</h4>
              <p className="text-sm text-gray-600 mt-1">选择定时执行或间隔执行，可使用预设模板</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-bold rounded-full flex-shrink-0">4</span>
            <div>
              <h4 className="font-medium text-gray-900">配置执行参数</h4>
              <p className="text-sm text-gray-600 mt-1">使用预设模板或手动填写配置信息</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium text-yellow-800">温馨提示</span>
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 点击 ? 图标查看详细说明</li>
            <li>• 可以使用预设的时间模板</li>
            <li>• 选择配置模板快速填写</li>
            <li>• 配置信息支持JSON格式</li>
            <li>• 创建后可在作业列表中管理</li>
          </ul>
        </div>

        {/* 当前选择的作业类型说明 */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {getTypeIcon(jobType)}
            <span className="text-sm font-medium text-blue-800">
              当前类型：{
                jobType === 'http_request' ? 'HTTP请求' :
                jobType === 'function_call' ? '函数调用' :
                jobType === 'shell_command' ? 'Shell命令' : '工作流'
              }
            </span>
          </div>
          <p className="text-sm text-blue-700">
            {
              jobType === 'http_request' ? '适用于调用REST API、Webhook通知、健康检查等场景' :
              jobType === 'function_call' ? '适用于数据处理、报告生成、缓存清理等内部函数调用' :
              jobType === 'shell_command' ? '适用于系统维护、文件操作、脚本执行等命令行任务' :
              '适用于复杂的多步骤任务，如CI/CD流水线、数据处理流程等'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
