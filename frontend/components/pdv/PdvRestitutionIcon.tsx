type Props = {
  className?: string;
};

export default function PdvRestitutionIcon({ className }: Props) {
  return (
    <img
      src="/icons/pdv/restitution-nav.svg"
      alt=""
      width={18}
      height={18}
      className={className ?? "pdv-icon-18"}
    />
  );
}
