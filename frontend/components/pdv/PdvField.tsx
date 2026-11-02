import type { InputHTMLAttributes, ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

/** Input UI kit Figma 161:8617 — Label 16 SemiBold, champ 40px #ebeff4. */
export default function PdvField({ id, label, error, hint, trailing, ...input }: Props) {
  return (
    <div className="pdv-field">
      <label className="pdv-field__label" htmlFor={id}>
        {label}
      </label>
      <div className={trailing ? "pdv-field__password" : undefined}>
        <input
          id={id}
          className={`pdv-field__control${error ? " is-invalid" : ""}`}
          {...input}
        />
        {trailing}
      </div>
      {error ? <p className="pdv-field__error">{error}</p> : null}
      {!error && hint ? <p className="pdv-field__hint">{hint}</p> : null}
    </div>
  );
}
