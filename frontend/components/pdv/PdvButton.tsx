import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "tertiary";
type Size = "l" | "m";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  iconLeft?: string;
  iconRight?: string;
  light?: boolean;
  grow?: boolean;
  block?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "disabled"> & {
    href?: never;
  };

type LinkProps = CommonProps & {
  href: string;
};

function buildClassName(props: CommonProps): string {
  const size = props.size ?? "m";
  return [
    "pdv-btn",
    props.variant === "tertiary" ? "pdv-btn--tertiary" : `pdv-btn--${size}`,
    `pdv-btn--${props.variant ?? "primary"}`,
    props.light ? "pdv-btn--tertiary-light" : "",
    props.grow ? "pdv-btn--grow" : "",
    props.block ? "pdv-btn--block" : "",
    props.disabled ? "is-disabled" : "",
    props.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function PdvButton(props: ButtonProps | LinkProps) {
  const {
    variant = "primary",
    size = "m",
    iconLeft,
    iconRight,
    light,
    grow,
    block,
    children,
    className,
    disabled,
    ...rest
  } = props;
  const cls = buildClassName({ variant, size, light, grow, block, children, className, disabled });

  const content = (
    <>
      {iconLeft ? <img src={iconLeft} alt="" /> : null}
      <span>{children}</span>
      {iconRight ? <img src={iconRight} alt="" /> : null}
    </>
  );

  if ("href" in props && props.href) {
    if (disabled) {
      return (
        <span className={cls} aria-disabled="true">
          {content}
        </span>
      );
    }
    return (
      <Link href={props.href} className={cls}>
        {content}
      </Link>
    );
  }

  const { href: _href, ...buttonRest } = rest as ButtonProps;
  void _href;
  return (
    <button type={buttonRest.type ?? "button"} className={cls} {...(disabled ? { disabled: true } : {})} {...buttonRest}>
      {content}
    </button>
  );
}
