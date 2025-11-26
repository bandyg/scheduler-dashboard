'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, User, Mail, Phone, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { registerSchema, type RegisterInput, validatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/validation';
import { register as registerUser, isAuthenticated } from '@/lib/auth-api';
import { clsx } from 'clsx';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string>('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      name: '',
    }
  });

  const watchPassword = watch('password');
  const watchConfirmPassword = watch('confirmPassword');

  // 检查是否已登录
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  // 监听密码变化，实时计算密码强度
  useEffect(() => {
    if (watchPassword) {
      const strength = validatePasswordStrength(watchPassword);
      setPasswordStrength(strength.strength);
    } else {
      setPasswordStrength('weak');
    }
  }, [watchPassword]);

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setRegisterError('');

    try {
      const response = await registerUser(data);
      
      if (response.success && response.data) {
        setRegisterSuccess(true);
        
        // 注册成功，延迟跳转以显示成功消息
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        // 处理注册错误
        const errorMessage = response.error?.message || '注册失败，请检查输入信息';
        setRegisterError(errorMessage);
        
        // 根据错误类型提供具体提示
        if (response.error?.code === 'USER_EXISTS') {
          setRegisterError('用户名已存在，请使用其他用户名');
        } else if (response.error?.code === 'EMAIL_EXISTS') {
          setRegisterError('邮箱已被注册，请使用其他邮箱');
        } else if (response.error?.code === 'PHONE_EXISTS') {
          setRegisterError('手机号已被注册，请使用其他手机号');
        }
      }
    } catch (error) {
      setRegisterError('网络连接失败，请检查网络设置');
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            用户注册
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            创建您的新账户，开始使用我们的服务
          </p>
        </div>

        {/* 注册表单 */}
        <div className="card p-8 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 用户名输入框 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...formRegister('username')}
                  type="text"
                  id="username"
                  className={clsx(
                    'form-input pl-10',
                    errors.username ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="请输入用户名（邮箱或手机号）"
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

            {/* 邮箱和手机号输入框 */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  邮箱
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...formRegister('email')}
                    type="email"
                    id="email"
                    className={clsx(
                      'form-input pl-10',
                      errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                    placeholder="请输入邮箱地址"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  手机号
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...formRegister('phone')}
                    type="tel"
                    id="phone"
                    className={clsx(
                      'form-input pl-10',
                      errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                    placeholder="请输入手机号"
                    autoComplete="tel"
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* 姓名输入框 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                姓名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...formRegister('name')}
                  type="text"
                  id="name"
                  className={clsx(
                    'form-input pl-10',
                    errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="请输入您的姓名（可选）"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* 密码输入框 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...formRegister('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={clsx(
                    'form-input pl-10 pr-12',
                    errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="请输入密码"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              {watchPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">密码强度：</span>
                    <span className={clsx('font-medium', getPasswordStrengthColor(passwordStrength))}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all duration-300',
                        {
                          'bg-red-500 w-1/3': passwordStrength === 'weak',
                          'bg-yellow-500 w-2/3': passwordStrength === 'medium',
                          'bg-green-500 w-full': passwordStrength === 'strong',
                        }
                      )}
                    />
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 确认密码输入框 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...formRegister('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className={clsx(
                    'form-input pl-10 pr-12',
                    errors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {watchConfirmPassword && watchPassword === watchConfirmPassword && watchPassword && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  密码匹配
                </p>
              )}
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* 错误提示 */}
            {registerError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{registerError}</p>
                </div>
              </div>
            )}

            {/* 成功提示 */}
            {registerSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-800 dark:text-green-200">注册成功，正在跳转...</p>
                </div>
              </div>
            )}

            {/* 服务条款 */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="ml-3 text-sm">
                <label className="text-gray-600 dark:text-gray-400">
                  我已阅读并同意{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    服务条款
                  </Link>
                  {' '}和{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    隐私政策
                  </Link>
                </label>
              </div>
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                'w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200',
                isLoading
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  注册中...
                </>
              ) : (
                '注册账号'
              )}
            </button>
          </form>

          {/* 返回登录 */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              已有账号？{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                立即登录
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