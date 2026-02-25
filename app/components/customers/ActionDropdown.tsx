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
        <button className="border rounded px-2 py-1 text-sm" onClick={onClick}>
          Actions ▾
        </button>
      )}
    >
      <DropdownItem onClick={onPay}>💰 Pay</DropdownItem>
      <DropdownItem onClick={() => router.push(`/erp/customers/${row._id}`)}>
        👁 View
      </DropdownItem>
      <DropdownItem onClick={onEdit}>✏️ Edit</DropdownItem>
      <DropdownItem
        onClick={onDelete}
        disabled={!canDelete}
      >
        🗑 Delete
      </DropdownItem>
      <DropdownItem onClick={onToggleActive}>
        ⏻ {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
      </DropdownItem>
    </Dropdown>
  );
}