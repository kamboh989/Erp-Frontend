import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, authErrorResponse } from "@/lib/auth";

import Product from "@/models/Product";
import Category from "@/models/Category";
import Unit from "@/models/Unit";
import { productSchema } from "@/validators/product";

export async function POST(req: NextRequest) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();

    const raw = await req.json();

    const parsed = productSchema.safeParse({
      ...raw,
      openingStock: Number(raw.openingStock ?? 0),
      alertQty: Number(raw.alertQty ?? 0),
      purchasePrice: Number(raw.purchasePrice ?? 0),
      sellingPrice: Number(raw.sellingPrice ?? 0),
      manageStock: Boolean(raw.manageStock),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Force stock fields if manageStock OFF
    if (!data.manageStock) {
      data.openingStock = 0;
      data.alertQty = 0;
    }

    // ✅ Ensure selected category/unit belongs to same company (security + correctness)
    const [cat, unit] = await Promise.all([
      Category.findOne({ _id: data.categoryId, companyId: session.companyId, isActive: true }).lean(),
      Unit.findOne({ _id: data.unitId, companyId: session.companyId, isActive: true }).lean(),
    ]);

    if (!cat) return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
    if (!unit) return NextResponse.json({ error: "INVALID_UNIT" }, { status: 400 });

    try {
      const created = await Product.create({
        companyId: session.companyId,
        name: data.name.trim(),
        sku: data.sku,
        categoryId: data.categoryId,
        unitId: data.unitId,
        manageStock: data.manageStock,
        openingStock: data.openingStock,
        alertQty: data.alertQty,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        isActive: true,
      });

      return NextResponse.json({ productId: String(created._id) }, { status: 201 });
    } catch (e: any) {
      if (e?.code === 11000) {
        return NextResponse.json({ error: "SKU_ALREADY_EXISTS_IN_COMPANY" }, { status: 409 });
      }
      return NextResponse.json({ error: "CREATE_FAILED" }, { status: 400 });
    }
  } catch (err) {
    return authErrorResponse(err);
  }
}