import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerApi } from "@/lib/customerApi";

const CustomerProfile = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    customerApi
      .me()
      .then((data) => {
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"));
  }, []);

  const onSaveProfile = async () => {
    setError("");
    setMessage("");
    try {
      await customerApi.updateProfile({ name, phone });
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const onChangePassword = async () => {
    setError("");
    setMessage("");
    try {
      await customerApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
          <Input value={email} readOnly placeholder="Email" />
        </div>
        <Button type="button" onClick={onSaveProfile}>
          Save Profile
        </Button>
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
        <Button type="button" onClick={onChangePassword}>
          Update Password
        </Button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default CustomerProfile;

