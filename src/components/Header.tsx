'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudLightning, Database, Droplet, RefreshCw, Server, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Operations Dashboard', href: '/' },
    { label: 'Submit Report', href: '/reports' },
    { label: 'Intervention Queue', href: '/interventions' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Track */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Droplet className="w-6 h-6 fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                    JalSentry
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    जल संतरी
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 hidden sm:block">
                  Heat & Water Decision Support MVP
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* AWS Badges & Refresh */}
          <div className="flex items-center gap-2.5">
            {/* Prominent AWS Powered Badge for Hackathon Demo */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] font-medium text-amber-900 dark:text-amber-200 shadow-sm">
              <div className="flex items-center gap-1 text-amber-600">
                <Server className="w-3.5 h-3.5" />
                <CloudLightning className="w-3.5 h-3.5" />
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold">AWS:</span>
              <span className="text-zinc-600 dark:text-zinc-400">Lambda • DynamoDB • API Gateway</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Live AWS Service Connected" />
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh telemetry and reports"
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-zinc-200 dark:border-zinc-800 py-2 bg-zinc-50 dark:bg-zinc-900/50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs font-semibold px-2 py-1 rounded ${
                isActive ? 'text-blue-600 font-bold' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};
