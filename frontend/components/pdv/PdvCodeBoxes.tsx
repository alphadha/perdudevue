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
  className?: string;
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
  className,
}: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const skipInput = useRef(false);
  const sanitize = (raw: string) =>
    (numeric ? raw.replace(/\D/g, "") : raw.replace(/[^A-Za-z0-9]/g, "")).toUpperCase();
  const chars = Array.from({ length }, (_, index) => value[index] ?? "");

  function fill(raw: string) {
    const pasted = sanitize(raw).slice(0, length);
    skipInput.current = true;
    onChange(pasted);
    const focusAt = Math.min(Math.max(pasted.length, 1), length) - 1;
    requestAnimationFrame(() => {
      skipInput.current = false;
      inputs.current[focusAt]?.focus();
    });
  }

  function setChar(index: number, raw: string) {
    if (skipInput.current) {
      return;
    }
    const cleaned = sanitize(raw);
    if (cleaned.length > 1) {
      fill(cleaned);
      return;
    }
    const char = cleaned.slice(-1);
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
    fill(event.clipboardData.getData("text") || event.clipboardData.getData("text/plain"));
  }

  return (
    <div
      className={["pdv-otp-form__digits", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      {chars.map((char, index) => (
        <input
          key={index}
          id={`${idPrefix}-${index}`}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          className={`pdv-otp-form__digit${invalid ? " is-invalid" : ""}`}
          value={char}
          maxLength={length}
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
