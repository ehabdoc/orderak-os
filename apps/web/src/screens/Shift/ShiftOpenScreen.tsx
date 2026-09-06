import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/store';
import { openShift, getActiveShift } from '../../lib/orders';

export default function ShiftOpenScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [withFloat, setWithFloat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveShift(user?.id).then((s) => {
      if (s) navigate('/orders', { replace: true });
    });
  }, [navigate, user?.id]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const amount = withFloat ? Number(openingFloat) || 0 : 0;
      await openShift(amount, user!.id);
      navigate('/orders');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل فتح الوردية');
    } finally {
      setSubmitting(false);
    }
  };

  const addDigit = (d: string) => {
    setOpeningFloat((v) => {
      if (v === '0') return d;
      return (v + d).slice(0, 8);
    });
  };
  const back = () => setOpeningFloat((v) => v.slice(0, -1) || '0');
  const clear = () => setOpeningFloat('0');

  return (
    <div className="flex min-h-full items-center justify-center p-1 sm:p-4">
      <div className="card w-full max-w-md p-4 sm:p-6">
        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">⏰</div>
          <h1 className="text-xl font-bold">فتح وردية</h1>
          <p className="mt-1 text-sm text-stone-500">
            لا توجد وردية مفتوحة. ابدأ العمل مباشرة — وتحديد العهدة اختياري.
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={() => setWithFloat((v) => !v)}
          className="btn-outline mb-3 w-full text-sm"
        >
          {withFloat ? '✓ إخفاء العهدة الافتتاحية' : '+ إضافة عهدة افتتاحية (اختياري)'}
        </button>

        {withFloat && (
          <>
            <label className="label">مبلغ العهدة (نقدية في الدرج)</label>
            <div className="mb-4">
              <input
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value.replace(/\D/g, '') || '0')}
                className="input text-center font-num text-2xl font-bold"
                dir="ltr"
                inputMode="numeric"
              />
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === 'C') clear();
                    else if (k === '⌫') back();
                    else addDigit(k);
                  }}
                  className="btn-outline h-12 min-w-0 w-full touch-manipulation px-2 text-lg font-num"
                >
                  {k}
                </button>
              ))}
            </div>
          </>
        )}

        <button onClick={submit} disabled={submitting} className="btn-primary w-full">
          {submitting ? 'جاري...' : withFloat ? 'فتح الوردية بالعهدة' : 'بدء الوردية'}
        </button>
      </div>
    </div>
  );
}
