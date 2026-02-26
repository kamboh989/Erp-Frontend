"use client";
import { useState } from "react";
import { AddLoginModal } from "./AddLoginModal";

export function ContactPersonsPanel({
  contact,
  onUpdated,
  canEdit,
}: {
  contact: any;
  onUpdated: () => void;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  async function addPerson(payload: any) {
    const next = Array.isArray(contact.contactPersons) ? [...contact.contactPersons] : [];
    next.push(payload);
    const trimmed = next.slice(0, 50);

    const res = await fetch(`/api/erp/customers/${contact._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactPersons: trimmed }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Failed");
      return;
    }
    onUpdated();
  }

  const btnBase =
    "px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.99]";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-900">Contact Persons</div>
          <div className="text-xs text-slate-500">Manage contact persons for this customer</div>
        </div>

        <button
          className={
            btnBase +
            " bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          }
          disabled={!canEdit}
          onClick={() => setOpen(true)}
        >
          + Add
        </button>
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-auto">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Department
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Designation
              </th>
            </tr>
          </thead>

          <tbody>
            {(contact.contactPersons || []).length ? (
              contact.contactPersons.map((p: any, i: number) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{p.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {`${p.prefix || ""} ${p.firstName || ""} ${p.lastName || ""}`.trim()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{p.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{p.department || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{p.designation || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No data available in table
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddLoginModal open={open} onClose={() => setOpen(false)} onSave={addPerson} />
    </div>
  );
}