import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company_TMP";
import CompanyUser from "@/models/CompanyUser";
import { readCompanyCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const s = readCompanyCookie(req);
  if (!s) return NextResponse.json({ session: null }, { status: 200 });

  await connectDB();

  // ✅ add companyName in select
  const company = await Company.findById(s.companyId)
    .select("isActive enabledModules companyName")
    .lean();

  if (!company?.isActive)
    return NextResponse.json({ session: null }, { status: 200 });

  const user = await CompanyUser.findById(s.userId)
    .select("isActive email name role isOwner allowedModules companyId")
    .lean();

  if (!user?.isActive)
    return NextResponse.json({ session: null }, { status: 200 });

  const enabled = new Set<string>((company.enabledModules || []) as string[]);
  const allowed = ((user.allowedModules || []) as string[]).filter((m) =>
    enabled.has(m),
  );

  return NextResponse.json({
    session: {
      userId: String(user._id),
      companyId: String(user.companyId),
      email: user.email,
      name: user.name || "",
      companyName: (company as any).companyName || "", // ✅ NEW
      role: (user.role || "STAFF") as any,
      isOwner: Boolean(user.isOwner),
      allowedModules: allowed,
    },
  });
}
