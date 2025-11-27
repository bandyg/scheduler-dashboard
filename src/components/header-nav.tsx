"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth-api';
import { UserNav } from '@/components/user-nav';

export function HeaderNav() {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const update = () => setLoggedIn(isAuthenticated());
    update();
    setMounted(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('auth-changed', update);
      window.addEventListener('storage', update);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-changed', update);
        window.removeEventListener('storage', update);
      }
    };
  }, []);

  return (
    <nav className="flex items-center gap-4 text-sm transition-all duration-300">
      <div className={`flex items-center gap-4 ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
        {loggedIn ? (
          <>
            <Link href="/" className="hover:text-blue-600 transition-colors duration-200">概览</Link>
            <Link href="/jobs" className="hover:text-blue-600 transition-colors duration-200">作业管理</Link>
            <UserNav />
          </>
        ) : (
          <Link href="/login" className="hover:text-blue-600 transition-colors duration-200">登录</Link>
        )}
      </div>
    </nav>
  );
}

