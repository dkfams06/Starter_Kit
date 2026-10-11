"use client";

import { useState, useTransition } from "react";
import { ErrorState } from "@/components/crud/async-state";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { CrudFormDialog } from "@/components/crud/crud-form-dialog";
import { DataTable, type DataTableColumn } from "@/components/crud/data-table";
import { PageHeader } from "@/components/crud/page-header";

export type ManagedTask = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  createdAt: string;
  updatedAt: string;
};

type TaskFormValue = Pick<ManagedTask, "title" | "description" | "status">;
type ApiError = { error?: string };

const statusLabels: Record<ManagedTask["status"], string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};

async function readError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as ApiError;
  return body.error ?? "요청을 처리하지 못했습니다.";
}

function TaskForm({ value, pending, onCancel, onSubmit }: {
  value?: ManagedTask;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (value: TaskFormValue) => void;
}) {
  function submit(formData: FormData) {
    onSubmit({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      status: String(formData.get("status") ?? "TODO") as ManagedTask["status"],
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium">제목
        <input autoFocus className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" defaultValue={value?.title} maxLength={120} name="title" required />
      </label>
      <label className="block text-sm font-medium">설명
        <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" defaultValue={value?.description ?? ""} maxLength={2000} name="description" />
      </label>
      <label className="block text-sm font-medium">상태
        <select className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" defaultValue={value?.status ?? "TODO"} name="status">
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium" disabled={pending} onClick={onCancel} type="button">취소</button>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "저장 중…" : "저장"}</button>
      </div>
    </form>
  );
}

export function TaskManager({ initialTasks, canDelete }: { initialTasks: ManagedTask[]; canDelete: boolean }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editing, setEditing] = useState<ManagedTask | "new" | null>(null);
  const [deleting, setDeleting] = useState<ManagedTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(value: TaskFormValue) {
    setError(null);
    startTransition(async () => {
      const current = editing === "new" ? null : editing;
      const response = await fetch(current ? `/api/tasks/${current.id}` : "/api/tasks", {
        method: current ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const { task } = (await response.json()) as { task: ManagedTask };
      setTasks((items) => current ? items.map((item) => item.id === task.id ? task : item) : [task, ...items]);
      setEditing(null);
    });
  }

  function remove() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/tasks/${deleting.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setTasks((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    });
  }

  const columns: DataTableColumn<ManagedTask>[] = [
    { key: "title", header: "업무", cell: (task) => <div><p className="font-semibold text-slate-950">{task.title}</p>{task.description ? <p className="mt-1 max-w-xl truncate text-slate-500">{task.description}</p> : null}</div> },
    { key: "status", header: "상태", cell: (task) => <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabels[task.status]}</span> },
    { key: "updatedAt", header: "수정일", cell: (task) => <time className="whitespace-nowrap text-slate-600" dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleDateString("ko-KR")}</time> },
    { key: "actions", header: "작업", className: "text-right", cell: (task) => <div className="flex justify-end gap-2"><button className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium" onClick={() => setEditing(task)} type="button">수정</button>{canDelete ? <button className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700" onClick={() => setDeleting(task)} type="button">삭제</button> : null}</div> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader action={<button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setEditing("new")} type="button">업무 등록</button>} description="공통 CRUD 구성요소를 활용한 예제입니다." title="업무 예제" />
      {error ? <ErrorState description={error} title="요청에 실패했습니다." /> : null}
      <DataTable columns={columns} emptyDescription="업무 등록 버튼으로 첫 데이터를 만들어 보세요." emptyTitle="등록된 업무가 없습니다." getRowKey={(task) => task.id} rows={tasks} />
      <CrudFormDialog description="업무 전용 필드는 이 화면 구성요소 안에서만 관리합니다." onClose={() => !isPending && setEditing(null)} open={editing !== null} title={editing === "new" ? "업무 등록" : "업무 수정"}>
        <TaskForm onCancel={() => setEditing(null)} onSubmit={save} pending={isPending} value={editing && editing !== "new" ? editing : undefined} />
      </CrudFormDialog>
      <ConfirmDialog confirmLabel="삭제" description={`‘${deleting?.title ?? ""}’ 업무를 영구 삭제합니다.`} onCancel={() => setDeleting(null)} onConfirm={remove} open={deleting !== null} pending={isPending} title="업무를 삭제할까요?" />
    </div>
  );
}
