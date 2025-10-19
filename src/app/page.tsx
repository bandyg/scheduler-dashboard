"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  getHealth,
  getStats,
  startScheduler,
  stopScheduler,
  restartScheduler,
  getSchedulerStatus,
} from "@/lib/api";
import { createErrorHandler, toast } from "@/lib/error-handler";

export default function Home() {
  const queryClient = useQueryClient();

  // 本地状态管理，用于乐观更新
  const [optimisticSchedulerState, setOptimisticSchedulerState] = useState<
    boolean | null
  >(null);
  const [operationInProgress, setOperationInProgress] = useState<string | null>(
    null
  );
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 使用React Query获取数据
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: 30000,
    retry: 1,
    enabled: isClient, // 只在客户端执行
  });

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 30000,
    retry: 1,
    enabled: isClient, // 只在客户端执行
  });

  const {
    data: schedulerData,
    isLoading: statusLoading,
    error: schedulerError,
  } = useQuery({
    queryKey: ["scheduler-status"],
    queryFn: getSchedulerStatus,
    staleTime: 30000,
    retry: 1,
    enabled: isClient, // 只在客户端执行
  });

  // 当实际数据更新时，清除乐观状态
  useEffect(() => {
    if (
      schedulerData?.isRunning !== undefined &&
      optimisticSchedulerState !== null
    ) {
      // 如果实际状态与乐观状态一致，清除乐观状态
      if (schedulerData.isRunning === optimisticSchedulerState) {
        setOptimisticSchedulerState(null);
        setOperationInProgress(null);
      }
    }
  }, [schedulerData?.isRunning, optimisticSchedulerState]);

  // 获取当前显示的调度器状态（优先使用乐观状态）
  const currentSchedulerState =
    optimisticSchedulerState !== null
      ? optimisticSchedulerState
      : schedulerData?.isRunning;

  const startMutation = useMutation({
    mutationFn: startScheduler,
    onMutate: async () => {
      // 乐观更新
      setOptimisticSchedulerState(true);
      setOperationInProgress("starting");
    },
    onSuccess: () => {
      toast.success("调度器启动成功");
      // 立即刷新所有相关数据
      queryClient.invalidateQueries({ queryKey: ["scheduler-status"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });

      // 延迟清除操作状态，确保UI更新
      setTimeout(() => {
        setOperationInProgress(null);
      }, 1000);
    },
    onError: (error) => {
      // 回滚乐观更新
      setOptimisticSchedulerState(null);
      setOperationInProgress(null);
      createErrorHandler("启动调度器")(error);
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopScheduler,
    onMutate: async () => {
      // 乐观更新
      setOptimisticSchedulerState(false);
      setOperationInProgress("stopping");
    },
    onSuccess: () => {
      toast.success("调度器停止成功");
      // 立即刷新所有相关数据
      queryClient.invalidateQueries({ queryKey: ["scheduler-status"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });

      // 延迟清除操作状态，确保UI更新
      setTimeout(() => {
        setOperationInProgress(null);
      }, 1000);
    },
    onError: (error) => {
      // 回滚乐观更新
      setOptimisticSchedulerState(null);
      setOperationInProgress(null);
      createErrorHandler("停止调度器")(error);
    },
  });

  const restartMutation = useMutation({
    mutationFn: restartScheduler,
    onMutate: async () => {
      // 重启时先设为停止，然后设为启动
      setOptimisticSchedulerState(true);
      setOperationInProgress("restarting");
    },
    onSuccess: () => {
      toast.success("调度器重启成功");
      // 立即刷新所有相关数据
      queryClient.invalidateQueries({ queryKey: ["scheduler-status"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });

      // 延迟清除操作状态，确保UI更新
      setTimeout(() => {
        setOperationInProgress(null);
      }, 1000);
    },
    onError: (error) => {
      // 回滚乐观更新
      setOptimisticSchedulerState(null);
      setOperationInProgress(null);
      createErrorHandler("重启调度器")(error);
    },
  });

  // 按钮状态逻辑
  const isAnyOperationInProgress =
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    operationInProgress !== null;
  const isStartDisabled =
    currentSchedulerState === true || isAnyOperationInProgress;
  const isStopDisabled =
    currentSchedulerState === false || isAnyOperationInProgress;
  const isRestartDisabled = isAnyOperationInProgress;

  const healthStatus = health?.status ?? "unknown";
  const statsData = stats;

  // 错误状态显示
  const hasErrors = healthError || statsError || schedulerError;

  // 调试信息（仅在开发环境）
  if (process.env.NODE_ENV === "development") {
    console.log("Debug - Health data:", health);
    console.log("Debug - Stats data:", stats);
    console.log("Debug - Scheduler data:", schedulerData);
  }

  // 手动测试API函数
  const testAPI = async () => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("=== 手动测试API ===");
      }
      const healthResult = await getHealth();
      if (process.env.NODE_ENV === "development") {
        console.log("Health result:", healthResult);
      }

      const statsResult = await getStats();
      if (process.env.NODE_ENV === "development") {
        console.log("Stats result:", statsResult);
      }

      const statusResult = await getSchedulerStatus();
      if (process.env.NODE_ENV === "development") {
        console.log("Status result:", statusResult);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("API测试错误:", error);
      }
    }
  };

  // 调试组件
  const DebugInfo = () => (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">调试信息</h3>
      <button
        onClick={testAPI}
        className="bg-blue-500 text-white px-2 py-1 rounded mb-2"
      >
        手动测试API
      </button>
      <div>Health: {health ? JSON.stringify(health) : "undefined"}</div>
      <div>Health Status: {String(healthStatus || "unknown")}</div>
      <div>Health Loading: {String(healthLoading)}</div>
      <div>Health Error: {healthError ? String(healthError.message) : "null"}</div>
      <div>
        Stats:{" "}
        {statsData
          ? JSON.stringify(statsData).substring(0, 100) + "..."
          : "undefined"}
      </div>
      <div>Has Errors: {String(Boolean(hasErrors))}</div>
    </div>
  );

  // 初始化加载状态
  const isInitialLoading =
    (healthLoading && !health) ||
    (statsLoading && !stats) ||
    (statusLoading && !schedulerData);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            正在初始化系统
          </h2>
          <p className="text-muted-foreground mb-4">
            正在获取调度器状态和系统信息...
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  !healthLoading || health
                    ? "bg-success"
                    : "bg-warning animate-pulse"
                }`}
              ></div>
              <span>系统健康检查 {health ? "✓" : "..."}</span>
            </div>
            <div className="flex items-center justify-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  !statusLoading || schedulerData
                    ? "bg-success"
                    : "bg-warning animate-pulse"
                }`}
              ></div>
              <span>调度器状态 {schedulerData ? "✓" : "..."}</span>
            </div>
            <div className="flex items-center justify-center">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  !statsLoading || stats
                    ? "bg-success"
                    : "bg-warning animate-pulse"
                }`}
              ></div>
              <span>统计数据 {stats ? "✓" : "..."}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                调度器管理系统
              </h1>
              <p className="text-muted-foreground">
                实时监控和管理您的作业调度器
              </p>
            </div>
            {/* 状态同步指示器 */}
            <div className="text-right">
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    hasErrors ? "bg-error" : "bg-success animate-pulse"
                  }`}
                ></div>
                <span>{hasErrors ? "连接异常" : "实时同步"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                最后更新: {isClient ? new Date().toLocaleTimeString("zh-CN") : "--:--:--"}
              </div>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {hasErrors && (
          <div className="card border-error bg-error/10 p-4 mb-6">
            <div className="text-sm text-error">
              <div className="font-medium mb-2">连接错误</div>
              {healthError && <div>• 健康检查服务连接失败</div>}
              {statsError && <div>• 统计数据服务连接失败</div>}
              {schedulerError && <div>• 调度器状态服务连接失败</div>}
              <div className="mt-2 text-xs opacity-80">
                请检查API服务器是否正在运行 (端口3002)
              </div>
            </div>
          </div>
        )}

        {/* 系统状态概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 系统健康状态卡片 */}
          <div className="card p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  系统状态
                </p>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 animate-pulse ${
                      healthStatus === "healthy" ? "bg-success" : "bg-error"
                    }`}
                  ></div>
                  <span
                    className={`text-lg font-semibold ${
                      healthStatus === "healthy" ? "text-success" : "text-error"
                    }`}
                  >
                    {healthStatus === "healthy" ? "正常" : "异常"}
                  </span>
                </div>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  healthStatus === "healthy" ? "bg-success/10" : "bg-error/10"
                }`}
              >
                {healthStatus === "healthy" ? (
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-error"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* 作业总数卡片 */}
          <div className="card p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  作业总数
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {String(statsData?.totalJobs || 0)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
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
            </div>
          </div>

          {/* 运行中作业卡片 */}
          <div className="card p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  运行中作业
                </p>
                <p className="text-2xl font-bold text-success">
                  {String(statsData?.runningJobs || 0)}
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <svg
                  className={`w-6 h-6 text-success ${
                    statsData?.runningJobs ? "animate-pulse" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.6"
                  />
                  <path
                    d="M12 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-2 5 1.5 1.2L10 14l2 1.5 2-2.5 1.5 1.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* 调度器状态卡片 */}
          <div className="card p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  调度器状态
                </p>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${
                      currentSchedulerState
                        ? "bg-success animate-pulse"
                        : "bg-muted"
                    }`}
                  ></div>
                  <span
                    className={`text-lg font-semibold ${
                      currentSchedulerState
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  >
                    {operationInProgress === "starting"
                      ? "启动中..."
                      : operationInProgress === "stopping"
                      ? "停止中..."
                      : operationInProgress === "restarting"
                      ? "重启中..."
                      : currentSchedulerState
                      ? "运行中"
                      : "已停止"}
                  </span>
                </div>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  currentSchedulerState ? "bg-success/10" : "bg-muted/10"
                }`}
              >
                {operationInProgress ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                ) : currentSchedulerState ? (
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
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-4v4m0-4V6a2 2 0 012-2h2a2 2 0 012 2v4"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-muted-foreground"
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
              </div>
            </div>
          </div>
        </div>

        {/* 调度器控制面板 */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            调度器控制
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">调度器状态</p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  currentSchedulerState
                    ? "bg-success/20 text-success"
                    : "bg-error/20 text-error"
                }`}
              >
                {operationInProgress === "starting"
                  ? "启动中..."
                  : operationInProgress === "stopping"
                  ? "停止中..."
                  : operationInProgress === "restarting"
                  ? "重启中..."
                  : currentSchedulerState
                  ? "运行中"
                  : "已停止"}
              </span>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">活动作业</p>
              <p className="text-2xl font-bold text-primary">
                {String(statsData?.activeJobs || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">暂停作业</p>
              <p className="text-2xl font-bold text-accent">
                {String(statsData?.pausedJobs || 0)}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => startMutation.mutate()}
              disabled={isStartDisabled}
              className="btn btn-success disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(startMutation.isPending ||
                operationInProgress === "starting") && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              启动
            </button>
            <button
              onClick={() => stopMutation.mutate()}
              disabled={isStopDisabled}
              className="btn btn-error disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(stopMutation.isPending ||
                operationInProgress === "stopping") && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              停止
            </button>
            <button
              onClick={() => restartMutation.mutate()}
              disabled={isRestartDisabled}
              className="btn btn-warning disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(restartMutation.isPending ||
                operationInProgress === "restarting") && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              重启
            </button>
          </div>
        </div>

        {/* 统计信息面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 作业状态分布 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              作业状态分布
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: "pending",
                  name: "等待中",
                  count: statsData?.jobsByStatus?.pending || 0,
                  color: "bg-warning",
                },
                {
                  label: "running",
                  name: "运行中",
                  count: statsData?.jobsByStatus?.running || 0,
                  color: "bg-primary",
                },
                {
                  label: "completed",
                  name: "已完成",
                  count: statsData?.jobsByStatus?.completed || 0,
                  color: "bg-success",
                },
                {
                  label: "failed",
                  name: "失败",
                  count: statsData?.jobsByStatus?.failed || 0,
                  color: "bg-error",
                },
                {
                  label: "paused",
                  name: "暂停",
                  count: statsData?.jobsByStatus?.paused || 0,
                  color: "bg-muted",
                },
                {
                  label: "cancelled",
                  name: "取消",
                  count: statsData?.jobsByStatus?.cancelled || 0,
                  color: "bg-accent",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${item.color} mr-3`}
                    ></div>
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {String(item.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 作业类型分布 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              作业类型分布
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: "http_request",
                  name: "HTTP请求",
                  count: statsData?.jobsByType?.http_request || 0,
                  color: "bg-primary",
                },
                {
                  label: "function_call",
                  name: "函数调用",
                  count: statsData?.jobsByType?.function_call || 0,
                  color: "bg-success",
                },
                {
                  label: "shell_command",
                  name: "Shell命令",
                  count: statsData?.jobsByType?.shell_command || 0,
                  color: "bg-warning",
                },
                {
                  label: "workflow",
                  name: "工作流",
                  count: statsData?.jobsByType?.workflow || 0,
                  color: "bg-accent",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${item.color} mr-3`}
                    ></div>
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {String(item.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isClient && process.env.NODE_ENV === 'development' && <DebugInfo />}
    </div>
  );
}
