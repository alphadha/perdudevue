type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function PdvSearchBar({
  id,
  value,
  onChange,
  placeholder = "Rechercher",
  className,
}: Props) {
  return (
    <div className={`pdv-search${className ? ` ${className}` : ""}`}>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <img src="/icons/pdv/search-md.svg" alt="" width={20} height={20} />
    </div>
  );
}
