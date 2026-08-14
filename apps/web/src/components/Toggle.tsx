import clsx from 'clsx';

export function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={clsx('toggle', on ? 'toggle-on' : 'toggle-off')}
      aria-pressed={on}
    >
      <span className="toggle-knob" />
    </button>
  );
}
