"use client";

import { ClipboardEvent, KeyboardEvent, useRef } from "react";

type Props = {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  numeric?: boolean;
  invalid?: boolean;
  ariaLabel: string;
};

const BOXES = 6;

export default function PdvCodeBoxes({
  idPrefix,
  value,
  onChange,
  length = BOXES,
  numeric = false,
  invalid = false,
  ariaLabel,
}: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const sanitize = (raw: string) =>
    (numeric ? raw.replace(/\D/g, "") : raw.replace(/[^A-Za-z0-9]/g, "")).toUpperCase();
  const chars = Array.from({ length }, (_, index) => value[index] ?? "");

  function setChar(index: number, raw: string) {
    const char = sanitize(raw).slice(-1);
    const next = chars.map((current, i) => (i === index ? char : current));
    onChange(next.join(""));
    if (char && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !chars[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = sanitize(event.clipboardData.getData("text")).slice(0, length);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="pdv-otp-form__digits" role="group" aria-label={ariaLabel}>
      {chars.map((char, index) => (
        <input
          key={index}
          id={`${idPrefix}-${index}`}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          className={`pdv-otp-form__digit${invalid ? " is-invalid" : ""}`}
          value={char}
          maxLength={1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          inputMode={numeric ? "numeric" : "text"}
          aria-label={`Caractère ${index + 1}`}
          onChange={(event) => setChar(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          required
        />
      ))}
    </div>
  );
}
