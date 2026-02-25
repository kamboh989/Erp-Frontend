import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/models/Customer";
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

    const doc = await Contact.findOne({
      _id: id,
      companyId: session.companyId,
    }).lean();

    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (!isCompanyAdmin(session)) {
      if (!isAssigned(doc, session.userId)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
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

    const doc = await Contact.findOne({
      _id: id,
      companyId: session.companyId,
    });

    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const admin = isCompanyAdmin(session);

    if (!admin) {
      if (!isAssigned(doc, session.userId)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      if (body.status !== undefined) {
        return NextResponse.json(
          { error: "FORBIDDEN_STATUS_CHANGE" },
          { status: 403 },
        );
      }
      if (body.assignedTo !== undefined) {
        return NextResponse.json(
          { error: "FORBIDDEN_ASSIGN_CHANGE" },
          { status: 403 },
        );
      }
      if (body.moreInfo?.openingBalance !== undefined) {
        return NextResponse.json(
          { error: "FORBIDDEN_OPENING_BAL_CHANGE" },
          { status: 403 },
        );
      }
    }

    // ✅ Force contactType always CUSTOMER
    (doc as any).contactType = "CUSTOMER";

    // ✅ DUPLICATE PREVENTION ON EDIT (exclude current _id)
    if (body.mobile !== undefined) {
      const nextMobile = String(body.mobile || "").trim();
      if (!nextMobile) {
        return NextResponse.json({ error: "MOBILE_REQUIRED" }, { status: 400 });
      }

      const mobileDup = await Contact.findOne({
        _id: { $ne: (doc as any)._id },
        companyId: session.companyId,
        contactType: "CUSTOMER",
        mobile: nextMobile,
      })
        .select("_id")
        .lean();

      if (mobileDup) {
        return NextResponse.json({ error: "MOBILE_ALREADY_EXISTS" }, { status: 409 });
      }
    }

    if (body.email !== undefined) {
      const nextEmail = String(body.email || "").trim().toLowerCase();
      if (nextEmail) {
        const emailDup = await Contact.findOne({
          _id: { $ne: (doc as any)._id },
          companyId: session.companyId,
          contactType: "CUSTOMER",
          email: nextEmail,
        })
          .select("_id")
          .lean();

        if (emailDup) {
          return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
        }
      }
    }

    if (body.partyType !== undefined) (doc as any).partyType = body.partyType;
    if (body.customerGroupId !== undefined)
      (doc as any).customerGroupId = body.customerGroupId || null;

    if (body.businessName !== undefined)
      (doc as any).businessName = String(body.businessName || "").trim();
    if (body.name !== undefined) (doc as any).name = String(body.name || "").trim();

    if (body.email !== undefined)
      (doc as any).email = String(body.email || "").trim().toLowerCase();

    if (body.mobile !== undefined)
      (doc as any).mobile = String(body.mobile || "").trim();

    if (body.dateOfBirth !== undefined)
      (doc as any).dateOfBirth = body.dateOfBirth
        ? new Date(body.dateOfBirth)
        : null;

    if (admin && body.assignedTo !== undefined) {
      (doc as any).assignedTo = Array.isArray(body.assignedTo)
        ? body.assignedTo
        : [];
    }

    // ✅ Update moreInfo fields + sync totals opening balance
    if (body.moreInfo !== undefined) {
      const mi = body.moreInfo || {};
      const current = (doc as any).moreInfo || {};

      const openingBal =
        mi.openingBalance !== undefined
          ? Number(mi.openingBalance ?? 0) || 0
          : Number(current.openingBalance ?? 0) || 0;

      (doc as any).moreInfo = {
        ...current,
        ...mi,
        taxNumber:
          mi.taxNumber !== undefined
            ? String(mi.taxNumber || "").trim()
            : current.taxNumber,
        payTerm:
          mi.payTerm !== undefined
            ? String(mi.payTerm || "").trim()
            : current.payTerm,
        creditLimit:
          mi.creditLimit !== undefined
            ? mi.creditLimit === ""
              ? null
              : Number(mi.creditLimit ?? 0) || 0
            : current.creditLimit,
        openingBalance: openingBal,
      };

      (doc as any).totals = {
        ...((doc as any).totals || {}),
        openingBalanceDue: openingBal,
      };
    }

    if (body.contactPersons !== undefined) {
      (doc as any).contactPersons = Array.isArray(body.contactPersons)
        ? body.contactPersons.slice(0, 3)
        : [];
    }

    if (admin && body.status !== undefined) {
      (doc as any).status = body.status;
    }

    (doc as any).updatedBy = session.userId;
    await doc.save();

    return NextResponse.json({ contact: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "DUPLICATE_CUSTOMER" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);

    if (!isCompanyAdmin(session)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await connectDB();
    const { id } = await ctx.params;

    const result = await Contact.deleteOne({
      _id: id,
      companyId: session.companyId,
    });

    if (!result.deletedCount)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}