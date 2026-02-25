"use client";

import { ReactNode, useEffect } from "react";

export function Modal({
  open,
  title,
  children,
  onClose,
  widthClass = "max-w-3xl",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  widthClass?: string;
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full flex items-center justify-center p-4">
        <div className={`w-full ${widthClass} bg-white rounded-xl shadow-xl overflow-hidden`}>
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold">{title}</div>
            <button className="px-2 py-1 text-sm" onClick={onClose}>✕</button>
          </div>
          <div className="p-4 max-h-[80vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}