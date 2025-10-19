"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs, getJobExecutions } from '@/lib/api';
import type { Job } from '@/lib/types';

export default function LogsPage() {
  const { data: jobsRes, isLoading: jobsLoading } = useQuery({ 
    queryKey: ['jobs-all'], 
    queryFn: () => getJobs({ page: 1, limit: 100 }) 
  });
  const jobs: Job[] = Array.isArray(jobsRes?.data)
    ? (jobsRes?.data as Job[])
    : (jobsRes?.data as any)?.jobs ?? [];

  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const { data: executionsRes, isLoading: executionsLoading } = useQuery({
    queryKey: ['logs', selectedJobId],
    queryFn: () => getJobExecutions(selectedJobId, { page: 1, limit: 20 }),
    enabled: !!selectedJobId,
  });
  const executions = Array.isArray(executionsRes?.data) 
    ? (executionsRes?.data as any) 
    : (executionsRes?.data as any)?.executions ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-success/20 text-success';
      case 'failed':
      case 'error':
        return 'bg-error/20 text-error';
      case 'running':
        return 'bg-primary/20 text-primary';
      case 'pending':
        return 'bg-warning/20 text-warning';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return (
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
      case 'error':
        return (
          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'running':
        return (
          <svg className="w-4 h-4 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 text-warning animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'manual':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
        );
      case 'scheduled':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'api':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return '-';
    return new Date(dateTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const selectedJob = jobs.find(job => job.id === selectedJobId);

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">操作日志</h1>
          <p className="text-muted-foreground">查看作业执行历史和详细日志</p>
        </div>

        {/* 作业选择器 */}
        <div className="card mb-8">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">选择作业</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-md">
                <label htmlFor="logs-job-select" className="block text-sm font-medium text-foreground mb-2">
                  作业名称
                </label>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-3 px-4 border border-border rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    <span className="text-sm text-muted-foreground">加载作业列表...</span>
                  </div>
                ) : (
                  <select 
                    id="logs-job-select" 
                    value={selectedJobId} 
                    onChange={(e) => setSelectedJobId(e.target.value)} 
                    className="form-select w-full"
                  >
                    <option value="">请选择要查看日志的作业</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                  </select>
                )}
              </div>
              
              {selectedJob && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="text-muted-foreground mr-2">类型:</span>
                    <span className="text-foreground font-medium">{selectedJob.type}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-muted-foreground mr-2">状态:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedJob.status)}`}>
                      {getStatusIcon(selectedJob.status)}
                      <span className="ml-1">{selectedJob.status}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 执行日志 */}
        {selectedJobId && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">执行日志</h2>
                {selectedJob && (
                  <div className="text-sm text-muted-foreground">
                    作业: <span className="font-medium text-foreground">{selectedJob.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            {executionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">加载执行日志...</span>
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted-foreground mb-2">暂无执行日志</p>
                <p className="text-sm text-muted-foreground">该作业还没有执行记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">执行ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">触发方式</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">开始时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">结束时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">耗时</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {executions.map((execution: any) => {
                      const startTime = execution.startTime ? new Date(execution.startTime) : null;
                      const endTime = execution.endTime ? new Date(execution.endTime) : null;
                      const duration = startTime && endTime ? endTime.getTime() - startTime.getTime() : null;
                      
                      return (
                        <tr key={execution.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-mono text-foreground">
                              {execution.id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="text-muted-foreground mr-2">
                                {getTriggerIcon(execution.triggeredBy)}
                              </div>
                              <span className="text-sm text-foreground capitalize">
                                {execution.triggeredBy === 'manual' ? '手动触发' : 
                                 execution.triggeredBy === 'scheduled' ? '定时触发' :
                                 execution.triggeredBy === 'api' ? 'API触发' : execution.triggeredBy}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                              {getStatusIcon(execution.status)}
                              <span className="ml-1.5 capitalize">{execution.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                            {formatDateTime(execution.startTime)}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                            {formatDateTime(execution.endTime)}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {duration ? (
                              <span className="font-mono">
                                {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}