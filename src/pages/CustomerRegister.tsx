import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { customerApi } from "@/lib/customerApi";

const CustomerRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await customerApi.register(form);
      navigate("/customer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-24 max-w-md">
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <h1 className="text-2xl font-bold">Customer Registration</h1>
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Full name"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Email"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Phone number"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Password"
            />
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Confirm password"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>
          <p className="text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/customer/login" className="text-emerald-700 hover:underline">
              Login here
            </Link>
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerRegister;

