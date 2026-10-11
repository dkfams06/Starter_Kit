"use client";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="alertdialog">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold" id="confirm-dialog-title">{title}</h2>
        <p className="mt-2 text-sm text-slate-600" id="confirm-dialog-description">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium" disabled={pending} onClick={onCancel} type="button">취소</button>
          <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={onConfirm} type="button">{pending ? "처리 중…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
