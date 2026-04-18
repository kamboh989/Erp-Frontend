"use client";

import { useEffect, useRef } from "react";

export function FormError({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm"
    >
      <span className="mt-0.5 text-rose-500 text-base leading-none">✕</span>
      <span className="font-medium">{message}</span>
    </div>
  );
}
