import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/store';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  const append = (digit: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + digit);
    setError(null);
  };
  const clear = () => setPin('');
  const back = () => setPin((p) => p.slice(0, -1));

  const submit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      await login(pin);
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الدخول');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-lg">
            O
          </div>
          <h1 className="text-2xl font-bold">Orderak OS</h1>
          <p className="mt-1 text-sm text-stone-500">نظام كاشير وإدارة مطاعم</p>
        </div>

        <div className="card p-6">
          <label className="label text-center">أدخل رمز PIN</label>
          <div className="mb-4 flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full ${
                  i < pin.length ? 'bg-brand-500' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {keys.map((k) => {
              if (k === 'clear')
                return (
                  <button key={k} onClick={clear} className="btn-outline text-sm">
                    مسح
                  </button>
                );
              if (k === 'back')
                return (
                  <button key={k} onClick={back} className="btn-outline text-sm">
                    ⌫
                  </button>
                );
              return (
                <button
                  key={k}
                  onClick={() => append(k)}
                  className="btn-outline font-num text-lg h-14"
                >
                  {k}
                </button>
              );
            })}
          </div>

          <button
            onClick={submit}
            disabled={pin.length < 4 || loading}
            className="btn-primary mt-4 w-full"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-stone-500">
          PIN المدير: <span className="font-num">1234</span> · PIN الكاشير:{' '}
          <span className="font-num">0000</span>
        </p>
      </div>
    </div>
  );
}
