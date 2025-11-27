"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-api";
import {
  getJobs,
  deleteJob,
  executeJob,
  pauseJob,
  resumeJob,
  getSchedulerStatus,
} from "@/lib/api";
import { createErrorHandler, toast } from "@/lib/error-handler";
import type { Job } from "@/lib/types";
import Link from "next/link";

export default function JobsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    jobId: string;
    jobName: string;
  }>({ isOpen: false, jobId: "", jobName: "" });

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  // 获取调度器状态
  const { data: schedulerData, isLoading: schedulerLoading } = useQuery({
    queryKey: ["scheduler-status"],
    queryFn: getSchedulerStatus,
    refetchInterval: 30000, // 每30秒刷新一次状态
  });

  const { data, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => getJobs({ page: 1, limit: 50 }),
    refetchInterval: 30000, // 每30秒刷新一次作业列表
  });

  const rawJobs: Job[] = Array.isArray(data?.data)
    ? (data?.data as Job[])
    : (data?.data as any)?.jobs ?? [];

  // 确保所有作业的 enabled 字段都是布尔值
  const jobs = rawJobs.map((job) => ({
    ...job,
    enabled: Boolean(
      (job.enabled as any) === true ||
        (job.enabled as any) === "true" ||
        (job.enabled as any) === 1
    ),
  }));

  const del = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("作业删除成功");
      setDeleteConfirm({ isOpen: false, jobId: "", jobName: "" });
    },
    onError: createErrorHandler("删除作业"),
  });

  const handleDeleteClick = (job: Job) => {
    setDeleteConfirm({
      isOpen: true,
      jobId: job.id,
      jobName: job.name,
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.jobId) {
      del.mutate(deleteConfirm.jobId);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, jobId: "", jobName: "" });
  };

  const exec = useMutation({
    mutationFn: (jobId: string) => {
      if (!schedulerData?.isRunning) {
        throw new Error("调度器未启动，无法执行作业。请先启动调度器。");
      }
      return executeJob(jobId);
    },
    onSuccess: () => {
      toast.success("作业执行成功");
    },
    onError: createErrorHandler("执行作业"),
  });

  const pause = useMutation({
    mutationFn: (jobId: string) => {
      if (!schedulerData?.isRunning) {
        throw new Error("调度器未启动，无法暂停作业。请先启动调度器。");
      }
      return pauseJob(jobId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("作业已暂停");
    },
    onError: createErrorHandler("暂停作业"),
  });

  const resume = useMutation({
    mutationFn: (jobId: string) => {
      if (!schedulerData?.isRunning) {
        throw new Error("调度器未启动，无法恢复作业。请先启动调度器。");
      }
      return resumeJob(jobId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("作业已恢复");
    },
    onError: createErrorHandler("恢复作业"),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-success/20 text-success";
      case "paused":
        return "bg-warning/20 text-warning";
      case "completed":
        return "bg-success/20 text-success";
      case "failed":
        return "bg-error/20 text-error";
      case "pending":
        return "bg-warning/20 text-warning";
      default:
        return "bg-muted/20 text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return (
          <svg
            className="w-3 h-3 text-success animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "paused":
        return (
          <svg
            className="w-3 h-3 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "completed":
        return (
          <svg
            className="w-3 h-3 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "failed":
        return (
          <svg
            className="w-3 h-3 text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "pending":
        return (
          <svg
            className="w-3 h-3 text-warning animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-3 h-3 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "http_request":
        return (
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
            />
          </svg>
        );
      case "function_call":
        return (
          <svg
            className="w-4 h-4 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        );
      case "shell_command":
        return (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "workflow":
        return (
          <svg
            className="w-4 h-4 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              作业管理
            </h1>
            <p className="text-muted-foreground">管理和监控您的调度作业</p>
          </div>
          <Link href="/jobs/new" className="btn btn-primary">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            新建作业
          </Link>
        </div>

        {/* 调度器状态提示 */}
        {schedulerLoading ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-blue-700 font-medium">
                正在检查调度器状态...
              </span>
            </div>
          </div>
        ) : !schedulerData?.isRunning ? (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span className="text-orange-700 font-medium">
                  调度器未启动
                </span>
              </div>
              <Link
                href="/"
                className="px-3 py-1 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 transition-colors"
              >
                前往启动
              </Link>
            </div>
            <p className="text-orange-600 mt-2">
              调度器当前处于停止状态，作业操作功能已禁用。请先启动调度器后再进行作业管理。
            </p>
          </div>
        ) : null}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-primary/10 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总作业数</p>
                <p className="text-2xl font-bold text-foreground">
                  {jobs.length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-success/10 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">运行中</p>
                <p className="text-2xl font-bold text-foreground">
                  {jobs.filter((j) => j.status === "running").length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-warning/10 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已暂停</p>
                <p className="text-2xl font-bold text-foreground">
                  {jobs.filter((j) => j.status === "paused").length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-accent/10 rounded-lg mr-4">
                <svg
                  className="w-6 h-6 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已启用</p>
                <p className="text-2xl font-bold text-foreground">
                  {jobs.filter((j) => j.enabled).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 作业列表 */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">作业列表</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">加载中...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-muted-foreground mb-4">暂无作业</p>
              <Link href="/jobs/new" className="btn btn-primary">
                创建第一个作业
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      作业信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      启用状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      下次执行
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            href={`/jobs/${job.id}`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {job.name}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {job.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="text-muted-foreground mr-2">
                            {getTypeIcon(job.type)}
                          </div>
                          <span className="text-sm text-foreground">
                            {job.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                        >
                          {getStatusIcon(job.status)}
                          <span className="ml-1.5">{job.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.enabled
                              ? "bg-success/20 text-success"
                              : "bg-muted/20 text-muted-foreground"
                          }`}
                        >
                          {job.enabled ? (
                            <svg
                              className="w-3 h-3 text-success mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-3 h-3 text-muted-foreground mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          {job.enabled ? "已启用" : "已禁用"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {job.nextExecuteAt
                          ? new Date(job.nextExecuteAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => exec.mutate(job.id)}
                            disabled={
                              !schedulerData?.isRunning || exec.isPending
                            }
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              !schedulerData?.isRunning
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                : "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg focus:ring-blue-500"
                            }`}
                            title={
                              !schedulerData?.isRunning
                                ? "调度器未启动"
                                : "立即执行"
                            }
                          >
                            {!schedulerData?.isRunning ? (
                              <svg
                                className="w-5 h-5 text-success animate-pulse"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                {/* 环形“任务运行中”状态图标 */}
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeDasharray="56"
                                  strokeDashoffset="14"
                                />
                                <path
                                  d="M12 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              // 未执行状态（立即执行按钮）
                              <svg
                                className="w-5 h-5 text-gray-700 hover:text-success transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                {/* 火箭图标，Heroicons风格 */}
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 2C9 5 8 9 8 12v1.5L4 17l2.5-4H8c.5-2 1.5-4 3-5.5V6l1.5 2C14 10 16 12 18 14l2 2-2 2-2-2c-2-2-4-4-6-6l-2-2h2.5C13 5 14 3 16 2h-4Z"
                                />
                              </svg>
                            )}
                          </button>
                          {job.status !== "paused" ? (
                            <button
                              onClick={() => pause.mutate(job.id)}
                              disabled={
                                !schedulerData?.isRunning || pause.isPending
                              }
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                !schedulerData?.isRunning
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg focus:ring-orange-500"
                              }`}
                              title={
                                !schedulerData?.isRunning
                                  ? "调度器未启动"
                                  : "暂停作业"
                              }
                            >
                              {!schedulerData?.isRunning ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => resume.mutate(job.id)}
                              disabled={
                                !schedulerData?.isRunning || resume.isPending
                              }
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                !schedulerData?.isRunning
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                  : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg focus:ring-green-500"
                              }`}
                              title={
                                !schedulerData?.isRunning
                                  ? "调度器未启动"
                                  : "恢复作业"
                              }
                            >
                              {!schedulerData?.isRunning ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                          <Link
                            href={`/jobs/${job.id}`}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                            title="查看详情"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                          <Link
                            href={`/jobs/${job.id}/edit`}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500 text-white hover:bg-purple-600 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            title="编辑作业"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(job)}
                            disabled={del.isPending}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              del.isPending
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                : "bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg focus:ring-red-500"
                            }`}
                            title="删除作业"
                          >
                            {del.isPending ? (
                              <svg
                                className="w-5 h-5 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  确认删除作业
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                您确定要删除作业 <span className="font-medium text-gray-900">&ldquo;{deleteConfirm.jobName}&rdquo;</span> 吗？
              </p>
              <p className="text-sm text-gray-500 mt-2">
                此操作无法撤销，作业的所有相关数据都将被永久删除。
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                disabled={del.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={del.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {del.isPending ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    删除中...
                  </>
                ) : (
                  "确认删除"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
