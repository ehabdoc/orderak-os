import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/dexie';
import { cancelOrder } from '../../lib/orders';
import { fmtPrice } from '../../lib/format';
import type { Order } from '../../types';
import clsx from 'clsx';

type Filter = 'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'الكل' },
  { key: 'DINE_IN', label: 'صالة' },
  { key: 'TAKEAWAY', label: 'سفري' },
  { key: 'DELIVERY', label: 'توصيل' },
];

const TYPE_LABELS: Record<Order['type'], string> = {
  DINE_IN: 'صالة',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
};

const TYPE_COLORS: Record<Order['type'], string> = {
  DINE_IN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  TAKEAWAY: 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
  DELIVERY: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
};

export default function OpenOrdersScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const orders = useLiveQuery(() => db.orders.toArray(), []) ?? [];

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.type === filter);
  const openOrders = filtered.filter((o) => o.status === 'OPEN');
  const closed = filtered.filter((o) => o.status === 'PAID');

  const elapsed = (createdAt: string) => {
    const m = Math.floor((now - new Date(createdAt).getTime()) / 60_000);
    if (m < 60) return `${m} دقيقة`;
    const h = Math.floor(m / 60);
    return `${h} ساعة ${m % 60} دقيقة`;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="card mb-4 p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500">01 — OPEN ORDERS</div>
            <h1 className="text-xl font-bold">الطلبات المفتوحة</h1>
            <p className="text-sm text-stone-500">
              <span className="font-num font-semibold text-brand-600">{openOrders.length}</span> طلب مفتوح
              · <span className="font-num">{closed.length}</span> مدفوع
            </p>
          </div>
          <button onClick={() => navigate('/orders/new')} className="btn-primary">
            + طلب جديد
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
                filter === f.key
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-stone-900 dark:text-brand-300'
                  : 'text-stone-600 dark:text-stone-400',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {openOrders.length === 0 && closed.length === 0 ? (
        <div className="card flex flex-1 items-center justify-center p-12 text-center text-stone-500">
          <div>
            <div className="mb-2 text-4xl">🧾</div>
            <div className="text-lg font-semibold">لا توجد طلبات</div>
            <p className="mt-1 text-sm">ابدأ بإنشاء طلب جديد</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {openOrders.map((o) => (
            <OrderCard key={o.clientId} order={o} elapsed={elapsed(o.createdAt)} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, elapsed }: { order: Order; elapsed: string }) {
  const navigate = useNavigate();
  const itemsPreview = order.items
    .slice(0, 2)
    .map((i) => `${i.qty}× ${i.name}`)
    .join('، ');
  const moreItems = order.items.length > 2 ? ` +${order.items.length - 2}` : '';

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between border-b border-stone-200 p-4 dark:border-stone-800">
        <div>
          <div className="text-lg font-bold font-num">
            رقم {order.number ?? '...'}
          </div>
          <div className="mt-0.5 text-xs text-stone-500">منذ {elapsed}</div>
        </div>
        <span className={clsx('badge', TYPE_COLORS[order.type])}>
          {TYPE_LABELS[order.type]}
        </span>
      </div>
      <div className="p-4">
        <div className="text-sm text-stone-700 dark:text-stone-300">
          {itemsPreview}
          {moreItems && <span className="text-stone-400">{moreItems}</span>}
        </div>
        {order.notes && (
          <div className="mt-2 text-xs text-stone-500">📝 {order.notes}</div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
          <div className="font-num text-lg font-bold text-brand-600 dark:text-brand-400">
            {fmtPrice(order.total)}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => navigate(`/orders/${order.clientId}/pay`)}
            className="btn-primary flex-1"
          >
            دفع
          </button>
          <button
            onClick={() => {
              if (confirm('إلغاء هذا الطلب؟')) {
                cancelOrder(order.clientId);
              }
            }}
            className="btn-danger"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
