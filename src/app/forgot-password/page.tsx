'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Mail, Phone, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation';
import { forgotPassword } from '@/lib/auth-api';
import { clsx } from 'clsx';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string>('');
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      username: '',
    }
  });

  const watchUsername = watch('username');

  // 根据输入自动判断重置方式
  const detectResetMethod = (username: string) => {
    if (username.includes('@')) {
      setResetMethod('email');
    } else if (/^1[3-9]\d{9}$/.test(username)) {
      setResetMethod('phone');
    }
  };

  // 监听用户名变化
  useState(() => {
    detectResetMethod(watchUsername);
  }, [watchUsername]);

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setResetError('');

    try {
      const response = await forgotPassword(data);
      
      if (response.success) {
        setResetSuccess(true);
      } else {
        const errorMessage = response.error?.message || '密码重置请求失败，请重试';
        setResetError(errorMessage);
      }
    } catch (error) {
      setResetError('网络连接失败，请检查网络设置');
      console.error('Forgot password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholder = () => {
    if (resetMethod === 'email') {
      return '请输入您的邮箱地址';
    } else if (resetMethod === 'phone') {
      return '请输入您的手机号';
    }
    return '请输入邮箱或手机号';
  };

  const getResetMethodText = () => {
    if (resetMethod === 'email') {
      return '我们将向您的邮箱发送密码重置链接';
    } else if (resetMethod === 'phone') {
      return '我们将向您的手机号发送验证码';
    }
    return '请输入您的账号信息以重置密码';
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              重置链接已发送
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {resetMethod === 'email' 
                ? '我们已向您的邮箱发送了密码重置链接，请查收邮件并按照指引操作。'
                : '我们已向您的手机号发送了验证码，请查收短信并输入验证码。'
              }
            </p>
          </div>

          <div className="card p-8 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">请检查您的{resetMethod === 'email' ? '邮箱' : '手机短信'}</p>
                  <p>
                    {resetMethod === 'email' 
                      ? '如果您没有收到邮件，请检查垃圾邮件文件夹。'
                      : '如果您没有收到短信，请检查手机信号。'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                返回登录页面
              </button>
              
              <button
                onClick={() => {
                  setResetSuccess(false);
                  setValue('username', '');
                  setResetError('');
                }}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                重新发送
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            {resetMethod === 'email' ? (
              <Mail className="h-6 w-6 text-white" />
            ) : (
              <Phone className="h-6 w-6 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            忘记密码
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {getResetMethodText()}
          </p>
        </div>

        {/* 重置密码表单 */}
        <div className="card p-8 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 用户名输入框 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                账号信息
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {resetMethod === 'email' ? (
                    <Mail className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Phone className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  {...register('username', {
                    onChange: (e) => detectResetMethod(e.target.value)
                  })}
                  type="text"
                  id="username"
                  className={clsx(
                    'form-input pl-10',
                    errors.username ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder={getPlaceholder()}
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

            {/* 错误提示 */}
            {resetError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{resetError}</p>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
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
                  发送中...
                </>
              ) : (
                '发送重置链接'
              )}
            </button>
          </form>

          {/* 返回登录 */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回登录页面
            </Link>
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