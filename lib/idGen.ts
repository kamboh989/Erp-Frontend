import Counter from "@/models/CustomerCounter";

export async function nextContactId(companyId: string, key: "CONTACT_CUSTOMER" | "CONTACT_SUPPLIER") {
  const c = await Counter.findOneAndUpdate(
    { companyId, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();

  const n = Number((c as any).seq || 1);
  // C000001 style
  return `C${String(n).padStart(6, "0")}`;
}