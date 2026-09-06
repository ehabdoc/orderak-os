import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/dexie';
import { closeShift, listPayments, listOrdersForShift } from '../../lib/orders';
import { useAuth } from '../../lib/store';
import { fmtPrice } from '../../lib/format';
import type { PaymentMethod, Shift } from '../../types';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'نقداً (كاش)',
  NETWORK: 'شبكة',
  TRANSFER: 'تحويل بنكي',
  WALLET: 'محفظة إلكترونية',
  ATEL: 'آجل — دين',
};

export default function ShiftCloseScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const shift = useLiveQuery<Shift | undefined>(
    () =>
      user
        ? db.shifts.where('status').equals('OPEN').filter((s) => s.cashierId === user.id).first()
        : Promise.resolve(undefined),
    [user?.id],
  );
  const [countedCash, setCountedCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const orders = useLiveQuery(
    async () => {
      if (!shift) return [];
      return listOrdersForShift(shift.clientId);
    },
    [shift?.clientId],
  ) ?? [];

  const openOrders = orders.filter((o) => o.status === 'OPEN').length;
  const paidOrders = orders.filter((o) => o.status === 'PAID');

  const [breakdown, setBreakdown] = useState<Record<PaymentMethod, number>>({
    CASH: 0,
    NETWORK: 0,
    TRANSFER: 0,
    WALLET: 0,
    ATEL: 0,
  });

  useEffect(() => {
    if (!shift) return;
    (async () => {
      const totals: Record<PaymentMethod, number> = { CASH: 0, NETWORK: 0, TRANSFER: 0, WALLET: 0, ATEL: 0 };
      for (const o of paidOrders) {
        const payments = await listPayments(o.clientId);
        for (const p of payments) {
          totals[p.method] += p.amount;
        }
      }
      setBreakdown(totals);
    })();
  }, [shift, paidOrders.length]);

  if (!shift) {
    return (
      <div className="flex h-full items-center justify-center text-stone-500">
        لا توجد وردية مفتوحة
      </div>
    );
  }

  const expectedCash = shift.openingFloat + breakdown.CASH;
  const counted = Number(countedCash) || 0;
  const variance = counted - expectedCash;

  const onDigit = (d: string) => {
    setCountedCash((v) => (v === '0' ? d : (v + d).slice(0, 8)));
  };
  const back = () => setCountedCash((v) => v.slice(0, -1) || '0');
  const clear = () => setCountedCash('0');

  const submit = async () => {
    if (openOrders > 0) {
      if (!confirm(`لديك ${openOrders} طلب مفتوح. هل تريد المتابعة؟`)) return;
    }
    setSubmitting(true);
    try {
      await closeShift(counted, notes || undefined);
      navigate('/orders');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-3">
      {/* Right — Method breakdown + expected cash */}
      <div className="col-span-1 flex flex-col gap-3">
        <div className="card p-5">
          <div className="text-xs text-stone-500">05 — SHIFT CLOSE</div>
          <h1 className="text-xl font-bold">إغلاق الوردية</h1>
          <div className="mt-1 text-xs text-stone-500">
            من {new Date(shift.openedAt).toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="card flex-1 p-4">
          <h3 className="mb-3 text-sm font-bold">المبيعات حسب طريقة الدفع</h3>
          <ul className="space-y-2">
            {(['CASH', 'NETWORK', 'TRANSFER', 'WALLET', 'ATEL'] as PaymentMethod[]).map((m) => (
              <li
                key={m}
                className="flex items-center justify-between rounded-xl border border-stone-200 p-2 dark:border-stone-800"
              >
                <span className="text-sm font-semibold">{METHOD_LABELS[m]}</span>
                <span className="font-num font-semibold">{fmtPrice(breakdown[m])}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-stone-200 pt-3 dark:border-stone-800">
            <div className="flex justify-between text-sm">
              <span>عهدة بداية الوردية</span>
              <span className="font-num">{fmtPrice(shift.openingFloat)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 dark:border-stone-800">
              <span className="font-bold">النقد المتوقع في الدرج</span>
              <span className="font-num text-lg font-bold text-brand-600">{fmtPrice(expectedCash)}</span>
            </div>
          </div>
        </div>

        {openOrders > 0 && (
          <div className="card border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            ⚠️ لديك {openOrders} طلب مفتوح
          </div>
        )}
      </div>

      {/* Center/Right — Counted cash + variance */}
      <div className="col-span-1 flex flex-col gap-3 lg:col-span-2">
        <div className="card p-4">
          <label className="label">النقد الفعلي في الدرج</label>
          <input
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value.replace(/\D/g, '') || '0')}
            className="input text-2xl font-num font-bold"
            dir="ltr"
          />
        </div>

        <div className="card p-4">
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === 'C') clear();
                  else if (k === '⌫') back();
                  else onDigit(k);
                }}
                className="btn-outline h-12 min-w-0 w-full touch-manipulation px-2 text-lg font-num"
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`card p-5 ${
            variance < 0
              ? 'border-danger-500 bg-red-50 dark:bg-red-900/20'
              : variance > 0
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          }`}
        >
          <div className="text-center">
            <div className="text-xs text-stone-500">
              {variance < 0 ? 'عجز في النقد' : variance > 0 ? 'زيادة في النقد' : 'مطابق تماماً'}
            </div>
            <div
              className={`font-num text-4xl font-bold ${
                variance < 0
                  ? 'text-danger-600 dark:text-danger-500'
                  : variance > 0
                  ? 'text-amber-600 dark:text-amber-500'
                  : 'text-brand-600 dark:text-brand-400'
              }`}
            >
              {variance > 0 ? '+' : ''}
              {fmtPrice(variance)}
            </div>
          </div>
        </div>

        <div className="card p-4">
          <label className="label">ملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[60px]"
            placeholder="مثال: سبب العجز..."
          />
        </div>

        <button onClick={submit} disabled={submitting} className="btn-primary w-full">
          {submitting ? 'جاري...' : 'تأكيد إغلاق الوردية'}
        </button>
      </div>
    </div>
  );
}
