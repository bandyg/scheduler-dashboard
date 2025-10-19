/**
 * 统一错误处理工具
 */

export interface ErrorInfo {
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
}

// 错误消息格式化
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  return '操作失败，请稍后重试';
}

// Toast 通知管理
class ToastManager {
  private toasts: Map<string, HTMLElement> = new Map();
  private container: HTMLElement | null = null;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(info: ErrorInfo) {
    const container = this.ensureContainer();
    const id = Date.now().toString();
    
    const toast = document.createElement('div');
    toast.className = `
      max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out
      ${this.getToastStyles(info.type)}
    `;
    
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${this.getIcon(info.type)}
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">${info.message}</p>
        </div>
        <div class="ml-4 flex-shrink-0">
          <button class="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.parentElement.parentElement.remove()">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    `;

    // 添加动画效果
    toast.style.transform = 'translateX(100%)';
    container.appendChild(toast);
    
    // 触发入场动画
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    this.toasts.set(id, toast);

    // 自动移除
    const duration = info.duration || (info.type === 'error' ? 5000 : 3000);
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  remove(id: string) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }

  private getToastStyles(type: ErrorInfo['type']): string {
    switch (type) {
      case 'error':
        return 'bg-red-50 border border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border border-green-200 text-green-800';
      case 'info':
      default:
        return 'bg-blue-50 border border-blue-200 text-blue-800';
    }
  }

  private getIcon(type: ErrorInfo['type']): string {
    switch (type) {
      case 'error':
        return `<svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
      case 'warning':
        return `<svg class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>`;
      case 'success':
        return `<svg class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
      case 'info':
      default:
        return `<svg class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
    }
  }
}

const toastManager = new ToastManager();

// 导出的便捷方法
export const toast = {
  error: (message: string, duration?: number) => 
    toastManager.show({ message: formatErrorMessage(message), type: 'error', duration }),
  
  warning: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'warning', duration }),
  
  success: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'success', duration }),
  
  info: (message: string, duration?: number) => 
    toastManager.show({ message, type: 'info', duration }),
};

// 统一的错误处理函数
export function handleError(error: any, context?: string): void {
  const message = formatErrorMessage(error);
  const contextMessage = context ? `${context}: ${message}` : message;
  
  console.error('Error occurred:', error);
  toast.error(contextMessage);
}

// 用于 React Query 的错误处理
export function createErrorHandler(context?: string) {
  return (error: any) => handleError(error, context);
}