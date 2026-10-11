"use client";

import type { ReactNode } from "react";

export function CrudFormDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div aria-labelledby="crud-dialog-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id="crud-dialog-title">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button aria-label="닫기" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">×</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
