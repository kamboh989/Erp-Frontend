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
        body: JSON.stringify({
          heading,
          descriptionHtml,
          isPrivate,
          documents: [],
        }),
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

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const textareaBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition min-h-[180px]";

  const btnBase =
    "px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.99]";

  return (
    <Modal open={open} onClose={onClose} title="Add Note" widthClass="max-w-3xl">
      <div className="space-y-5">
        {/* Heading */}
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Heading *</div>
          <input
            className={inputBase}
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Description</div>
          <textarea
            className={textareaBase}
            value={descriptionHtml}
            onChange={(e) => setDescriptionHtml(e.target.value)}
            placeholder="(Later: WYSIWYG editor)"
          />
        </div>

        {/* Private toggle */}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
          />
          Is Private?
        </label>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pt-2">
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
              " bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            }
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}