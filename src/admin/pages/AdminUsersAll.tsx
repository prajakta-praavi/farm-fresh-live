import { useEffect, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { ManagedUser, UserRole } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditState = {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  password: string;
};

const roleLabel = (role: UserRole) =>
  role === "administrator" ? "Administrator" : role === "author" ? "Author" : "Subscriber";

const AdminUsersAll = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getUsers({
        search,
        role: roleFilter,
        page,
        per_page: perPage,
      });
      setUsers(Array.isArray(response.items) ? response.items : []);
      setTotal(response.pagination?.total ?? 0);
      setTotalPages(response.pagination?.total_pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [page, search, roleFilter]);

  const onSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const onReset = () => {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
    setPage(1);
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Delete this user?")) return;
    setError("");
    setMessage("");
    try {
      await adminApi.deleteUser(id);
      setMessage("User deleted.");
      await load();
      if (viewUser?.id === id) setViewUser(null);
      if (editUser?.id === id) setEditUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const onEdit = (user: ManagedUser) => {
    setEditUser({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      password: "",
    });
    setError("");
    setMessage("");
  };

  const onSaveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    setError("");
    setMessage("");
    try {
      await adminApi.updateUser(editUser.id, {
        username: editUser.username,
        email: editUser.email,
        role: editUser.role,
        password: editUser.password.trim() || undefined,
      });
      setEditUser(null);
      setMessage("User updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const startIndex = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endIndex = Math.min(total, page * perPage);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">All Users</h1>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by username or email"
            className="max-w-sm"
          />
          <select
            value={roleFilter}
            onChange={(event) => {
              setPage(1);
              setRoleFilter(event.target.value as UserRole | "");
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All roles</option>
            <option value="administrator">Administrator</option>
            <option value="author">Author</option>
            <option value="subscriber">Subscriber</option>
          </select>
          <Button type="button" onClick={onSearch}>
            Search
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Username</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Created Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="p-3">{user.id}</td>
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{roleLabel(user.role)}</td>
                <td className="p-3">{new Date(user.created_at).toLocaleString()}</td>
                <td className="p-3 space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setViewUser(user)}>
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(user.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={6}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-white p-4 text-sm">
        <p>
          Showing {startIndex}-{endIndex} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {viewUser ? (
        <div className="rounded-xl border bg-white p-4 space-y-2">
          <h2 className="font-semibold">View User</h2>
          <p>
            <span className="font-medium">ID:</span> {viewUser.id}
          </p>
          <p>
            <span className="font-medium">Username:</span> {viewUser.username}
          </p>
          <p>
            <span className="font-medium">Email:</span> {viewUser.email}
          </p>
          <p>
            <span className="font-medium">Role:</span> {roleLabel(viewUser.role)}
          </p>
          <p>
            <span className="font-medium">Created:</span> {new Date(viewUser.created_at).toLocaleString()}
          </p>
          <Button type="button" variant="outline" onClick={() => setViewUser(null)}>
            Close
          </Button>
        </div>
      ) : null}

      {editUser ? (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Edit User</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={editUser.username}
              onChange={(event) => setEditUser((prev) => (prev ? { ...prev, username: event.target.value } : prev))}
              placeholder="Username"
            />
            <Input
              type="email"
              value={editUser.email}
              onChange={(event) => setEditUser((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
              placeholder="Email"
            />
            <select
              value={editUser.role}
              onChange={(event) =>
                setEditUser((prev) => (prev ? { ...prev, role: event.target.value as UserRole } : prev))
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="administrator">Administrator</option>
              <option value="author">Author</option>
              <option value="subscriber">Subscriber</option>
            </select>
            <Input
              type="password"
              minLength={6}
              value={editUser.password}
              onChange={(event) => setEditUser((prev) => (prev ? { ...prev, password: event.target.value } : prev))}
              placeholder="New password (optional)"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={onSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditUser(null)} disabled={savingEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
};

export default AdminUsersAll;
