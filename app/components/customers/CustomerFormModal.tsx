"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: any | null;
  onSaved: () => void;

  // ✅ from page
  isAdmin?: boolean;
  users?: Array<{ _id: string; name: string; role: string }>;
};

export function CustomerFormModal({
  open,
  onClose,
  initial,
  onSaved,
  isAdmin = false,
  users = [],
}: Props) {
  const isEdit = Boolean(initial?._id);

  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showPersons, setShowPersons] = useState(false);

  const [partyType, setPartyType] = useState<"INDIVIDUAL" | "BUSINESS">(
    "INDIVIDUAL",
  );

  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [customerGroupId, setCustomerGroupId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  // moreInfo
  const [taxNumber, setTaxNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState<string>("");
  const [payTerm, setPayTerm] = useState("");
  const [openingBalance, setOpeningBalance] = useState<string>("0");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [zip, setZip] = useState("");

  // contact persons (max 3)
  const [persons, setPersons] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;

    const r = initial || {};
    setPartyType((r.partyType as any) || "INDIVIDUAL");

    setBusinessName(r.businessName || "");
    setName(r.name || "");
    setMobile(r.mobile || "");
    setEmail(r.email || "");

    setCustomerGroupId(r.customerGroupId || "");
    setDateOfBirth(r.dateOfBirth ? String(r.dateOfBirth).slice(0, 10) : "");

    setAssignedTo(Array.isArray(r.assignedTo) ? r.assignedTo.map(String) : []);

    const mi = r.moreInfo || {};
    setTaxNumber(mi.taxNumber || "");
    setCreditLimit(
      mi.creditLimit === null || mi.creditLimit === undefined
        ? ""
        : String(mi.creditLimit),
    );
    setPayTerm(mi.payTerm || "");
    setOpeningBalance(String(mi.openingBalance ?? mi.openingBalanceDue ?? 0));

    setAddress1(mi.address1 || "");
    setAddress2(mi.address2 || "");
    setCity(mi.city || "");
    setState(mi.state || "");
    setCountry(mi.country || "");
    setZip(mi.zip || "");

    setPersons(Array.isArray(r.contactPersons) ? r.contactPersons.slice(0, 3) : []);

    setShowMore(false);
    setShowPersons(false);
  }, [open, initial]);

  const title = isEdit ? "Edit contact" : "Add a new contact";

  async function save() {
    if (!mobile.trim()) {
      alert("Mobile is required");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        // ✅ force customer only
        contactType: "CUSTOMER",
        partyType,
        businessName,
        name,
        mobile,
        email,

        customerGroupId: customerGroupId || null,
        dateOfBirth: dateOfBirth || null,

        // ✅ assign only if admin, otherwise ignored by backend anyway
        assignedTo: isAdmin ? assignedTo : undefined,

        moreInfo: {
          taxNumber,
          creditLimit,
          payTerm,
          openingBalance,

          address1,
          address2,
          city,
          state,
          country,
          zip,
        },

        contactPersons: persons.slice(0, 3),
      };

      // ✅ BACKEND URL SAME (as you asked)
      const url = isEdit ? `/api/erp/customers/${initial._id}` : `/api/erp/customers`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed");
        return;
      }

      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function setPerson(i: number, patch: any) {
    setPersons((prev) => {
      const next = [...prev];
      next[i] = { ...(next[i] || {}), ...patch };
      return next.slice(0, 3);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
      {/* ✅ Modal shell: flex + max height */}
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
        {/* ✅ Header fixed */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="text-lg font-semibold">{title}</div>
          <button onClick={onClose} className="text-sm border rounded px-2 py-1">
            ✕
          </button>
        </div>

        {/* ✅ Body scrollable */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Party type */}
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">Customer type</div>
            <label className="text-sm flex items-center gap-2">
              <input
                type="radio"
                checked={partyType === "INDIVIDUAL"}
                onChange={() => setPartyType("INDIVIDUAL")}
              />
              Individual
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="radio"
                checked={partyType === "BUSINESS"}
                onChange={() => setPartyType("BUSINESS")}
              />
              Business
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div>
              <div className="text-xs mb-1">Business/Name</div>
              <input
                className="w-full border rounded px-2 py-2"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs mb-1">Name</div>
              <input
                className="w-full border rounded px-2 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs mb-1">Mobile *</div>
              <input
                className="w-full border rounded px-2 py-2"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs mb-1">Email</div>
              <input
                className="w-full border rounded px-2 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs mb-1">Customer Group</div>
              <select
                className="w-full border rounded px-2 py-2"
                value={customerGroupId}
                onChange={(e) => setCustomerGroupId(e.target.value)}
              >
                <option value="">None</option>
              </select>
            </div>

            <div>
              <div className="text-xs mb-1">Date of birth</div>
              <input
                type="date"
                className="w-full border rounded px-2 py-2"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            {/* ✅ assign only admin */}
            <div className="md:col-span-2">
              <div className="text-xs mb-1">Assigned to</div>
              <select
                multiple
                disabled={!isAdmin}
                className="w-full border rounded px-2 py-2"
                value={assignedTo}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  );
                  setAssignedTo(vals);
                }}
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              {!isAdmin && (
                <div className="text-xs text-muted-foreground mt-1">
                  Staff auto assigned to self.
                </div>
              )}
            </div>
          </div>

          {/* More Information */}
          <div className="mt-4">
            <button
              className="text-sm border rounded px-3 py-2"
              onClick={() => setShowMore((s) => !s)}
            >
              More Informations {showMore ? "▲" : "▼"}
            </button>

            {showMore && (
              <div className="mt-3 border rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs mb-1">Tax number</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">Opening Balance</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">Pay term</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={payTerm}
                    onChange={(e) => setPayTerm(e.target.value)}
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="text-xs mb-1">
                    Credit Limit (keep blank for no limit)
                  </div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>

                {/* Shipping address */}
                <div className="md:col-span-3 font-medium text-sm mt-2">
                  Shipping Address
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs mb-1">Address line 1</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">Address line 2</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">City</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">State</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">Country</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs mb-1">Zip code</div>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Persons */}
          <div className="mt-4">
            <button
              className="text-sm border rounded px-3 py-2"
              onClick={() => setShowPersons((s) => !s)}
            >
              Add Contact Persons {showPersons ? "▲" : "▼"}
            </button>

            {showPersons && (
              <div className="mt-3 border rounded p-3 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border rounded p-3">
                    <div className="text-sm font-medium mb-2">
                      Contact person {i + 1}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs mb-1">Prefix</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.prefix || ""}
                          onChange={(e) =>
                            setPerson(i, { prefix: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">First Name</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.firstName || ""}
                          onChange={(e) =>
                            setPerson(i, { firstName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Last Name</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.lastName || ""}
                          onChange={(e) =>
                            setPerson(i, { lastName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Email</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.email || ""}
                          onChange={(e) =>
                            setPerson(i, { email: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Mobile</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.mobile || ""}
                          onChange={(e) =>
                            setPerson(i, { mobile: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Department</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.department || ""}
                          onChange={(e) =>
                            setPerson(i, { department: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Designation</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.designation || ""}
                          onChange={(e) =>
                            setPerson(i, { designation: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-xs mb-1">Sales commission %</div>
                        <input
                          className="w-full border rounded px-2 py-2"
                          value={persons[i]?.commission || ""}
                          onChange={(e) =>
                            setPerson(i, { commission: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">
                  Max 3 contact persons.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Footer fixed */}
        <div className="px-5 py-4 border-t flex items-center justify-end gap-2 shrink-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Close
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}