type Props = {
  label: string;
  active: boolean;
  direction?: "asc" | "desc";
  onClick: () => void;
};

export default function PdvSortHeader({ label, active, direction, onClick }: Props) {
  const hint = !active ? "Trier" : direction === "asc" ? "Tri croissant" : "Tri décroissant";
  return (
    <button type="button" className="pdv-th-btn" onClick={onClick} aria-label={`${label}, ${hint}`}>
      {label}
      <img src="/icons/pdv/chevron-selector-vertical.svg" alt="" width={20} height={20} />
    </button>
  );
}
