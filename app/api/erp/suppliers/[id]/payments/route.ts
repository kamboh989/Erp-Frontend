import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";
import Contact from "@/models/Supplier";
import ContactPayment from "@/models/SupplierPayment";
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

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "ALL";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const subscriptions = url.searchParams.get("subscriptions") === "1"; // placeholder

    const filter: any = { companyId: session.companyId, contactId: id };
    if (from || to) filter.paidOn = {};
    if (from) filter.paidOn.$gte = new Date(from);
    if (to) filter.paidOn.$lte = new Date(to);
    if (status !== "ALL") {
      // placeholder if you want status later
    }
    if (subscriptions) {
      // placeholder later
    }

    const rows = await ContactPayment.find(filter).sort({ paidOn: -1 }).lean();

    const totals = rows.reduce(
      (acc: any, r: any) => {
        acc.totalAmount += Number(r.amount || 0);
        return acc;
      },
      { totalAmount: 0 },
    );

    return NextResponse.json({ rows, totals });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const contact = await Contact.findOne({ _id: id, companyId: session.companyId });
    if (!contact) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // staff allowed to add payment? (ERP usually yes)
    if (!isCompanyAdmin(session)) {
      const assigned = (contact as any).assignedTo?.map(String) || [];
      if (!assigned.includes(String(session.userId))) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    const body = await req.json();

    const paymentMethod = String(body.paymentMethod || "Cash").trim();
    const paidOn = body.paidOn ? new Date(body.paidOn) : new Date();
    const amount = Number(body.amount || 0);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "AMOUNT_REQUIRED" }, { status: 400 });
    }

    const pay = await ContactPayment.create({
      companyId: session.companyId,
      contactId: id,
      paymentMethod,
      paidOn,
      amount,
      referenceNo: String(body.referenceNo || "").trim(),
      paymentFor: String(body.paymentFor || "").trim(),
      note: String(body.note || "").trim(),
      createdBy: session.userId,
    });

    // ✅ Update fast totals (advance balance etc.) - basic example
    // Here we treat payment as "advanceBalance" increment. Adjust later with invoices.
    (contact as any).totals.advanceBalance = Number((contact as any).totals?.advanceBalance || 0) + amount;
    await contact.save();

    await ContactActivity.create({
      companyId: session.companyId,
      contactId: id,
      action: "PAYMENT_ADDED",
      by: session.userId,
      meta: { amount, paymentMethod },
    });

    return NextResponse.json({ payment: pay }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}