import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { customerApi } from "@/lib/customerApi";

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await customerApi.login({ email, password });
      navigate("/customer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-24 max-w-md">
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <h1 className="text-2xl font-bold">Customer Login</h1>
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Password"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <p className="text-sm text-slate-600">
            New customer?{" "}
            <Link to="/customer/register" className="text-emerald-700 hover:underline">
              Register here
            </Link>
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerLogin;

