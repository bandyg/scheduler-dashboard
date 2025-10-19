import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Scheduler Dashboard",
  description: "Manage schedule jobs efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                <Link href="/logs" className="hover:text-blue-600">操作日志</Link>
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
