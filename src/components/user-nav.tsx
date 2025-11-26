/**
 * 用户导航组件
 * 显示当前登录用户信息和操作菜单
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { getStoredUser, logout } from '@/lib/auth-api';
import type { User as UserType } from '@/lib/auth-types';
import { clsx } from 'clsx';

export function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取用户信息
  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // 处理登出
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <User className="h-4 w-4 mr-2" />
        登录
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 用户头像和名称 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isOpen && 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <div className="flex items-center space-x-2">
          {/* 用户头像 */}
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || user.username}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-medium">
                {(user.name || user.username).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* 用户信息 */}
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user.name || user.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user.role === 'admin' ? '管理员' : '用户'}
            </div>
          </div>
        </div>
        
        {/* 下拉箭头 */}
        <ChevronDown className={clsx(
          'h-4 w-4 text-gray-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            {/* 用户信息头部 */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {(user.name || user.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name || user.username}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email || user.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* 菜单项 */}
            <div className="py-1">
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4 mr-3" />
                个人资料
              </Link>
              
              <Link
                href="/settings"
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4 mr-3" />
                账号设置
              </Link>
            </div>

            {/* 分隔线 */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* 登出按钮 */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 mr-3" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}