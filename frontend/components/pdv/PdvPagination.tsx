"use client";

type Props = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
};

/** Pagination Figma tables opticien (cercle navy page active). */
export default function PdvPagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav className="pdv-pagination" aria-label="Pagination">
      <button
        type="button"
        className="pdv-pagination__arrow"
        aria-label="Page précédente"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <img src="/icons/pdv/chevron-right.svg" alt="" width={18} height={18} className="pdv-pagination__chevron--prev" />
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className={`pdv-pagination__page${item === page ? " is-active" : ""}`}
          aria-current={item === page ? "page" : undefined}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        className="pdv-pagination__arrow"
        aria-label="Page suivante"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <img src="/icons/pdv/chevron-right.svg" alt="" width={18} height={18} />
      </button>
    </nav>
  );
}
