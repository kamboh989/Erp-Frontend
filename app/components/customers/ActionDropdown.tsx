"use client";

import { useRouter } from "next/navigation";
import { Dropdown, DropdownItem } from "../ui/Dropdown";

export function ActionDropdown({
  row,
  canDelete,
  onPay,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  row: any;
  canDelete: boolean;
  onPay: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();

  return (
    <Dropdown
      button={({ onClick }) => (
        <button
          onClick={onClick}
          className="
            bg-white 
            border border-slate-200 
            rounded-xl 
            px-3 py-2 
            text-sm font-medium 
            text-slate-700 
            shadow-sm
            hover:bg-slate-50 
            hover:border-slate-300
            active:scale-[0.98]
            transition
          "
        >
          Actions ▾
        </button>
      )}
    >
      <div className="py-1">
        <DropdownItem onClick={onPay}>
          <span className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 transition">
            💰 Pay
          </span>
        </DropdownItem>

        <DropdownItem onClick={() => router.push(`/erp/customers/${row._id}`)}>
          <span className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 transition">
            👁 View
          </span>
        </DropdownItem>

        <DropdownItem onClick={onEdit}>
          <span className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 transition">
            ✏️ Edit
          </span>
        </DropdownItem>

        <DropdownItem
          onClick={onDelete}
          disabled={!canDelete}
        >
          <span
            className={`
              flex items-center gap-2 text-sm transition
              ${canDelete 
                ? "text-red-600 hover:text-red-700" 
                : "text-slate-400 cursor-not-allowed"}
            `}
          >
            🗑 Delete
          </span>
        </DropdownItem>

        <DropdownItem onClick={onToggleActive}>
          <span className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 transition">
            ⏻ {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </span>
        </DropdownItem>
      </div>
    </Dropdown>
  );
}