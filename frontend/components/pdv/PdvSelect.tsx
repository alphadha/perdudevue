"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type Option = { value: string; label: string };

type Props = {
  id?: string;
  label?: string;
  error?: string;
  variant?: "field" | "filter";
  multiple?: boolean;
  placeholder?: string;
  children: ReactNode;
  onValuesChange?: (values: string[]) => void;
  onChange?: (event: { target: { value: string } }) => void;
} & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "className" | "multiple" | "children" | "onChange"
>;

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") {
      return [];
    }
    const props = child.props as { value?: string | number; children?: ReactNode };
    return [{ value: String(props.value ?? ""), label: String(props.children ?? "") }];
  });
}

function asValues(value: Props["value"]): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [String(value)];
}

/** Select UI kit : champ (Input + chevron) ou filtre « Filtrer et trier » 145:26447 / 190:22016. */
export default function PdvSelect({
  id,
  label,
  error,
  variant = "field",
  multiple = false,
  placeholder,
  children,
  onValuesChange,
  disabled,
  value,
  onChange,
  "aria-label": ariaLabel,
}: Props) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const menuId = `${triggerId}-list`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => readOptions(children), [children]);
  const selected = asValues(value);
  const isFilter = variant === "filter";
  const empty = selected.length === 0;
  const display = empty
    ? (placeholder ?? options.find((option) => option.value === "")?.label ?? "Sélectionner dans la liste")
    : multiple
      ? options
          .filter((option) => selected.includes(option.value) && option.value !== "")
          .map((option) => option.label)
          .join(", ")
      : (options.find((option) => option.value === selected[0])?.label ?? "");

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function emit(next: string[]) {
    const cleaned = next.filter((item) => item !== "");
    onValuesChange?.(cleaned);
    onChange?.({
      target: { value: multiple ? cleaned.join(",") : (cleaned[0] ?? "") },
    });
  }

  function pick(optionValue: string) {
    if (disabled) {
      return;
    }
    if (multiple) {
      if (optionValue === "") {
        emit([]);
        return;
      }
      emit(selected.includes(optionValue) ? selected.filter((item) => item !== optionValue) : [...selected, optionValue]);
      return;
    }
    emit([optionValue]);
    if (!isFilter) {
      setOpen(false);
    }
  }

  function isChecked(optionValue: string) {
    if (optionValue === "") {
      return empty;
    }
    return selected.includes(optionValue);
  }

  const control = (
    <div
      ref={rootRef}
      className={[
        "pdv-select",
        isFilter ? "pdv-select--filter" : "pdv-select--field",
        open ? "is-open" : "",
        empty && !isFilter ? "is-placeholder" : "",
        error ? "is-invalid" : "",
        disabled ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        id={triggerId}
        className="pdv-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="pdv-select__value">{display}</span>
        <img className="pdv-select__chevron" src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
      </button>
      {open ? (
        <ul id={menuId} className="pdv-select__menu" role="listbox" aria-labelledby={triggerId} aria-multiselectable={multiple}>
          {options.map((option) => {
            const checked = isChecked(option.value);
            return (
              <li key={option.value || "all"}>
                <div
                  className="pdv-select__option"
                  role="option"
                  aria-selected={checked}
                  tabIndex={0}
                  onClick={() => pick(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      pick(option.value);
                    }
                  }}
                >
                  <span className={`pdv-select__check${checked ? " is-on" : ""}`} aria-hidden>
                    {checked ? (
                      <img src="/icons/pdv/checkbox-selected.svg" alt="" width={20} height={20} />
                    ) : (
                      <span className="pdv-select__box" />
                    )}
                  </span>
                  <span>{option.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );

  if (isFilter || !label) {
    return control;
  }

  return (
    <div className="pdv-field">
      <label className="pdv-field__label" htmlFor={triggerId}>
        {label}
      </label>
      {control}
      {error ? <p className="pdv-field__error">{error}</p> : null}
    </div>
  );
}
