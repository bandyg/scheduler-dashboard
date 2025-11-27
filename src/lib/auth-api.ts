import axios from 'axios';
import type {
  LoginCredentials,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
  User
} from './auth-types';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy';

// 创建专门的认证API实例
export const authApi = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 仍然需要API密钥进行基础验证
    config.headers['X-API-Key'] = 'client-request';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理token过期
authApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      sessionStorage.removeItem('auth_token');
      
      // 只在客户端执行跳转
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * 用户登录
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const { data } = await authApi.post('/auth/login', credentials);
    
    // 存储认证信息
    if (data.success && data.data?.token) {
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem('auth_token', data.data.token);
      storage.setItem('user_info', JSON.stringify(data.data.user));
      
      // 设置API默认请求头
      authApi.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-changed'));
      }
    }
    
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.response?.data?.error?.code || 'LOGIN_FAILED',
        message: error.response?.data?.error?.message || '登录失败，请检查用户名和密码',
        details: error.response?.data?.error?.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 用户注册
 */
export async function register(input: RegisterInput): Promise<RegisterResponse> {
  try {
    const { data } = await authApi.post('/auth/register', input);
    
    // 注册成功后自动登录
    if (data.success && data.data?.token) {
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user_info', JSON.stringify(data.data.user));
      authApi.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
    }
    
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.response?.data?.error?.code || 'REGISTER_FAILED',
        message: error.response?.data?.error?.message || '注册失败，请检查输入信息',
        details: error.response?.data?.error?.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 忘记密码
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordResponse> {
  try {
    const { data } = await authApi.post('/auth/forgot-password', input);
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.response?.data?.error?.code || 'FORGOT_PASSWORD_FAILED',
        message: error.response?.data?.error?.message || '密码重置请求失败',
        details: error.response?.data?.error?.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 重置密码
 */
export async function resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResponse> {
  try {
    const { data } = await authApi.post('/auth/reset-password', input);
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.response?.data?.error?.code || 'RESET_PASSWORD_FAILED',
        message: error.response?.data?.error?.message || '密码重置失败',
        details: error.response?.data?.error?.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await authApi.get('/auth/me');
    return data.success ? data.data : null;
  } catch (error) {
    return null;
  }
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await authApi.post('/auth/logout');
  } catch (error) {
    // 忽略登出请求的错误
  } finally {
    // 清除本地存储的认证信息
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_info');
    
    // 清除API请求头
    delete authApi.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-changed'));
    }
  }
}

/**
 * 检查用户是否已登录
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  return !!token;
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const userStr = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * 更新本地存储的用户信息
 */
export function updateStoredUser(user: User): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
  storage.setItem('user_info', JSON.stringify(user));
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证用户名格式（邮箱或手机号）
 */
export function isValidUsername(username: string): boolean {
  return isValidEmail(username) || isValidPhone(username);
}

/**
 * 获取用户名类型
 */
export function getUsernameType(username: string): 'email' | 'phone' | 'invalid' {
  if (isValidEmail(username)) return 'email';
  if (isValidPhone(username)) return 'phone';
  return 'invalid';
}
