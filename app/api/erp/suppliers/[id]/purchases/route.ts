import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit")) || 25));
    const skip = (page - 1) * limit;

    // For now, return empty array as purchase module is not fully implemented
    // This will be populated when purchase orders/bills module is created
    const purchases = [];
    const total = 0;
    const totals = { grandTotal: 0 };

    return NextResponse.json({
      page,
      limit,
      total,
      rows: purchases,
      totals,
      message: "Purchase module integration pending"
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}