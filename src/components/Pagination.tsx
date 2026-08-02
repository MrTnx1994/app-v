import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

// Builds a compact page list like: 1 ... 4 5 [6] 7 8 ... 42
function getPageList(current: number, total: number): (number | string)[] {
  const delta = 1;
  const range: (number | string)[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }
  return range;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;
  const pages = getPageList(page, totalPages);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 flex-wrap" dir="rtl">
      {totalItems !== undefined && pageSize !== undefined && (
        <span className="text-[11px] text-slate-500 font-medium">
          نمایش {Math.min((page - 1) * pageSize + 1, totalItems).toLocaleString('fa-IR')}–{Math.min(page * pageSize, totalItems).toLocaleString('fa-IR')} از {totalItems.toLocaleString('fa-IR')} مورد
        </span>
      )}
      <div className="flex items-center gap-1 mr-auto">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-xs select-none">…</span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[28px] h-7 px-1 rounded-lg text-xs font-bold transition ${
                p === page ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {(p as number).toLocaleString('fa-IR')}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
