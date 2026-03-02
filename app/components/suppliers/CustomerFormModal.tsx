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

  const [partyType, setPartyType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");

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
    setCreditLimit(mi.creditLimit === null || mi.creditLimit === undefined ? "" : String(mi.creditLimit));
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

  const title = isEdit ? "Edit supplier" : "Add a new supplier";

  async function save() {
    if (!mobile.trim()) {
      alert("Mobile is required");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        // ✅ force customer only
        contactType: "Supplier",
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
      const url = isEdit ? `/api/erp/suppliers/${initial._id}` : `/api/erp/suppliers`;
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

  const inputBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const selectBase =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition";

  const labelBase = "text-xs mb-1 text-slate-500";

  const btnBase = "px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.99]";

  const toggleBtn =
    "text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-sm " +
    "hover:bg-slate-50 active:scale-[0.99] transition";

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
      {/* ✅ Modal shell: flex + max height */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] border border-slate-200">
        {/* ✅ Header fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-500">Fill the details and save</div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ✅ Body scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Party type */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm font-medium text-slate-700">Customer type</div>

            <label className="text-sm flex items-center gap-2 text-slate-700">
              <input
                type="radio"
                checked={partyType === "INDIVIDUAL"}
                onChange={() => setPartyType("INDIVIDUAL")}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-200"
              />
              Individual
            </label>

            <label className="text-sm flex items-center gap-2 text-slate-700">
              <input
                type="radio"
                checked={partyType === "BUSINESS"}
                onChange={() => setPartyType("BUSINESS")}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-200"
              />
              Business
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="space-y-1">
              <div className={labelBase}>Business/Name</div>
              <input className={inputBase} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase}>Name</div>
              <input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase}>Mobile *</div>
              <input className={inputBase} value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase}>Email</div>
              <input className={inputBase} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase}>Customer Group</div>
              <select className={selectBase} value={customerGroupId} onChange={(e) => setCustomerGroupId(e.target.value)}>
                <option value="">None</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className={labelBase}>Date of birth</div>
              <input type="date" className={inputBase} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>

            {/* ✅ assign only admin */}
            <div className="md:col-span-2 space-y-1">
              <div className={labelBase}>Assigned to</div>
              <select
                multiple
                disabled={!isAdmin}
                className={
                  selectBase +
                  " min-h-[44px] " +
                  (!isAdmin ? "opacity-60 cursor-not-allowed bg-slate-50" : "")
                }
                value={assignedTo}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setAssignedTo(vals);
                }}
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              {!isAdmin && <div className="text-xs text-slate-500 mt-1">Staff auto assigned to self.</div>}
            </div>
          </div>

          {/* More Information */}
          <div className="mt-6">
            <button className={toggleBtn} onClick={() => setShowMore((s) => !s)}>
              More Informations {showMore ? "▲" : "▼"}
            </button>

            {showMore && (
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className={labelBase}>Tax number</div>
                  <input className={inputBase} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>Opening Balance</div>
                  <input className={inputBase} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>Pay term</div>
                  <input className={inputBase} value={payTerm} onChange={(e) => setPayTerm(e.target.value)} />
                </div>


                <div className="md:col-span-3 text-sm font-semibold text-slate-800 pt-2">Shipping Address</div>

                <div className="md:col-span-2 space-y-1">
                  <div className={labelBase}>Address line 1</div>
                  <input className={inputBase} value={address1} onChange={(e) => setAddress1(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>Address line 2</div>
                  <input className={inputBase} value={address2} onChange={(e) => setAddress2(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>City</div>
                  <input className={inputBase} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>State</div>
                  <input className={inputBase} value={state} onChange={(e) => setState(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>Country</div>
                  <input className={inputBase} value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <div className={labelBase}>Zip code</div>
                  <input className={inputBase} value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Contact Persons */}
          <div className="mt-6">
            <button className={toggleBtn} onClick={() => setShowPersons((s) => !s)}>
              Add Contact Persons {showPersons ? "▲" : "▼"}
            </button>

            {showPersons && (
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border border-slate-200 rounded-2xl p-4">
                    <div className="text-sm font-semibold text-slate-800 mb-3">Contact person {i + 1}</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className={labelBase}>Prefix</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.prefix || ""}
                          onChange={(e) => setPerson(i, { prefix: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>First Name</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.firstName || ""}
                          onChange={(e) => setPerson(i, { firstName: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>Last Name</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.lastName || ""}
                          onChange={(e) => setPerson(i, { lastName: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>Email</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.email || ""}
                          onChange={(e) => setPerson(i, { email: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>Mobile</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.mobile || ""}
                          onChange={(e) => setPerson(i, { mobile: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>Department</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.department || ""}
                          onChange={(e) => setPerson(i, { department: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>Designation</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.designation || ""}
                          onChange={(e) => setPerson(i, { designation: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className={labelBase}>Sales commission %</div>
                        <input
                          className={inputBase}
                          value={persons[i]?.commission || ""}
                          onChange={(e) => setPerson(i, { commission: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-xs text-slate-500">Max 3 contact persons.</div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Footer fixed */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 bg-white">
          <button
            onClick={onClose}
            className={btnBase + " bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"}
          >
            Close
          </button>

          <button
            onClick={save}
            disabled={saving}
            className={
              btnBase +
              " bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            }
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}