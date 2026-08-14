import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/dexie';
import { addPayment, paidTotal } from '../../lib/orders';
import { fmtPrice } from '../../lib/format';
import type { PaymentMethod } from '../../types';
import clsx from 'clsx';

const METHODS: { key: PaymentMethod; label: string; color: string }[] = [
  { key: 'CASH', label: 'نقداً', color: 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300' },
  { key: 'TRANSFER', label: 'بنكك / تحويل', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' },
  { key: 'WALLET', label: 'محفظة إلكترونية', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  { key: 'ATEL', label: 'آجل — دين', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200' },
];

const REF_METHODS: PaymentMethod[] = ['TRANSFER', 'WALLET', 'ATEL'];

// Safe lookup — never crash on a stored/unknown method.
function methodMeta(m: PaymentMethod) {
  return (
    METHODS.find((x) => x.key === m) ?? {
      key: m,
      label: m,
      color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    }
  );
}

export default function PaymentScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const order = useLiveQuery(() => db.orders.get(clientId!), [clientId]);
  const payments = useLiveQuery(
    () => db.payments.where('orderClientId').equals(clientId!).toArray(),
    [clientId],
  ) ?? [];

  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [showRef, setShowRef] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = (order?.total ?? 0) - paid;
  const amountNum = Number(amount) || 0;

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center text-stone-500">
        جاري التحميل...
      </div>
    );
  }

  const onDigit = (d: string) => {
    if (amount === '0') setAmount(d);
    else setAmount((a) => (a + d).slice(0, 8));
  };
  const onClear = () => setAmount('');
  const onBack = () => setAmount((a) => a.slice(0, -1));
  const onExact = () => setAmount(String(remaining));

  const submit = async () => {
    if (amountNum <= 0) {
      alert('أدخل المبلغ');
      return;
    }
    if (amountNum > remaining) {
      alert('المبلغ أكبر من المتبقي');
      return;
    }
    if (REF_METHODS.includes(method) && !reference.trim()) {
      setShowRef(true);
      return;
    }
    setSubmitting(true);
    try {
      await addPayment({
        orderClientId: order.clientId,
        method,
        amount: amountNum,
        reference: reference.trim() || undefined,
      });
      const newPaid = await paidTotal(order.clientId);
      if (newPaid >= order.total) {
        navigate('/orders');
        return;
      }
      // Reset for next payment
      setAmount('');
      setReference('');
      setMethod('CASH');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-3 gap-4">
      {/* Order summary */}
      <div className="col-span-1 flex flex-col gap-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-stone-500">02 — PAYMENT</div>
              <h1 className="text-xl font-bold">الدفع</h1>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500">طلب رقم</div>
              <div className="font-num text-2xl font-bold">{order.number ?? '...'}</div>
            </div>
          </div>
        </div>

        <div className="card flex-1 overflow-auto p-4">
          <h3 className="mb-2 text-sm font-bold">الأصناف</h3>
          <ul className="space-y-1.5 text-sm">
            {order.items.map((i) => (
              <li key={i.menuItemId} className="flex justify-between">
                <span>
                  {i.qty}× {i.name}
                </span>
                <span className="font-num">{fmtPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-stone-200 pt-3 dark:border-stone-800">
            <h3 className="mb-2 text-sm font-bold">المدفوعات</h3>
            {payments.length === 0 ? (
              <div className="text-xs text-stone-500">لا يوجد مدفوعات بعد</div>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {payments.map((p) => (
                  <li key={p.clientId} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className={clsx('badge', methodMeta(p.method).color)}>
                        {methodMeta(p.method).label}
                      </span>
                      {p.reference && (
                        <span className="font-num text-xs text-stone-500">
                          #{p.reference}
                        </span>
                      )}
                    </span>
                    <span className="font-num font-semibold">{fmtPrice(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex justify-between text-sm">
            <span>إجمالي الفاتورة</span>
            <span className="font-num font-semibold">{fmtPrice(order.total)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span>المدفوع</span>
            <span className="font-num font-semibold text-brand-600">{fmtPrice(paid)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 dark:border-stone-800">
            <span className="font-bold">المتبقي</span>
            <span className="font-num text-xl font-bold text-amber-600">
              {fmtPrice(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment form */}
      <div className="col-span-2 flex flex-col gap-3">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-bold">طريقة الدفع</h3>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={clsx(
                  'rounded-xl border-2 p-3 text-sm font-semibold transition-colors',
                  method === m.key
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-stone-200 dark:border-stone-700',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {REF_METHODS.includes(method) && (
            <div className="mt-3">
              <label className="label">رقم المرجعية</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="input font-num"
                placeholder="مثلاً 1234567890"
                dir="ltr"
              />
            </div>
          )}
        </div>

        <div className="card flex-1 p-4">
          <h3 className="mb-2 text-sm font-bold">المبلغ</h3>
          <div className="mb-4 flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className="input flex-1 text-2xl font-num font-bold"
              dir="ltr"
              inputMode="numeric"
            />
            <button onClick={onExact} className="btn-outline">
              المتبقي
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === 'C') onClear();
                  else if (k === '⌫') onBack();
                  else onDigit(k);
                }}
                className="btn-outline h-14 text-lg font-num"
              >
                {k}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => navigate('/orders')} className="btn-outline flex-1">
              إلغاء
            </button>
            <button
              onClick={submit}
              disabled={submitting || amountNum <= 0}
              className="btn-primary flex-1"
            >
              {submitting ? 'جاري...' : `دفع ${fmtPrice(amountNum)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
