import { useEffect, useState } from 'react';
import { useTheme } from './useTheme';
import { useAuth } from '../lib/store';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '../lib/useNetwork';
import { useInstallPrompt } from '../lib/useInstallPrompt';
import { pendingCount } from '../db/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import type { Shift } from '../types';
import clsx from 'clsx';

const NAV = [
  { to: '/orders', label: 'الطلبات', icon: '🧾' },
  { to: '/shift', label: 'الورديات', icon: '⏰' },
  { to: '/menu', label: 'القائمة', icon: '📋' },
  { to: '/dashboard', label: 'لوحة التحكم', icon: '📈' },
];

export function AppShell({ children, current }: { children: React.ReactNode; current: string }) {
  const { theme, toggle } = useTheme();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { online, syncing, sync } = useNetwork();
  const { canInstall, install } = useInstallPrompt();
  const shift = useLiveQuery<Shift | undefined>(
    () =>
      user
        ? db.shifts.where('status').equals('OPEN').filter((s) => s.cashierId === user.id).first()
        : Promise.resolve(undefined),
    [user?.id],
  );
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => pendingCount().then(setPending);
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-stone-50 dark:bg-stone-950">
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-stone-200 bg-white px-3 py-2 sm:px-6 sm:py-3 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white font-bold sm:h-9 sm:w-9">
            O
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold leading-tight text-sm sm:text-base">Orderak OS</div>
            <div className="hidden truncate text-xs text-stone-500 sm:block">نظام كاشير وإدارة مطاعم</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-3">
          {/* PWA install button */}
          {canInstall && (
            <button
              onClick={install}
              className="btn-outline !py-1.5 !px-2.5 text-xs sm:text-sm"
              title="تثبيت التطبيق على الجهاز"
            >
              ⬇️ <span className="hidden sm:inline">تثبيت</span>
            </button>
          )}

          {/* Online/Offline indicator */}
          <div
            className={clsx(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold sm:gap-2 sm:px-2.5',
              online
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
            )}
          >
            <span
              className={clsx(
                'h-2 w-2 shrink-0 rounded-full',
                online ? 'bg-brand-500' : 'bg-amber-500',
              )}
            />
            {online ? 'متصل' : 'أوفلاين'}
          </div>

          {/* Sync button */}
          <button
            onClick={sync}
            disabled={syncing}
            className="btn-outline shrink-0 !py-1.5 !px-2.5 text-xs sm:text-sm"
            title={pending > 0 ? `${pending} عملية في الانتظار` : 'مزامنة الآن'}
          >
            {syncing ? '⟳' : '↻'} <span className="hidden sm:inline">مزامنة</span>
            {pending > 0 && (
              <span className="mr-1 rounded-full bg-amber-500 px-1.5 text-white text-xs font-num">
                {pending}
              </span>
            )}
          </button>

          <button onClick={toggle} className="btn-ghost h-9 w-9 shrink-0 p-0" title="تبديل الوضع">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="hidden min-w-0 text-sm md:block">
            <div className="truncate font-semibold">{user?.name}</div>
            <div className="text-xs text-stone-500">
              {user?.role === 'ADMIN' ? 'مدير' : 'كاشير'}
              {shift && ' · وردية مفتوحة'}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn-outline shrink-0 !py-1.5 !px-3 text-xs sm:text-sm"
          >
            خروج
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden md:flex-row">
        <nav className="shrink-0 border-t border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900 md:w-56 md:border-l md:border-t-0 md:p-3">
          <ul className="flex flex-row justify-around gap-1 md:flex-col md:justify-start md:space-y-1">
            {NAV.map((n) => (
              <li key={n.to} className="flex-1 md:flex-none">
                <button
                  onClick={() => navigate(n.to)}
                  className={clsx(
                    'flex w-full flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold transition-colors sm:text-xs md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-right md:text-sm',
                    current.startsWith(n.to)
                      ? 'bg-brand-500 text-white'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
                  )}
                >
                  <span className="text-base md:text-lg">{n.icon}</span>
                  <span className="truncate">{n.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
