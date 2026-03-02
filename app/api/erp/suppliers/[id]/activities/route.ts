import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Contact from "@/models/Supplier";
import ContactActivity from "@/models/SupplierActivity";
import { isCompanyAdmin } from "@/lib/perm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const contact = await Contact.findOne({ _id: id, companyId: session.companyId }).lean();
    if (!contact) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (!isCompanyAdmin(session)) {
      const assigned = (contact as any).assignedTo?.map(String) || [];
      if (!assigned.includes(String(session.userId))) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    const rows = await ContactActivity.find({
      companyId: session.companyId,
      contactId: id,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}