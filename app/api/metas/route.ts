import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";

import Category from "@/models/Category";
import Unit from "@/models/Unit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const [categories, units] = await Promise.all([
      Category.find({ companyId: session.companyId, isActive: true })
        .select("_id name")
        .sort({ name: 1 })
        .lean(),
      Unit.find({ companyId: session.companyId, isActive: true })
        .select("_id name short allowDecimal")
        .sort({ name: 1 })
        .lean(),
    ]);

    return NextResponse.json({ categories, units });
  } catch (err) {
    return authErrorResponse(err);
  }
}