import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Sale from "@/models/Sale";
import Purchase from "@/models/Purchase";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const sales = await Sale.find({
      "items.productId": productId,
      status: "FINAL",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const purchases = await Purchase.find({
      "items.productId": productId,
      status: "FINAL",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const salesData = sales.map((s: any) => {
      const item = s.items.find((i: any) => String(i.productId) === productId);
      return {
        id: s._id,
        date: s.saleDate,
        qty: item?.qty || 0,
        status: s.status,
        createdAt: s.createdAt,
      };
    });

    const purchasesData = purchases.map((p: any) => {
      const item = p.items.find((i: any) => String(i.productId) === productId);
      return {
        id: p._id,
        date: p.purchaseDate,
        qty: item?.qty || 0,
        status: p.status,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        openingStock: product.openingStock || 0,
        currentStock: product.currentStock || 0,
        manageStock: product.manageStock,
      },
      sales: salesData,
      purchases: purchasesData,
      calculation: {
        openingStock: product.openingStock || 0,
        totalSales: salesData.reduce((sum, s) => sum + s.qty, 0),
        totalPurchases: purchasesData.reduce((sum, p) => sum + p.qty, 0),
        expectedStock: (product.openingStock || 0) + purchasesData.reduce((sum, p) => sum + p.qty, 0) - salesData.reduce((sum, s) => sum + s.qty, 0),
        actualStock: product.currentStock || 0,
        isCorrect: ((product.openingStock || 0) + purchasesData.reduce((sum, p) => sum + p.qty, 0) - salesData.reduce((sum, s) => sum + s.qty, 0)) === (product.currentStock || 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
