import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { listUsers, AdminUser } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listUsers().then(setUsers).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!users) return <LoadingSpinner label="Loading users…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Customers ({users.length})</h1>
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{u.name}</td>
                <td className="px-4 py-3 text-ink-600">{u.email}</td>
                <td className="px-4 py-3 text-ink-600">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-ink-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
