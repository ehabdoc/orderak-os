import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/dexie';
import { fmtPrice } from '../../lib/format';

export default function DashboardScreen() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  const orders = useLiveQuery(() => db.orders.toArray(), []) ?? [];
  const menuItems = useLiveQuery(() => db.menuItems.toArray(), []) ?? [];

  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const totalSales = paidOrders.reduce((s, o) => s + o.total, 0);
  const orderCount = paidOrders.length;
  const avgTicket = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

  const costById = new Map(menuItems.map((m) => [m.id, m.cost]));
  const netProfit = paidOrders.reduce(
    (s, o) =>
      s +
      o.items.reduce(
        (ss, i) => ss + (i.price - (costById.get(i.menuItemId) ?? 0)) * i.qty,
        0,
      ),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-stone-500">03 — DASHBOARD</div>
        <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
        <p className="text-sm text-stone-500">
          مرحباً <span className="font-semibold">{user?.name}</span> — الأرقام أدناه
          من البيانات المحلية على هذا الجهاز.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إجمالي المبيعات" value={fmtPrice(totalSales)} accent="brand" />
        <KpiCard label="عدد الطلبات المدفوعة" value={String(orderCount)} />
        <KpiCard label="متوسط الفاتورة" value={fmtPrice(avgTicket)} />
        <KpiCard label="صافي الربح" value={fmtPrice(netProfit)} accent="brand" />
      </div>

      <div className="card p-6">
        <h2 className="mb-2 font-bold">ابدأ ورديتك</h2>
        <p className="mb-4 text-sm text-stone-500">
          افتح الوردية ثم ابدأ بتسجيل الطلبات. كل شيء محفوظ محلياً — حتى لو قطع النت.
        </p>
        <button onClick={() => navigate('/shift')} className="btn-primary">
          فتح / إغلاق الوردية
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: 'brand' }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div
        className={`mt-1 font-num text-2xl font-bold ${
          accent === 'brand' ? 'text-brand-600 dark:text-brand-400' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}
