import bcrypt from "bcryptjs";
import CompanyUser from "@/models/CompanyUser";

export async function blockSamePasswordAcrossCompanies(opts: {
  email: string;
  companyId: string;
  plainPassword: string;
  excludeUserId?: string;
}) {
  const e = String(opts.email).toLowerCase().trim();
  const companyId = String(opts.companyId);
  const plain = String(opts.plainPassword);

  const q: any = {
    email: e,
    companyId: { $ne: companyId },
    isActive: true,
  };

  if (opts.excludeUserId) {
    q._id = { $ne: opts.excludeUserId };
  }

  const others = await CompanyUser.find(q).select("passwordHash").lean();

  for (const u of others) {
    const same = await bcrypt.compare(plain, String(u.passwordHash));
    if (same) return true; // ❌ BLOCK
  }

  return false; // ✅ OK
}
