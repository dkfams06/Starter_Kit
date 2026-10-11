"use client";

import { useState, useTransition } from "react";

export type ManagedUser = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiError = { error?: string };

async function readError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as ApiError;
  return body.error ?? "요청을 처리하지 못했습니다.";
}

export function UserManager({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: ManagedUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createUser(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: formData.get("role"),
        }),
      });

      if (!response.ok) {
        setMessage(await readError(response));
        return;
      }

      const body = (await response.json()) as { user: ManagedUser };
      setUsers((current) => [...current, body.user]);
      setMessage("사용자를 생성했습니다.");
    });
  }

  function replaceUser(updated: ManagedUser) {
    setUsers((current) =>
      current.map((user) => (user.id === updated.id ? updated : user)),
    );
  }

  function removeUser(userId: string) {
    setUsers((current) => current.filter((user) => user.id !== userId));
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">사용자 생성</h2>
        <p className="mt-1 text-sm text-slate-600">
          공개 회원가입 없이 관리자만 계정을 생성할 수 있습니다.
        </p>
        <form action={createUser} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            이름
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              maxLength={100}
              name="name"
              required
            />
          </label>
          <label className="text-sm font-medium">
            이메일
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="text-sm font-medium">
            초기 비밀번호
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              maxLength={128}
              minLength={12}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="text-sm font-medium">
            역할
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              defaultValue="USER"
              name="role"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <button
            className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60 md:col-span-2"
            disabled={isPending}
            type="submit"
          >
            사용자 생성
          </button>
        </form>
        {message ? (
          <p aria-live="polite" className="mt-4 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="user-list-heading" className="space-y-4">
        <h2 className="text-xl font-semibold" id="user-list-heading">
          사용자 목록
        </h2>
        {users.map((user) => (
          <UserEditor
            currentUserId={currentUserId}
            key={user.id}
            onDelete={removeUser}
            onUpdate={replaceUser}
            user={user}
          />
        ))}
      </section>
    </div>
  );
}

function UserEditor({
  currentUserId,
  onDelete,
  onUpdate,
  user,
}: {
  currentUserId: string;
  onDelete: (userId: string) => void;
  onUpdate: (user: ManagedUser) => void;
  user: ManagedUser;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const password = String(formData.get("password") ?? "");
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          ...(password ? { password } : {}),
        }),
      });

      if (!response.ok) {
        setMessage(await readError(response));
        return;
      }

      const body = (await response.json()) as { user: ManagedUser };
      onUpdate(body.user);
      setMessage("변경사항을 저장했습니다.");
    });
  }

  function setActive(isActive: boolean) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        setMessage(await readError(response));
        return;
      }

      const body = (await response.json()) as { user: ManagedUser };
      onUpdate(body.user);
      setMessage(isActive ? "계정을 활성화했습니다." : "계정을 비활성화했습니다.");
    });
  }

  function deleteAccount() {
    if (!window.confirm("비활성 계정을 영구 삭제할까요?")) return;

    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage(await readError(response));
        return;
      }

      onDelete(user.id);
    });
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{user.name ?? "이름 없음"}</p>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            user.isActive
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {user.isActive ? "활성" : "비활성"}
        </span>
      </div>

      <form action={update} className="grid gap-3 md:grid-cols-4">
        <input
          aria-label="이름"
          className="rounded-lg border border-slate-300 px-3 py-2"
          defaultValue={user.name ?? ""}
          maxLength={100}
          name="name"
          required
        />
        <input
          aria-label="이메일"
          className="rounded-lg border border-slate-300 px-3 py-2"
          defaultValue={user.email}
          name="email"
          required
          type="email"
        />
        <select
          aria-label="역할"
          className="rounded-lg border border-slate-300 px-3 py-2"
          defaultValue={user.role}
          name="role"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input
          aria-label="새 비밀번호"
          autoComplete="new-password"
          className="rounded-lg border border-slate-300 px-3 py-2"
          maxLength={128}
          minLength={12}
          name="password"
          placeholder="새 비밀번호(선택)"
          type="password"
        />
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 font-medium md:col-span-4"
          disabled={isPending}
          type="submit"
        >
          저장
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          disabled={isPending || user.id === currentUserId}
          onClick={() => setActive(!user.isActive)}
          type="button"
        >
          {user.isActive ? "비활성화" : "활성화"}
        </button>
        <button
          className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
          disabled={isPending || user.isActive || user.id === currentUserId}
          onClick={deleteAccount}
          type="button"
        >
          삭제
        </button>
      </div>
      {message ? (
        <p aria-live="polite" className="mt-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </article>
  );
}
