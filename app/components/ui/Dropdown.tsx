"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export function Dropdown({
  button,
  children,
}: {
  button: (props: { onClick: () => void }) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      {button({ onClick: () => setOpen((s) => !s) })}
      {open && (
        <div className="absolute z-50 mt-2 w-56 bg-white border rounded-md shadow-lg overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
      onClick={() => !disabled && onClick?.()}
      disabled={disabled}
    >
      {children}
    </button>
  );
}