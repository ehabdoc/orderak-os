import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from './lib/store';
import { applyInitialTheme } from './lib/theme';
import { AppShell } from './components/AppShell';
import { db } from './db/dexie';
import { fullSync } from './db/sync';
import LoginScreen from './screens/Login/LoginScreen';
import MenuManagementScreen from './screens/Menu/MenuManagementScreen';
import DashboardScreen from './screens/Dashboard/DashboardScreen';
import OpenOrdersScreen from './screens/Orders/OpenOrdersScreen';
import OrderEntryScreen from './screens/Orders/OrderEntryScreen';
import PaymentScreen from './screens/Orders/PaymentScreen';
import ShiftOpenScreen from './screens/Shift/ShiftOpenScreen';
import ShiftCloseScreen from './screens/Shift/ShiftCloseScreen';
import type { Shift } from './types';

function Protected({ children, current }: { children: React.ReactNode; current: string }) {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const navigate = useNavigate();
  // Dexie's first() resolves undefined for "no row", so map it to null —
  // undefined stays reserved for "query still pending".
  const shift = useLiveQuery<Shift | null | undefined>(
    () =>
      user
        ? db.shifts
            .where('status')
            .equals('OPEN')
            .filter((s) => s.cashierId === user.id)
            .first()
            .then((s) => s ?? null)
        : Promise.resolve(undefined),
    [user?.id],
  );
  const location = useLocation();

  useEffect(() => {
    // Wait for session hydration before deciding where to send the user —
    // otherwise every refresh briefly looks logged-out and bounces to /login.
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // If no active shift and not on /shift already, force shift open
    // (but allow menu management & dashboard for admins; allow login redirect)
    if (shift === undefined) return; // still loading
    const adminAllowed =
      user.role === 'ADMIN' &&
      (location.pathname.startsWith('/menu') || location.pathname.startsWith('/dashboard'));
    if (shift === null && !adminAllowed && !location.pathname.startsWith('/shift')) {
      navigate('/shift', { replace: true });
    }
  }, [user, shift, loading, navigate, location.pathname]);

  if (loading || !user) return null;
  return <AppShell current={current}>{children}</AppShell>;
}

function ShiftScreen() {
  const user = useAuth((s) => s.user);
  // Dexie's first() resolves undefined for "no row", so map it to null —
  // undefined stays reserved for "query still pending".
  const shift = useLiveQuery<Shift | null | undefined>(
    () =>
      user
        ? db.shifts
            .where('status')
            .equals('OPEN')
            .filter((s) => s.cashierId === user.id)
            .first()
            .then((s) => s ?? null)
        : Promise.resolve(undefined),
    [user?.id],
  );
  if (shift === undefined) return <div className="p-6 text-stone-500">جاري التحميل...</div>;
  if (shift === null) return <ShiftOpenScreen />;
  return <ShiftCloseScreen />;
}

function Placeholder({ title, page }: { title: string; page: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-2 text-4xl">🛠️</div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-stone-500">
          شاشة <span className="font-num">{page}</span> — قيد التطوير.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);

  useEffect(() => {
    applyInitialTheme();
    hydrate();
  }, [hydrate]);

  // After login (or a refresh with a valid token), pull the menu into
  // IndexedDB so order entry works offline even on first load.
  useEffect(() => {
    if (user && !loading) {
      fullSync().catch(() => {});
    }
  }, [user, loading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/dashboard"
          element={
            <Protected current="/dashboard">
              <DashboardScreen />
            </Protected>
          }
        />
        <Route
          path="/orders"
          element={
            <Protected current="/orders">
              <OpenOrdersScreen />
            </Protected>
          }
        />
        <Route
          path="/orders/new"
          element={
            <Protected current="/orders">
              <OrderEntryScreen />
            </Protected>
          }
        />
        <Route
          path="/orders/:clientId/pay"
          element={
            <Protected current="/orders">
              <PaymentScreen />
            </Protected>
          }
        />
        <Route
          path="/shift"
          element={
            <Protected current="/shift">
              <ShiftScreen />
            </Protected>
          }
        />
        <Route
          path="/menu"
          element={
            <Protected current="/menu">
              <MenuManagementScreen />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
