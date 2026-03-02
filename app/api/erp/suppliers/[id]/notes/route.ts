import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Contact from "@/models/Supplier";
import ContactNote from "@/models/SupplierNote";
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

    const rows = await ContactNote.find({
      companyId: session.companyId,
      contactId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const contact = await Contact.findOne({ _id: id, companyId: session.companyId }).lean();
    if (!contact) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const body = await req.json();
    const heading = String(body.heading || "").trim();
    if (!heading) return NextResponse.json({ error: "HEADING_REQUIRED" }, { status: 400 });

    const note = await ContactNote.create({
      companyId: session.companyId,
      contactId: id,
      heading,
      descriptionHtml: String(body.descriptionHtml || ""),
      isPrivate: Boolean(body.isPrivate),
      documents: Array.isArray(body.documents) ? body.documents : [],
      createdBy: session.userId,
    });

    await ContactActivity.create({
      companyId: session.companyId,
      contactId: id,
      action: "NOTE_ADDED",
      by: session.userId,
      meta: { heading },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}