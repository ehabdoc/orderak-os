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
    <div className="flex h-screen flex-col bg-stone-50 dark:bg-stone-950">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white font-bold">
            O
          </div>
          <div>
            <div className="font-bold leading-tight">Orderak OS</div>
            <div className="text-xs text-stone-500">نظام كاشير وإدارة مطاعم</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* PWA install button */}
          {canInstall && (
            <button
              onClick={install}
              className="btn-outline !py-1.5 !px-3 text-sm"
              title="تثبيت التطبيق على الجهاز"
            >
              ⬇️ تثبيت
            </button>
          )}

          {/* Online/Offline indicator */}
          <div
            className={clsx(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
              online
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
            )}
          >
            <span
              className={clsx(
                'h-2 w-2 rounded-full',
                online ? 'bg-brand-500' : 'bg-amber-500',
              )}
            />
            {online ? 'متصل' : 'أوفلاين'}
          </div>

          {/* Sync button */}
          <button
            onClick={sync}
            disabled={syncing}
            className="btn-outline !py-1.5 !px-3 text-sm"
            title={pending > 0 ? `${pending} عملية في الانتظار` : 'مزامنة الآن'}
          >
            {syncing ? '⟳' : '↻'} مزامنة
            {pending > 0 && (
              <span className="mr-1 rounded-full bg-amber-500 px-1.5 text-white text-xs font-num">
                {pending}
              </span>
            )}
          </button>

          <button onClick={toggle} className="btn-ghost h-10 w-10 p-0" title="تبديل الوضع">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="text-sm">
            <div className="font-semibold">{user?.name}</div>
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
            className="btn-outline"
          >
            خروج
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 border-l border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <button
                  onClick={() => navigate(n.to)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-semibold transition-colors',
                    current.startsWith(n.to)
                      ? 'bg-brand-500 text-white'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
                  )}
                >
                  <span className="text-lg">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
