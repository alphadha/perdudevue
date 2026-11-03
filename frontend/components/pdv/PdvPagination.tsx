"use client";

type Props = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
};

/** Pagination kit Tableaux — page active 32×32 #FCFCFC, inactives légende. */
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
        <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} className="pdv-pagination__chevron--prev" />
      </button>
      <div className="pdv-pagination__pages">
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
      </div>
      <button
        type="button"
        className="pdv-pagination__arrow"
        aria-label="Page suivante"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
      </button>
    </nav>
  );
}
