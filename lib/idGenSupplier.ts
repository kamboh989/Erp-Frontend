import SupplierCounter from "@/models/SupplierCounter";

export async function nextContactId(companyId: string, key: "CONTACT_SUPPLIER") {
  const c = await SupplierCounter.findOneAndUpdate(
    { companyId, key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  const n = Number((c as any)?.seq || 1);

  // ✅ S000001 style (Supplier)
  return `S${String(n).padStart(6, "0")}`;
}