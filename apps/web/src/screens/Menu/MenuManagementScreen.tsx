import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { fmtPrice, fmtPercent } from '../../lib/format';
import type { Category, MenuItem } from '../../types';
import { Toggle } from '../../components/Toggle';

export default function MenuManagementScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [cats, its] = await Promise.all([
        api.get<Category[]>('/categories'),
        api.get<MenuItem[]>('/menu-items'),
      ]);
      setCategories(cats);
      setItems(its);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = selectedCategoryId
    ? items.filter((i) => i.categoryId === selectedCategoryId)
    : items;

  const toggleItemActive = async (item: MenuItem) => {
    try {
      const updated = await api.patch<MenuItem>(`/menu-items/${item.id}`, {
        active: !item.active,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل التحديث');
    }
  };

  const bulkAdjust = async (percent: number) => {
    const body: { percent: number; categoryId?: number } = { percent };
    if (selectedCategoryId) body.categoryId = selectedCategoryId;
    const msg = selectedCategoryId
      ? `تطبيق ${fmtPercent(percent)} على أصناف القسم المحدد فقط؟`
      : `تطبيق ${fmtPercent(percent)} على كل الأصناف؟`;
    if (!confirm(msg)) return;
    try {
      await api.post('/menu-items/bulk-adjust', body);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل التعديل');
    }
  };

  const deleteItem = async (item: MenuItem) => {
    if (!confirm(`حذف "${item.name}"؟`)) return;
    try {
      await api.delete(`/menu-items/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل الحذف');
    }
  };

  const addCategory = async (name: string) => {
    const order = categories.length;
    await api.post('/categories', { name, sortOrder: order });
    await load();
  };

  const addItem = async (data: {
    categoryId: number;
    name: string;
    description?: string;
    price: number;
  }) => {
    await api.post('/menu-items', { ...data, active: true });
    await load();
  };

  const updateItem = async (
    id: number,
    data: { name?: string; description?: string; price?: number; active?: boolean; categoryId?: number },
  ) => {
    await api.patch(`/menu-items/${id}`, data);
    await load();
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar — Categories */}
      <aside className="w-56 flex-shrink-0">
        <div className="card p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="font-bold">الأقسام</h2>
            <button
              onClick={() => setShowAddCategory(true)}
              className="btn-outline !py-1 !px-2 text-xs"
            >
              + قسم
            </button>
          </div>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  selectedCategoryId === null
                    ? 'bg-brand-500 text-white'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>الكل</span>
                <span className="text-xs opacity-80">{items.length}</span>
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    selectedCategoryId === c.id
                      ? 'bg-brand-500 text-white'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span>
                    {c.icon && <span className="ml-2">{c.icon}</span>}
                    {c.name}
                  </span>
                  <span className="text-xs opacity-80">{c._count?.items ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main — Items */}
      <section className="flex-1 overflow-auto">
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-stone-500">04 — MENU MANAGEMENT</div>
              <h1 className="text-xl font-bold">إدارة القائمة</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => bulkAdjust(5)}
                className="btn-outline !py-1.5 !px-3 text-sm font-num"
              >
                +5%
              </button>
              <button
                onClick={() => bulkAdjust(10)}
                className="btn-outline !py-1.5 !px-3 text-sm font-num"
              >
                +10%
              </button>
              <button
                onClick={() => bulkAdjust(15)}
                className="btn-outline !py-1.5 !px-3 text-sm font-num"
              >
                +15%
              </button>
              <button
                onClick={() => bulkAdjust(20)}
                className="btn-outline !py-1.5 !px-3 text-sm font-num"
              >
                +20%
              </button>
              <button
                onClick={() => setShowAddItem(true)}
                className="btn-primary !py-1.5 !px-3 text-sm"
              >
                + صنف جديد
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-stone-500">جاري التحميل...</div>
          ) : (
            <div className="space-y-2">
              {filteredItems.length === 0 && (
                <div className="py-12 text-center text-stone-500">
                  لا توجد أصناف. أضف صنف جديد للبدء.
                </div>
              )}
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-stone-500">{item.description}</div>
                  </div>
                  <div className="w-28 text-left font-num font-semibold text-brand-600 dark:text-brand-400">
                    {fmtPrice(item.price)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="btn-outline !py-1.5 !px-3 text-xs"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="btn-danger !py-1.5 !px-3 text-xs"
                    >
                      حذف
                    </button>
                    <Toggle on={item.active} onChange={() => toggleItemActive(item)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {showAddCategory && (
        <CategoryModal
          onClose={() => setShowAddCategory(false)}
          onSave={(name) => {
            addCategory(name);
            setShowAddCategory(false);
          }}
        />
      )}
      {showAddItem && (
        <ItemModal
          categories={categories}
          defaultCategoryId={selectedCategoryId ?? categories[0]?.id ?? 0}
          onClose={() => setShowAddItem(false)}
          onSave={(data) => {
            addItem(data);
            setShowAddItem(false);
          }}
        />
      )}
      {editingItem && (
        <ItemModal
          categories={categories}
          defaultCategoryId={editingItem.categoryId}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => {
            updateItem(editingItem.id, data);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Modal title="قسم جديد" onClose={onClose}>
      <label className="label">اسم القسم</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
        placeholder="مثال: حلويات"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-outline">إلغاء</button>
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          className="btn-primary"
          disabled={!name.trim()}
        >
          حفظ
        </button>
      </div>
    </Modal>
  );
}

function ItemModal({
  categories,
  defaultCategoryId,
  item,
  onClose,
  onSave,
}: {
  categories: Category[];
  defaultCategoryId: number;
  item?: MenuItem;
  onClose: () => void;
  onSave: (data: {
    categoryId: number;
    name: string;
    description?: string;
    price: number;
  }) => void;
}) {
  const [categoryId, setCategoryId] = useState<number>(defaultCategoryId || 0);
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item?.price ?? 0);

  const submit = () => {
    if (!name.trim() || !categoryId || price < 0) return;
    onSave({
      categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
    });
  };

  return (
    <Modal title={item ? `تعديل: ${item.name}` : 'صنف جديد'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">القسم</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الاسم</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="مثال: شاورما لحم"
          />
        </div>
        <div>
          <label className="label">الوصف</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder="مثال: خبز طازج وسلطة"
          />
        </div>
        <div>
          <label className="label">السعر</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="input font-num"
            min={0}
            step={100}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-outline">إلغاء</button>
        <button onClick={submit} className="btn-primary">
          حفظ
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
