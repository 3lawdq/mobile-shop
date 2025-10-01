"use client";

interface PaginationProps {
  page: number;
  hasNext: boolean;
  onPageChange: (newPage: number) => void;
  totalPages?: number; // 👈 لو عندك عدد الصفحات
}

export default function Pagination({ page, hasNext, onPageChange, totalPages }: PaginationProps) {
  const pagesToShow = 3; // كم رقم نعرض بجانب الصفحة الحالية
  const start = Math.max(1, page - pagesToShow);
  const end = totalPages ? Math.min(totalPages, page + pagesToShow) : page + pagesToShow;

  return (
    <div className="flex items-center justify-center gap-2 mt-6 font-[Cairo] text-sm">
      {/* السابق */}
      <button
        className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        السابق
      </button>

      {/* أرقام الصفحات */}
      {totalPages ? (
        <>
          {start > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className={`px-3 py-1.5 rounded-lg border ${
                  page === 1 ? "bg-[#b89c70] text-white" : "hover:bg-gray-100"
                }`}
              >
                1
              </button>
              {start > 2 && <span className="px-2">…</span>}
            </>
          )}
          {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg border ${
                page === p ? "bg-[#b89c70] text-white" : "hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-2">…</span>}
              <button
                onClick={() => onPageChange(totalPages)}
                className={`px-3 py-1.5 rounded-lg border ${
                  page === totalPages ? "bg-[#b89c70] text-white" : "hover:bg-gray-100"
                }`}
              >
                {totalPages}
              </button>
            </>
          )}
        </>
      ) : (
        <span className="px-3">صفحة {page}</span>
      )}

      {/* التالي */}
      <button
        className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
      >
        التالي
      </button>
    </div>
  );
}
