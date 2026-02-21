import { useEffect, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { FarmStayInquiry } from "@/admin/types";

const STATUS_OPTIONS: FarmStayInquiry["status"][] = ["New", "Confirmed", "Completed", "Cancelled"];

const AdminFarmStay = () => {
  const [inquiries, setInquiries] = useState<FarmStayInquiry[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await adminApi.getFarmStayInquiries();
    setInquiries(data);
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load farm stay inquiries"));
  }, []);

  const onStatusChange = async (id: number, status: FarmStayInquiry["status"]) => {
    await adminApi.updateFarmStayStatus(id, status);
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Farm Stay Management</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Dates</th>
              <th className="p-3">People</th>
              <th className="p-3">Message</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => (
              <tr key={inquiry.id} className="border-t align-top">
                <td className="p-3">{inquiry.full_name}</td>
                <td className="p-3">
                  <div>{inquiry.phone}</div>
                  <div className="text-slate-500">{inquiry.email}</div>
                </td>
                <td className="p-3">
                  {inquiry.check_in_date} to {inquiry.check_out_date}
                </td>
                <td className="p-3">{inquiry.people_count}</td>
                <td className="p-3 max-w-72">{inquiry.message || "-"}</td>
                <td className="p-3">
                  <select
                    className="h-9 rounded-md border px-2"
                    value={inquiry.status}
                    onChange={(e) => onStatusChange(inquiry.id, e.target.value as FarmStayInquiry["status"])}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFarmStay;

