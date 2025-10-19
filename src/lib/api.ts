import axios from 'axios';
import type {
  Job,
  JobCreateInput,
  JobUpdateInput,
  JobsListResponse,
  JobResponse,
  ExecutionsResponse,
  HealthResponse,
  StatsResponse,
} from './types';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy';

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，为所有请求添加 X-API-Key 请求头
api.interceptors.request.use(
  (config) => {
    // 为所有请求添加 X-API-Key 请求头
    // 注意：这里我们使用一个固定的客户端标识，真正的验证在代理层进行
    config.headers['X-API-Key'] = 'client-request';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Jobs
export async function getJobs(params?: Record<string, any>): Promise<JobsListResponse> {
  const { data } = await api.get('/jobs', { params });
  return data;
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const { data } = await api.get(`/jobs/${jobId}`);
  return data;
}

export async function createJob(payload: JobCreateInput): Promise<JobResponse> {
  const { data } = await api.post('/jobs', payload);
  return data;
}

export async function updateJob(jobId: string, payload: JobUpdateInput): Promise<JobResponse> {
  const { data } = await api.put(`/jobs/${jobId}`, payload);
  return data;
}

export async function deleteJob(jobId: string): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/jobs/${jobId}`);
  return data;
}

export async function executeJob(jobId: string): Promise<any> {
  const { data } = await api.post(`/jobs/${jobId}/execute`);
  return data;
}

export async function pauseJob(jobId: string): Promise<any> {
  const { data } = await api.post(`/jobs/${jobId}/pause`);
  return data;
}

export async function resumeJob(jobId: string): Promise<any> {
  const { data } = await api.post(`/jobs/${jobId}/resume`);
  return data;
}

export async function getJobExecutions(jobId: string, params?: Record<string, any>): Promise<ExecutionsResponse> {
  const { data } = await api.get(`/jobs/${jobId}/executions`, { params });
  return data;
}

export async function getJobNextExecution(jobId: string): Promise<any> {
  const { data } = await api.get(`/jobs/${jobId}/next-execution`);
  return data;
}

// System
export async function getHealth(): Promise<HealthResponse['data']> {
  const response = await api.get('/system/health');
  // 处理三层嵌套的数据结构: response.data.data.data
  const result = response.data?.data?.data || response.data?.data || response.data;
  return result;
}

export async function getStats(): Promise<StatsResponse['data']> {
  const response = await api.get('/system/stats');
  // 处理三层嵌套的数据结构: response.data.data.data
  const result = response.data?.data?.data || response.data?.data || response.data;
  return result;
}

export async function startScheduler(): Promise<any> {
  const { data } = await api.post('/system/start');
  // 处理双重嵌套的数据结构: response.data.data.data
  return data.data?.data || data.data || data;
}

export async function stopScheduler(): Promise<any> {
  const { data } = await api.post('/system/stop', {
    graceful: true,
    timeout: 30000
  });
  // 处理双重嵌套的数据结构: response.data.data.data
  return data.data?.data || data.data || data;
}

export async function restartScheduler(): Promise<any> {
  const { data } = await api.post('/system/restart', {
    graceful: true,
    timeout: 30000
  });
  // 处理双重嵌套的数据结构: response.data.data.data
  return data.data?.data || data.data || data;
}

export async function getSchedulerStatus(): Promise<any> {
  const { data } = await api.get('/system/status');
  // 处理双重嵌套的数据结构: response.data.data.data
  return data.data?.data || data.data || data;
}

export async function cleanupHistory(): Promise<any> {
  const { data } = await api.post('/system/cleanup');
  return data;
}