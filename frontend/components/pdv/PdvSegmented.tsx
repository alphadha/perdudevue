"use client";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
};

/** Segmented pills Figma 308:6600 — track 10px, items 40px. */
export default function PdvSegmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div className="pdv-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            className={`pdv-segmented__item${selected ? " is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
