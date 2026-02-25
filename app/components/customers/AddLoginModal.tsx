"use client";
import { useState } from "react";
import { Modal } from "../ui/Modal";

export function AddLoginModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const [data, setData] = useState<any>({
    prefix: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    department: "",
    designation: "",
    salesCommissionPct: 0,
    allowLogin: true,
    isActive: true,
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Login" widthClass="max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["prefix", "Prefix"],
          ["firstName", "First Name *"],
          ["lastName", "Last Name"],
          ["email", "Email *"],
          ["mobile", "Mobile Number"],
          ["department", "Department"],
          ["designation", "Designation"],
        ].map(([k, label]) => (
          <div key={k}>
            <div className="text-xs mb-1">{label}</div>
            <input
              className="w-full border rounded px-2 py-2"
              value={data[k]}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
          </div>
        ))}

        <div>
          <div className="text-xs mb-1">Sales Commission Percentage (%)</div>
          <input
            type="number"
            className="w-full border rounded px-2 py-2"
            value={data.salesCommissionPct}
            onChange={(e) => setData({ ...data, salesCommissionPct: Number(e.target.value) })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(e) => setData({ ...data, isActive: e.target.checked })}
          />
          Is active ?
        </label>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={data.allowLogin}
            onChange={(e) => setData({ ...data, allowLogin: e.target.checked })}
          />
          Allow login
        </label>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={onClose}>Close</button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={() => {
              if (!data.firstName.trim() || !data.email.trim()) return alert("First name & Email required");
              onSave(data);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}