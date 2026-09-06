import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/dexie';
import { createOrder, getActiveShift } from '../../lib/orders';
import { useAuth } from '../../lib/store';
import { fmtPrice } from '../../lib/format';
import type { MenuItem, OrderItem, OrderType } from '../../types';
import clsx from 'clsx';

const TYPES: { key: OrderType; label: string; icon: string }[] = [
  { key: 'DINE_IN', label: 'صالة', icon: '🪑' },
  { key: 'TAKEAWAY', label: 'سفري', icon: '🛍️' },
  { key: 'DELIVERY', label: 'توصيل', icon: '🚗' },
];

export default function OrderEntryScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [type, setType] = useState<OrderType>('DINE_IN');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const menuItems = useLiveQuery(() => db.menuItems.toArray(), []) ?? [];

  useEffect(() => {
    if (selectedCategory === null && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const visibleItems = useMemo(
    () => menuItems.filter((i) => i.active && (selectedCategory === null || i.categoryId === selectedCategory)),
    [menuItems, selectedCategory],
  );

  const addItem = (m: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === m.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === m.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          menuItemId: m.id,
          name: m.name,
          qty: 1,
          price: m.price,
        },
      ];
    });
  };

  const updateQty = (menuItemId: number, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.menuItemId === menuItemId ? { ...i, qty } : i)));
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  const save = async () => {
    if (items.length === 0) {
      alert('أضف صنف واحد على الأقل');
      return;
    }
    setSaving(true);
    try {
      const shift = await getActiveShift(user?.id);
      const order = await createOrder({
        type,
        shiftClientId: shift?.clientId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        items,
        cashierId: user!.id,
      });
      navigate(`/orders/${order.clientId}/pay`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const saveAndNew = async () => {
    if (items.length === 0) {
      alert('أضف صنف واحد على الأقل');
      return;
    }
    setSaving(true);
    try {
      const shift = await getActiveShift(user?.id);
      await createOrder({
        type,
        shiftClientId: shift?.clientId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        items,
        cashierId: user!.id,
      });
      // Reset form for next order
      setItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setNotes('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 xl:h-full xl:flex-row">
      {/* Menu list */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="card mb-3 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={clsx(
                'rounded-xl px-3 py-2 text-sm font-semibold',
                selectedCategory === null
                  ? 'bg-brand-500 text-white'
                  : 'bg-stone-100 dark:bg-stone-800',
              )}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={clsx(
                  'rounded-xl px-3 py-2 text-sm font-semibold',
                  selectedCategory === c.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-stone-100 dark:bg-stone-800',
                )}
              >
                {c.icon && <span className="ml-1">{c.icon}</span>}
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-auto sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((m) => (
            <button
              key={m.id}
              onClick={() => addItem(m)}
              className="card p-3 text-right transition-colors hover:border-brand-500"
            >
              <div className="font-bold">{m.name}</div>
              {m.description && (
                <div className="mt-0.5 text-xs text-stone-500">{m.description}</div>
              )}
              <div className="mt-2 font-num text-lg font-bold text-brand-600 dark:text-brand-400">
                {fmtPrice(m.price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Order panel */}
      <div className="flex min-w-0 w-full flex-col xl:w-96 xl:shrink-0">
        <div className="card flex-1 overflow-hidden">
          <div className="border-b border-stone-200 p-4 dark:border-stone-800">
            <h2 className="text-lg font-bold">طلب جديد</h2>
            <div className="mt-3 inline-flex rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold',
                    type === t.key
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-stone-900 dark:text-brand-300'
                      : 'text-stone-600 dark:text-stone-400',
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-500">
                الصنف سيظهر هنا
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((i) => (
                  <li
                    key={i.menuItemId}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 p-2 dark:border-stone-800"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-xs text-stone-500 font-num">
                        {fmtPrice(i.price)} × {i.qty} = {fmtPrice(i.price * i.qty)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(i.menuItemId, i.qty - 1)}
                        className="btn-outline !px-2 !py-1 text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-num font-semibold">{i.qty}</span>
                      <button
                        onClick={() => updateQty(i.menuItemId, i.qty + 1)}
                        className="btn-outline !px-2 !py-1 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-200 p-4 dark:border-stone-800">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسم الزبون"
                className="input"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="الهاتف"
                className="input font-num"
                dir="ltr"
              />
            </div>
            {type === 'DELIVERY' && (
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="عنوان التوصيل"
                className="input mb-2"
              />
            )}
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات (اختياري)"
              className="input mb-3"
            />
            <div className="mb-3 flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
              <span className="font-semibold">الإجمالي</span>
              <span className="font-num text-2xl font-bold text-brand-600 dark:text-brand-400">
                {fmtPrice(subtotal)}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={saveAndNew} disabled={saving} className="btn-outline flex-1">
                حفظ + جديد
              </button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? 'جاري...' : 'حفظ ودفع'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
