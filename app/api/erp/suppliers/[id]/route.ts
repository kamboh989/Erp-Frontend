import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Supplier from "@/models/Supplier";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import { isCompanyAdmin } from "@/lib/perm";

type Ctx = { params: Promise<{ id: string }> };

function isAssigned(doc: any, userId: string) {
  const assigned = (doc.assignedTo || []).map(String);
  return assigned.includes(String(userId));
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const doc = await Supplier.findOne({ _id: id, companyId: session.companyId }).lean();
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (!isCompanyAdmin(session) && !isAssigned(doc, session.userId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ contact: doc });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json();

    const doc = await Supplier.findOne({ _id: id, companyId: session.companyId });
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const admin = isCompanyAdmin(session);

    if (!admin) {
      if (!isAssigned(doc, session.userId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      if (body.status !== undefined) return NextResponse.json({ error: "FORBIDDEN_STATUS_CHANGE" }, { status: 403 });
      if (body.assignedTo !== undefined) return NextResponse.json({ error: "FORBIDDEN_ASSIGN_CHANGE" }, { status: 403 });
      if (body.moreInfo?.openingBalance !== undefined)
        return NextResponse.json({ error: "FORBIDDEN_OPENING_BAL_CHANGE" }, { status: 403 });
    }

    // ✅ force correct enum value
    (doc as any).contactType = "SUPPLIER";

    // duplicate prevention on edit
    if (body.mobile !== undefined) {
      const nextMobile = String(body.mobile || "").trim();
      if (!nextMobile) return NextResponse.json({ error: "MOBILE_REQUIRED" }, { status: 400 });

      const mobileDup = await Supplier.findOne({
        _id: { $ne: (doc as any)._id },
        companyId: session.companyId,
        contactType: "SUPPLIER",
        mobile: nextMobile,
      })
        .select("_id")
        .lean();

      if (mobileDup) return NextResponse.json({ error: "MOBILE_ALREADY_EXISTS" }, { status: 409 });

      (doc as any).mobile = nextMobile;
    }

    if (body.email !== undefined) {
      const nextEmail = String(body.email || "").trim().toLowerCase();
      if (nextEmail) {
        const emailDup = await Supplier.findOne({
          _id: { $ne: (doc as any)._id },
          companyId: session.companyId,
          contactType: "SUPPLIER",
          email: nextEmail,
        })
          .select("_id")
          .lean();

        if (emailDup) return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
      }
      (doc as any).email = nextEmail;
    }

    if (body.partyType !== undefined) (doc as any).partyType = body.partyType;
    if (body.businessName !== undefined) (doc as any).businessName = String(body.businessName || "").trim();
    if (body.name !== undefined) (doc as any).name = String(body.name || "").trim();
    if (body.dateOfBirth !== undefined) (doc as any).dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;

    if (admin && body.assignedTo !== undefined) {
      (doc as any).assignedTo = Array.isArray(body.assignedTo) ? body.assignedTo : [];
    }

    // update moreInfo + opening balance sync
    if (body.moreInfo !== undefined) {
      const mi = body.moreInfo || {};
      const current = (doc as any).moreInfo || {};

      const openingBal =
        mi.openingBalance !== undefined ? Number(mi.openingBalance ?? 0) || 0 : Number(current.openingBalance ?? 0) || 0;

      (doc as any).moreInfo = {
        ...current,
        ...mi,
        taxNumber: mi.taxNumber !== undefined ? String(mi.taxNumber || "").trim() : current.taxNumber,
        payTerm: mi.payTerm !== undefined ? String(mi.payTerm || "").trim() : current.payTerm,
        payTermPeriod: mi.payTermPeriod !== undefined ? String(mi.payTermPeriod || "").trim() : current.payTermPeriod,
        openingBalance: openingBal,
      };

      (doc as any).totals = {
        ...((doc as any).totals || {}),
        openingBalanceDue: openingBal,
      };
    }

    if (body.contactPersons !== undefined) {
      (doc as any).contactPersons = Array.isArray(body.contactPersons) ? body.contactPersons.slice(0, 3) : [];
    }

    if (admin && body.status !== undefined) (doc as any).status = body.status;

    (doc as any).updatedBy = session.userId;
    await doc.save();

    return NextResponse.json({ contact: doc });
  } catch (err: any) {
    console.error("SUPPLIER PATCH ERROR:", err?.message, err);

    if (err?.code === 11000) {
      return NextResponse.json({ error: "DUPLICATE_SUPPLIER" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    if (!isCompanyAdmin(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    await connectDB();
    const { id } = await ctx.params;

    const result = await Supplier.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}