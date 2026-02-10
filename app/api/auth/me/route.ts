import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import {
  readCompanyCookie,
  setCompanyCookie,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const s = readCompanyCookie(req);
  if (!s) return NextResponse.json({ session: null }, { status: 200 });

  await connectDB();

  // ✅ add enabledSettings + companyName in select
  const company = await Company.findById(s.companyId)
    .select("isActive enabledModules enabledSettings companyName")
    .lean();

  if (!company?.isActive)
    return NextResponse.json({ session: null }, { status: 200 });

  // ✅ add allowedSettings in select
  const user = await CompanyUser.findById(s.userId)
    .select("isActive email name role isOwner allowedModules allowedSettings companyId")
    .lean();

  if (!user?.isActive)
    return NextResponse.json({ session: null }, { status: 200 });

  // ✅ modules trim (same as your old logic)
  const enabled = new Set<string>((company.enabledModules || []) as string[]);
  const allowed = ((user.allowedModules || []) as string[]).filter((m) =>
    enabled.has(m),
  );

  // ✅ settings trim = user.allowedSettings ∩ company.enabledSettings
  const enabledSettings = new Set<string>(
    (((company as any).enabledSettings || []) as string[]) || [],
  );

  let allowedSettings = (((user as any).allowedSettings || []) as string[]).filter((k) =>
    enabledSettings.has(k),
  );

  // ✅ optional gate: if SETTINGS module is not allowed, settings empty
  if (!allowed.includes("SETTINGS")) allowedSettings = [];

  const session = {
    userId: String(user._id),
    companyId: String(user.companyId),
    email: user.email,
    name: user.name || "",
    companyName: (company as any).companyName || "",
    role: (user.role || "STAFF") as any,
    isOwner: Boolean(user.isOwner),
    allowedModules: allowed,
    allowedSettings, // ✅ NEW
  };

  // ✅ Refresh cookie so frontend always gets latest permissions
  const res = NextResponse.json({ session }, { status: 200 });
  setCompanyCookie(res, session as any);
  return res;
}