import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TrackingResponse {
  id: number;
  invoice_id: string | null;
  order_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string | null;
}

const OrderTracking = () => {
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiCandidates = useMemo(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
    if (typeof window === "undefined") return base ? [base] : [];
    const origin = window.location.origin;
    const candidates = [
      base,
      `${origin}/backend`,
      `${origin}/farm-fresh/farm-fresh-live/backend`,
      `${origin}/farm-fresh-live/backend`,
      "http://localhost/backend",
      "http://localhost/farm-fresh/farm-fresh-live/backend",
      "http://localhost/farm-fresh-live/backend",
    ].filter((item) => item);
    return Array.from(new Set(candidates));
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanId = orderId.trim();
    if (!cleanId) {
      setError("Please enter your Order ID.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);

    try {
      let response: Response | null = null;
      let data: TrackingResponse | null = null;
      for (const base of apiCandidates) {
        try {
          const res = await fetch(`${base}/api/orders/track/${encodeURIComponent(cleanId)}`);
          if (!res.ok) continue;
          const json = (await res.json().catch(() => null)) as TrackingResponse | null;
          if (json && json.id) {
            response = res;
            data = json;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!response || !data) {
        throw new Error("Order not found. Please check your Order ID.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch tracking details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="pt-28 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-2xl font-display font-bold mb-4">Track Your Order</h1>
          <p className="text-muted-foreground mb-6">
            Enter your Order ID to view the current status and tracking details.
          </p>

          <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5 md:p-6">
            <div>
              <label className="text-sm font-medium">Order ID</label>
              <Input
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="Enter your Order ID"
                className="mt-2"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking..." : "Track Order"}
            </Button>
          </form>

          {result ? (
            <div className="mt-6 rounded-xl border border-border bg-white p-5 md:p-6 text-sm space-y-2">
              <p>
                <span className="font-semibold">Order ID:</span> #{result.id}
              </p>
              <p>
                <span className="font-semibold">Invoice ID:</span> {result.invoice_id || "N/A"}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {result.order_status || "Pending"}
              </p>
              <p>
                <span className="font-semibold">Tracking Number:</span> {result.tracking_number || "Not available yet"}
              </p>
              <p>
                <span className="font-semibold">Tracking Link:</span>{" "}
                {result.tracking_url ? (
                  <a
                    href={result.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    {result.tracking_url}
                  </a>
                ) : (
                  "Not available yet"
                )}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default OrderTracking;
