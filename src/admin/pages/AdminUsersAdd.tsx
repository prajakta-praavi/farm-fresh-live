import { useState, type FormEvent } from "react";
import { adminApi } from "@/admin/lib/api";
import type { UserRole } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AdminUsersAdd = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("administrator");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await adminApi.addUser({ username, email, password, role });
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("administrator");
      setMessage("User created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Add User</h1>
      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-5 space-y-4 max-w-2xl">
        <div>
          <label className="text-sm font-medium">Username</label>
          <Input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Email ID</label>
          <Input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Password</label>
          <Input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="administrator">Administrator</option>
            <option value="author">Author</option>
            <option value="subscriber">Subscriber</option>
          </select>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create User"}
        </Button>
      </form>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default AdminUsersAdd;
