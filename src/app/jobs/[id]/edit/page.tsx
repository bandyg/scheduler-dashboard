"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getJob, updateJob, getSchedulerStatus } from '@/lib/api';
import { createErrorHandler, toast } from '@/lib/error-handler';
import type { Job, JobUpdateInput } from '@/lib/types';
import Link from 'next/link';

const schema = z.object({
  name: z.string().min(1, '名称不能为空'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  tags: z.string().optional(),
  configJson: z.string().optional(),
  maxRetries: z.number().optional(),
  timeout: z.number().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params?.id as string;
  const [error, setError] = useState<string | null>(null);

  const { data: jobRes } = useQuery({ queryKey: ['job', jobId], queryFn: () => getJob(jobId), enabled: !!jobId });
  const rawJob = (jobRes as any)?.data?.data as Job | undefined; // 修复：访问双层嵌套的数据结构
  
  // 使用 useMemo 优化 job 对象，避免每次渲染都重新创建
  const job = useMemo(() => {
    if (!rawJob) return undefined;
    
    // 确保 enabled 字段是布尔值
    const enabledAny: any = rawJob.enabled;
    return {
      ...rawJob,
      enabled: enabledAny === true || enabledAny === 'true' || enabledAny === 1
    };
  }, [rawJob]);

  // 获取调度器状态
  const { 
    data: schedulerData, 
    isLoading: schedulerLoading, 
    isError: schedulerError 
  } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: getSchedulerStatus,
    refetchInterval: 30000, // 每30秒刷新一次
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      description: '',
      enabled: true,
      tags: '',
      configJson: '',
      maxRetries: undefined,
      timeout: undefined,
    }
  });

  useEffect(() => {
    if (job) {
      const formData = {
        name: job.name || '',
        description: job.description || '',
        enabled: job.enabled,
        tags: (job.tags ?? []).join(','),
        configJson: job.config ? JSON.stringify(job.config, null, 2) : '',
        maxRetries: (job as any)?.maxRetries || undefined,
        timeout: (job as any)?.timeout || undefined,
      };
      
      // 只使用 reset，不要同时使用 setValue
      reset(formData);
    }
  }, [job]); // 移除 reset 依赖项，避免无限循环

  const mutation = useMutation({
    mutationFn: async (payload: JobUpdateInput) => {
      // 检查调度器状态
      if (!schedulerData?.isRunning) {
        throw new Error('调度器未启动，无法更新作业配置');
      }
      return updateJob(jobId, payload);
    },
    onSuccess: () => {
      toast.success('作业更新成功');
      router.push(`/jobs/${jobId}`);
    },
    onError: createErrorHandler('更新作业'),
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
    try {
      // 检查调度器状态
      if (!schedulerData?.isRunning) {
        toast.error('调度器未启动，无法更新作业配置');
        return;
      }

      // 验证和清理配置
      const cleanedConfig = validateAndCleanConfig(values.configJson || '', job?.type || 'http_request');

      const payload: JobUpdateInput = {
        name: values.name,
        description: values.description,
        enabled: values.enabled,
        maxRetries: values.maxRetries,
        timeout: values.timeout,
        tags: values.tags?.split(',').map(t => t.trim()).filter(Boolean),
        config: cleanedConfig,
      } as any;
      mutation.mutate(payload);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '配置JSON格式不正确';
      setError(errorMessage);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">编辑作业</h1>
      
      {/* 调度器状态警告 */}
      {schedulerLoading ? (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-blue-700 font-medium">正在检查调度器状态...</span>
          </div>
        </div>
      ) : schedulerError ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 font-medium">无法连接到调度器</span>
            </div>
            <Link href="/" className="text-red-600 hover:text-red-800 underline text-sm">
              前往检查
            </Link>
          </div>
        </div>
      ) : !schedulerData?.isRunning ? (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
              <span className="text-orange-700 font-medium">调度器未启动，作业配置更新功能已禁用</span>
            </div>
            <Link href="/" className="text-orange-600 hover:text-orange-800 underline text-sm">
              前往启动
            </Link>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <label htmlFor="edit-job-name" className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            名称
          </label>
          <input {...register('name')} id="edit-job-name" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label htmlFor="edit-job-description" className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            描述
          </label>
          <input {...register('description')} id="edit-job-description" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <input type="checkbox" {...register('enabled')} id="edit-job-enabled" />
          <label htmlFor="edit-job-enabled" className="text-sm">启用</label>
        </div>
        <div>
          <label htmlFor="edit-job-tags" className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            标签 (逗号分隔)
          </label>
          <input {...register('tags')} id="edit-job-tags" placeholder="sync,daily" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-job-max-retries" className="flex items-center gap-2 text-sm text-gray-700 mb-1">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              最大重试次数
            </label>
            <input type="number" {...register('maxRetries', { valueAsNumber: true })} id="edit-job-max-retries" className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="edit-job-timeout" className="flex items-center gap-2 text-sm text-gray-700 mb-1">
              <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              超时毫秒
            </label>
            <input type="number" {...register('timeout', { valueAsNumber: true })} id="edit-job-timeout" className="mt-1 w-full rounded border px-3 py-2" />
          </div>
        </div>
        <div>
          <label htmlFor="edit-job-config" className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            配置JSON
          </label>
          <textarea {...register('configJson')} id="edit-job-config" rows={8} className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.push(`/jobs/${jobId}`)} className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            取消
          </button>
          <button 
            type="submit" 
            disabled={!schedulerData?.isRunning || mutation.isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              !schedulerData?.isRunning 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
            title={!schedulerData?.isRunning ? '调度器未启动' : '保存'}
          >
            {!schedulerData?.isRunning ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
                调度器未启动
              </>
            ) : mutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}