import { useEffect, useState, type ChangeEvent } from "react";
import { adminApi } from "@/admin/lib/api";
import { setAdminSession, getAdminToken } from "@/admin/lib/auth";
import type { AdminProfile as AdminProfileType } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

const AdminProfile = () => {
  const [profile, setProfile] = useState<AdminProfileType | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = async () => {
    setError("");
    const data = await adminApi.getAdminMe();
    setProfile(data);
    setName(data.name || "");
    setUsername(data.username || "");
    setEmail(data.email || "");
    const token = getAdminToken();
    if (token) {
      setAdminSession(token, {
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        profile_image: data.profile_image || null,
        last_login: data.last_login || null,
        role: "admin",
      });
    }
  };

  useEffect(() => {
    loadProfile().catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"));
  }, []);

  const onUpdateProfile = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await adminApi.updateAdminProfile({ name, username, email });
      setProfile(updated);
      const token = getAdminToken();
      if (token) {
        setAdminSession(token, {
          id: updated.id,
          name: updated.name,
          username: updated.username,
          email: updated.email,
          profile_image: updated.profile_image || null,
          last_login: updated.last_login || null,
          role: "admin",
        });
      }
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const onChangePassword = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApi.changeAdminPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const onUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const data = await adminApi.uploadAdminProfileImage(file);
      setProfile((prev) => {
        const updated = prev ? { ...prev, profile_image: data.profile_image } : prev;
        const token = getAdminToken();
        if (token && updated) {
          setAdminSession(token, {
            id: updated.id,
            name: updated.name,
            username: updated.username,
            email: updated.email,
            profile_image: updated.profile_image || null,
            last_login: updated.last_login || null,
            role: "admin",
          });
        }
        return updated;
      });
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      event.target.value = "";
    }
  };

  const profileImage =
    profile?.profile_image && profile.profile_image.startsWith("/")
      ? `${API_BASE_URL}${profile.profile_image}`
      : profile?.profile_image || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Profile</h1>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Profile Details</h2>
        <div className="flex items-center gap-4">
          <img
            src={profileImage || "https://placehold.co/80x80?text=Admin"}
            alt="Admin profile"
            className="h-20 w-20 rounded-full object-cover border"
          />
          <Input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onUploadPhoto} className="max-w-xs" />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        </div>
        <Button type="button" onClick={onUpdateProfile} disabled={isSaving}>
          Save Profile
        </Button>
        <p className="text-xs text-slate-500">
          Last login: {profile?.last_login ? new Date(profile.last_login).toLocaleString() : "-"}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Change Password</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Current password"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
          />
        </div>
        <Button type="button" onClick={onChangePassword} disabled={isSaving}>
          Update Password
        </Button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default AdminProfile;
