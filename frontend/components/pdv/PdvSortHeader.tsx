type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export default function PdvSortHeader({ label, active, onClick }: Props) {
  return (
    <th>
      <button type="button" className="pdv-th-btn" onClick={onClick} aria-pressed={active}>
        {label}
        <img src="/icons/pdv/chevron-selector-vertical.svg" alt="" />
      </button>
    </th>
  );
}
