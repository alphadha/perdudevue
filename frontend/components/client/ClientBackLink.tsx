import Link from "next/link";

type Props = {
  href: string;
  children: string;
};

export default function ClientBackLink({ href, children }: Props) {
  return (
    <Link href={href} className="pdv-back-link">
      <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
      {children}
    </Link>
  );
}
