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

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const labelBase = "text-xs mb-1 text-slate-500";

  const btnBase =
    "px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.99]";

  return (
    <Modal open={open} onClose={onClose} title="Add Login" widthClass="max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            ["prefix", "Prefix"],
            ["firstName", "First Name *"],
            ["lastName", "Last Name"],
            ["email", "Email *"],
            ["mobile", "Mobile Number"],
            ["department", "Department"],
            ["designation", "Designation"],
          ] as Array<[string, string]>
        ).map(([k, label]) => (
          <div key={k} className="space-y-1">
            <div className={labelBase}>{label}</div>
            <input
              className={inputBase}
              value={data[k]}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
          </div>
        ))}

        <div className="space-y-1">
          <div className={labelBase}>Sales Commission Percentage (%)</div>
          <input
            type="number"
            className={inputBase}
            value={data.salesCommissionPct}
            onChange={(e) =>
              setData({ ...data, salesCommissionPct: Number(e.target.value) })
            }
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-3 pt-1">
          {/* <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={data.isActive}
              onChange={(e) => setData({ ...data, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
            />
            Is active ?
          </label> */}

          {/* <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={data.allowLogin}
              onChange={(e) =>
                setData({ ...data, allowLogin: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
            />
            Allow login
          </label> */}
        </div>

        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button
            className={
              btnBase +
              " bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"
            }
            onClick={onClose}
          >
            Close
          </button>

          <button
            className={
              btnBase +
              " bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
            }
            onClick={() => {
              if (!data.firstName.trim() || !data.email.trim())
                return alert("First name & Email required");
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