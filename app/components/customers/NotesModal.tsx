"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";

export function NotesModal({
  open,
  onClose,
  contactId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contactId: string;
  onSaved: () => void;
}) {
  const [heading, setHeading] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!heading.trim()) return alert("Heading required");
    setSaving(true);
    try {
      const res = await fetch(`/api/erp/customers/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heading, descriptionHtml, isPrivate, documents: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || "Failed");

      onSaved();
      onClose();
      setHeading("");
      setDescriptionHtml("");
      setIsPrivate(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Note" widthClass="max-w-3xl">
      <div className="space-y-3">
        <div>
          <div className="text-xs mb-1">Heading *</div>
          <input className="w-full border rounded px-2 py-2" value={heading} onChange={(e) => setHeading(e.target.value)} />
        </div>

        <div>
          <div className="text-xs mb-1">Description</div>
          <textarea
            className="w-full border rounded px-2 py-2 min-h-[180px]"
            value={descriptionHtml}
            onChange={(e) => setDescriptionHtml(e.target.value)}
            placeholder="(Later: WYSIWYG editor)"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Is Private?
        </label>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={onClose}>Close</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}