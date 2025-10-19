export type Schedule =
  | { type: 'cron'; cron: string; timezone?: string }
  | { type: 'interval'; value: number };

export type Job = {
  id: string;
  name: string;
  description?: string;
  type: 'http_request' | 'function_call' | 'shell_command' | 'workflow';
  enabled: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  schedule?: Schedule | string; // backend may return cron string directly
  config?: Record<string, any>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  nextExecuteAt?: string | null;
};

export type JobCreateInput = {
  name: string;
  description?: string;
  type: Job['type'];
  schedule: Schedule | string;
  config?: Record<string, any>;
  enabled?: boolean;
  maxRetries?: number;
  timeout?: number;
  tags?: string[];
  metadata?: Record<string, any>;
};

export type JobUpdateInput = Partial<Omit<JobCreateInput, 'type' | 'schedule'>> & {
  name?: string;
  description?: string;
  enabled?: boolean;
  maxRetries?: number;
  timeout?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
};

export type JobsListResponse = {
  success: boolean;
  data: Job[] | { jobs: Job[]; pagination?: Pagination };
  pagination?: Pagination;
  timestamp?: string;
};

export type JobResponse = {
  success: boolean;
  data: Job;
  timestamp?: string;
};

export type Execution = {
  id: string;
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggeredBy: 'manual' | 'schedule' | 'system';
  startTime?: string;
  endTime?: string;
  result?: {
    success: boolean;
    data?: any;
    error?: any;
    duration?: number;
    retryCount?: number;
  };
};

export type ExecutionsResponse = {
  success: boolean;
  data: Execution[] | { executions: Execution[]; pagination?: Pagination };
  pagination?: Pagination;
  timestamp?: string;
};

export type HealthResponse = {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services?: Record<string, { status: 'up' | 'down' | 'degraded'; details?: any }>;
    timestamp?: string;
  };
};

export type StatsResponse = {
  success: boolean;
  data: {
    totalJobs: number;
    activeJobs: number;
    pausedJobs: number;
    runningJobs: number;
    jobsByType?: Record<string, number>;
    jobsByStatus?: Record<string, number>;
    totalExecutions?: number;
    successfulExecutions?: number;
    failedExecutions?: number;
    averageExecutionTime?: number;
    uptime?: number;
    lastUpdated?: string;
  };
};

// 调度器状态相关类型
export type SchedulerStatus = {
  isRunning: boolean;
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error';
  startTime?: string;
  uptime?: number;
  version?: string;
  activeJobs?: number;
  queueSize?: number;
  lastHeartbeat?: string;
};

export type SchedulerStatusResponse = {
  success: boolean;
  data: SchedulerStatus;
  timestamp?: string;
};

// 通用API响应类型
export type ApiResponse<T = any> = {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
};

// 错误类型
export type ApiError = {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  response?: {
    data?: {
      error?: {
        message: string;
        code?: string;
      };
      message?: string;
    };
  };
};

// 作业下次执行时间响应
export type NextExecutionResponse = {
  success: boolean;
  data: {
    nextExecuteAt: string | null;
    timezone?: string;
  };
  timestamp?: string;
};

// 系统操作响应
export type SystemOperationResponse = {
  success: boolean;
  data: {
    message: string;
    status?: string;
  };
  timestamp?: string;
};