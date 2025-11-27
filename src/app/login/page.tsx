'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { loginSchema, type LoginCredentials } from '@/lib/validation';
import { login, isAuthenticated } from '@/lib/auth-api';
import { clsx } from 'clsx';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    }
  });

  const watchRememberMe = watch('rememberMe');

  // 检查是否已登录
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  // 记住我功能 - 从localStorage恢复用户名
  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      setValue('username', savedUsername);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  // 处理记住我选项变化
  const handleRememberMeChange = (checked: boolean) => {
    setValue('rememberMe', checked);
    if (!checked) {
      localStorage.removeItem('remembered_username');
    }
  };

  // 处理登录表单提交
  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    setLoginError('');

    try {
      const response = await login(data);
      
      if (response.success && response.data) {
        // 处理记住我功能
        if (data.rememberMe) {
          localStorage.setItem('remembered_username', data.username);
        } else {
          localStorage.removeItem('remembered_username');
        }

        setLoginSuccess(true);
        
        // 登录成功，延迟跳转以显示成功消息
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        // 处理登录错误
        const errorMessage = response.error?.message || '登录失败，请检查用户名和密码';
        setLoginError(errorMessage);
        
        // 根据错误类型提供具体提示
        if (response.error?.code === 'USER_INACTIVE') {
          setLoginError('账号已被禁用，请联系管理员');
        } else if (response.error?.code === 'INVALID_CREDENTIALS') {
          setLoginError('用户名或密码错误');
        }
      }
    } catch (error) {
      setLoginError('网络连接失败，请检查网络设置');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取用户名输入框的占位符文本
  const getUsernamePlaceholder = () => {
    const username = watch('username');
    if (username.includes('@')) {
      return '请输入邮箱地址';
    } else if (/^1/.test(username)) {
      return '请输入手机号';
    }
    return '请输入邮箱或手机号';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            用户登录
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            请输入您的账号信息以继续
          </p>
        </div>

        {/* 登录表单 */}
        <div className="card p-8 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 用户名输入框 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <div className="input-wrap">
                <div className="input-icon-left">
                  <User className="h-5 w-5" />
                </div>
                <input
                  {...register('username')}
                  type="text"
                  id="username"
                  className={clsx(
                    'form-input input-with-left',
                    errors.username ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder={getUsernamePlaceholder()}
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* 密码输入框 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <div className="input-wrap">
                <div className="input-icon-left">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={clsx(
                    'form-input input-with-left input-with-right',
                    errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="input-icon-right icon-button text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 记住我和忘记密码 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  id="rememberMe"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  onChange={(e) => handleRememberMeChange(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  记住我
                </label>
              </div>
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  忘记密码？
                </Link>
              </div>
            </div>

            {/* 错误提示 */}
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{loginError}</p>
                </div>
              </div>
            )}

            {/* 成功提示 */}
            {loginSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-800 dark:text-green-200">登录成功，正在跳转...</p>
                </div>
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                'w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200',
                isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* 注册入口 */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              还没有账号？{' '}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                立即注册
              </Link>
            </p>
          </div>

          {/* 安全提示 */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <p>🔒 您的连接是安全的。我们使用HTTPS加密保护您的信息安全。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
