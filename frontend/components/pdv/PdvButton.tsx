import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import Link from "next/link";

function PdvBtnIcon({ src }: { src: string }) {
  return (
    <span
      className="pdv-btn__icon"
      aria-hidden
      style={{ "--pdv-btn-icon": `url("${src}")` } as CSSProperties}
    />
  );
}

type Variant = "primary" | "secondary" | "tertiary" | "danger";
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
    `pdv-btn--${size}`,
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
      {iconLeft ? <PdvBtnIcon src={iconLeft} /> : null}
      <span>{children}</span>
      {iconRight ? <PdvBtnIcon src={iconRight} /> : null}
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
