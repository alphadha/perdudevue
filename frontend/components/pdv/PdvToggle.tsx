"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  label?: string;
  ariaLabel?: string;
};

/** Toggle UI kit Figma 155:42173 — 34×20, knob 14. */
export default function PdvToggle({
  checked,
  onChange,
  disabled,
  leftLabel,
  rightLabel,
  label,
  ariaLabel,
}: Props) {
  const switchButton = (
    <button
      type="button"
      className={`pdv-toggle${checked ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label ?? "Basculer"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="pdv-toggle__knob" />
    </button>
  );

  if (label) {
    return (
      <div className="pdv-toggle-line">
        {switchButton}
        <span className="pdv-toggle-line__label">{label}</span>
      </div>
    );
  }

  return (
    <div className="pdv-toggle-row">
      {leftLabel ? (
        <span className={`pdv-toggle-row__label${!checked ? " is-active" : ""}`}>{leftLabel}</span>
      ) : null}
      {switchButton}
      {rightLabel ? (
        <span className={`pdv-toggle-row__label${checked ? " is-active" : ""}`}>{rightLabel}</span>
      ) : null}
    </div>
  );
}
