import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import { isAuthenticated } from '@/lib/auth-api';

export const metadata: Metadata = {
  title: "Scheduler Dashboard",
  description: "Manage schedule jobs efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLoggedIn = isAuthenticated();
  
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <header className="border-b">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <div className="font-semibold">Scheduler Dashboard</div>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/" className="hover:text-blue-600">概览</Link>
                <Link href="/jobs" className="hover:text-blue-600">作业管理</Link>
                {isLoggedIn && <UserNav />}
                {!isLoggedIn && (
                  <Link href="/login" className="hover:text-blue-600">登录</Link>
                )}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
