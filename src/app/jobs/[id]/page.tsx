"use client";

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJob, getJobExecutions, deleteJob, executeJob, pauseJob, resumeJob, getJobNextExecution, getSchedulerStatus } from '@/lib/api';
import { createErrorHandler, toast } from '@/lib/error-handler';
import Link from 'next/link';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id as string;
  const qc = useQueryClient();

  // 获取调度器状态
  const { data: schedulerData, isLoading: schedulerLoading, error: schedulerError } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: getSchedulerStatus,
    refetchInterval: 5000, // 每5秒刷新一次状态
  });

  const { data: jobRes } = useQuery({ 
    queryKey: ['job', jobId], 
    queryFn: () => getJob(jobId), 
    enabled: !!jobId,
    refetchInterval: 5000 // 每5秒刷新作业详情
  });
  const rawJob = (jobRes as any)?.data?.data; // 修复：访问双层嵌套的数据结构
  
  // 确保 enabled 字段是布尔值（后端可能返回字符串或数字）
  const enabledAny: any = (rawJob as any)?.enabled;
  const job = rawJob ? {
    ...rawJob,
    enabled: enabledAny === true || enabledAny === 'true' || enabledAny === 1
  } : undefined;

  // 状态与类型本地化映射
  const statusLabelMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    paused: '已暂停',
    cancelled: '已取消',
  };
  const typeLabelMap: Record<string, string> = {
    http_request: 'HTTP请求',
    function_call: '函数调用',
    shell_command: 'Shell命令',
    workflow: '工作流',
  };
  const getStatusLabel = (s?: string) => (s ? (statusLabelMap[s] ?? s) : '未知');
  const getTypeLabel = (t?: string) => (t ? (typeLabelMap[t] ?? t) : '未知');

  const { data: executionsRes } = useQuery({ queryKey: ['executions', jobId], queryFn: () => getJobExecutions(jobId, { page: 1, limit: 20 }), enabled: !!jobId, refetchInterval: 5000 });
  const executions = Array.isArray(executionsRes?.data) ? (executionsRes?.data as any) : (executionsRes?.data as any)?.executions ?? [];
  const { data: nextExec } = useQuery({ queryKey: ['next-exec', jobId], queryFn: () => getJobNextExecution(jobId), enabled: !!jobId, refetchInterval: 15000 });

  // 计算下次执行时间显示（需在nextExec声明之后）
  const rawNext = (nextExec as any)?.data?.data?.nextExecuteAt ?? (nextExec as any)?.data?.nextExecuteAt ?? job?.nextExecuteAt ?? null;
  const displayNext = rawNext ? (() => {
    try {
      const d = new Date(rawNext);
      // 确保时间是未来时间，如果是过去时间则显示"无"
      const now = new Date();

      return isNaN(d.getTime()) ? '无' : d.toLocaleString();
    } catch {
      return '无';
    }
  })() : '无';

  // 开发环境下的调试信息
  if (process.env.NODE_ENV === 'development' && rawJob) {
    console.log('Job Detail Debug - Raw job data:', rawJob);
    console.log('Job Detail Debug - Raw enabled value:', enabledAny, 'Type:', typeof enabledAny);
    console.log('Job Detail Debug - Processed enabled value:', job?.enabled, 'Type:', typeof job?.enabled);
    console.log('Job Detail Debug - Next execute API response:', nextExec);
    console.log('Job Detail Debug - Next execute raw:', rawNext);
    console.log('Job Detail Debug - Next execute display:', displayNext);
    console.log('Job Detail Debug - Current time:', new Date().toLocaleString());
  }
  
  // 开发环境下的调试信息
  if (process.env.NODE_ENV === 'development' && job) {
    console.log('Job Detail Debug - Job data:', job);
    console.log('Job Detail Debug - Enabled value:', job.enabled, 'Type:', typeof job.enabled);
  }
  
  const del = useMutation({ mutationFn: () => deleteJob(jobId), onSuccess: () => window.history.back() });
  
  const exec = useMutation({ 
    mutationFn: () => {
      if (!schedulerData?.isRunning) {
        throw new Error('调度器未启动，无法执行作业。请先启动调度器。');
      }
      return executeJob(jobId);
    },
    onSuccess: () => {
      toast.success('作业执行成功');
    },
    onError: createErrorHandler('执行作业')
  });
  
  const pause = useMutation({ 
    mutationFn: () => {
      if (!schedulerData?.isRunning) {
        throw new Error('调度器未启动，无法暂停作业。请先启动调度器。');
      }
      return pauseJob(jobId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('作业已暂停');
    },
    onError: createErrorHandler('暂停作业')
  });
  
  const resume = useMutation({ 
    mutationFn: () => {
      if (!schedulerData?.isRunning) {
        throw new Error('调度器未启动，无法恢复作业。请先启动调度器。');
      }
      return resumeJob(jobId);
    }, 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('作业已恢复');
    },
    onError: createErrorHandler('恢复作业')
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">作业详情</h1>
        <Link href="/jobs" className="text-sm text-blue-600">返回列表</Link>
      </div>

      {/* 调度器状态提示 */}
      {schedulerLoading ? (
        <div className="card border-warning bg-warning/10 p-4">
          <div className="text-sm text-warning">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warning"></div>
              正在检查调度器状态...
            </div>
          </div>
        </div>
      ) : schedulerError ? (
        <div className="card border-error bg-error/10 p-4">
          <div className="text-sm text-error">
            ⚠️ 无法连接到调度器服务，作业操作功能已禁用
          </div>
        </div>
      ) : !schedulerData?.isRunning ? (
        <div className="card border-warning bg-warning/10 p-4">
          <div className="text-sm text-warning">
            <div className="flex items-center justify-between">
              <span>⚠️ 调度器未启动，作业操作功能已禁用</span>
              <Link href="/" className="btn btn-sm bg-warning text-white hover:bg-warning/80">
                前往启动
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {job ? (
        <div className="rounded-lg border p-4 grid gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{job.name}</div>
              <div className="text-sm text-gray-600">类型: {getTypeLabel(job.type)}</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => exec.mutate()} 
                disabled={!schedulerData?.isRunning || exec.isPending}
                className={`px-3 py-2 rounded text-white text-sm transition-all ${
                  !schedulerData?.isRunning || exec.isPending
                    ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title={!schedulerData?.isRunning ? '调度器未启动' : ''}
              >
                {exec.isPending ? '执行中...' : '执行'}
              </button>
              {job.status !== 'paused' ? (
                <button 
                  onClick={() => pause.mutate()} 
                  disabled={!schedulerData?.isRunning || pause.isPending}
                  className={`px-3 py-2 rounded text-white text-sm transition-all ${
                    !schedulerData?.isRunning || pause.isPending
                      ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                  title={!schedulerData?.isRunning ? '调度器未启动' : ''}
                >
                  {pause.isPending ? '暂停中...' : '暂停'}
                </button>
              ) : (
                <button 
                  onClick={() => resume.mutate()} 
                  disabled={!schedulerData?.isRunning || resume.isPending}
                  className={`px-3 py-2 rounded text-white text-sm transition-all ${
                    !schedulerData?.isRunning || resume.isPending
                      ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  title={!schedulerData?.isRunning ? '调度器未启动' : ''}
                >
                  {resume.isPending ? '恢复中...' : '恢复'}
                </button>
              )}
              <button onClick={() => del.mutate()} className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700">删除</button>
              <Link href={`/jobs/${jobId}/edit`} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700">编辑</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">状态:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                job.status === 'running' 
                  ? 'bg-green-100 text-green-800' 
                  : job.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800'
                  : job.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {job.status === 'running' && (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {job.status === 'paused' && (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 0 0118 0z" />
                  </svg>
                )}
                {job.status === 'failed' && (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z" />
                  </svg>
                )}
                {getStatusLabel(job.status)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">启用:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                job.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {job.enabled ? (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {job.enabled ? '已启用' : '已禁用'}
              </span>
            </div>
          </div>
          <div className="text-sm">下次执行时间: {displayNext}</div>
          {job.description && <div className="text-sm text-gray-700">{job.description}</div>}
        </div>
      ) : (
        <div className="text-sm text-gray-600">加载详情...</div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">执行历史</h2>
        <div className="rounded-lg border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">执行ID</th>
                <th className="px-4 py-2 text-left">触发方式</th>
                <th className="px-4 py-2 text-left">状态</th>
                <th className="px-4 py-2 text-left">开始时间</th>
                <th className="px-4 py-2 text-left">结束时间</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 && (
                <tr><td className="px-4 py-3" colSpan={5}>暂无执行记录</td></tr>
              )}
              {executions.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-3">{e.id}</td>
                  <td className="px-4 py-3">{e.triggeredBy}</td>
                  <td className="px-4 py-3">{e.status}</td>
                  <td className="px-4 py-3">{e.startTime ?? '-'}</td>
                  <td className="px-4 py-3">{e.endTime ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}