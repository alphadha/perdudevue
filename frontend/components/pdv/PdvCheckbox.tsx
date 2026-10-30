type Props = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
};

export default function PdvCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  "aria-label": ariaLabel,
}: Props) {
  const state = disabled
    ? "disabled"
    : indeterminate
      ? "multi"
      : checked
        ? "selected"
        : "initial";

  return (
    <button
      type="button"
      className={`pdv-checkbox pdv-checkbox--${state}`}
      disabled={disabled}
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      role="checkbox"
      onClick={() => {
        if (disabled) {
          return;
        }
        onChange(indeterminate ? true : !checked);
      }}
    >
      {state === "selected" ? (
        <img src="/icons/pdv/checkbox-selected.svg" alt="" width={24} height={24} />
      ) : null}
      {state === "multi" ? (
        <img src="/icons/pdv/checkbox-multi.svg" alt="" width={24} height={24} />
      ) : null}
      {state === "initial" || state === "disabled" ? <span className="pdv-checkbox__box" /> : null}
    </button>
  );
}
