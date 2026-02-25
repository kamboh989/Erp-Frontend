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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="font-semibold">Contact Persons</div>
        <button
          className="px-3 py-2 rounded bg-blue-600 text-white"
          disabled={!canEdit}
          onClick={() => setOpen(true)}
        >
          + Add
        </button>
      </div>

      <div className="mt-3 border rounded overflow-auto">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2 text-left">Designation</th>
            </tr>
          </thead>
          <tbody>
            {(contact.contactPersons || []).length ? (
              contact.contactPersons.map((p: any, i: number) => (
                <tr className="border-t" key={i}>
                  <td className="p-2">{p.email}</td>
                  <td className="p-2">{`${p.prefix || ""} ${p.firstName || ""} ${p.lastName || ""}`.trim()}</td>
                  <td className="p-2">{p.email}</td>
                  <td className="p-2">{p.department || "-"}</td>
                  <td className="p-2">{p.designation || "-"}</td>
                </tr>
              ))
            ) : (
              <tr><td className="p-3" colSpan={5}>No data available in table</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AddLoginModal open={open} onClose={() => setOpen(false)} onSave={addPerson} />
    </div>
  );
}