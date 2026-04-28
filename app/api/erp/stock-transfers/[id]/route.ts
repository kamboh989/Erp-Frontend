import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireCompanyAuth, requireCompanyAdmin, authErrorResponse } from "@/lib/auth";
import { updateProductStock, validateStockAvailability } from "@/lib/stockManager";
import StockTransfer from "@/models/StockTransfer";
import Product from "@/models/Product";

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function nnum(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    await connectDB();
    const { id } = await ctx.params;

    const row = await StockTransfer.findOne({ _id: id, companyId: session.companyId })
      .populate({ path: "fromLocationId", select: "name" })
      .populate({ path: "toLocationId", select: "name" })
      .populate({ path: "createdBy", select: "name email" })
      .populate({ path: "updatedBy", select: "name email" })
      .lean();

    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      row: {
        ...row,
        fromLocationName: (row as any).fromLocationId?.name || "",
        toLocationName: (row as any).toLocationId?.name || "",
      },
      can: {
        admin: Boolean(session.isOwner || session.role === "ADMIN"),
        update: Boolean((session.isOwner || session.role === "ADMIN") && row.status !== "COMPLETED"),
        delete: Boolean((session.isOwner || session.role === "ADMIN") && row.status === "PENDING"),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const fromLocationId = String(body?.fromLocationId || "").trim();
    const toLocationId = String(body?.toLocationId || "").trim();
    const transferDate = body?.transferDate ? new Date(body.transferDate) : new Date();
    const status = String(body?.status || "PENDING").toUpperCase();
    const referenceNo = String(body?.referenceNo || "").trim();
    const shippingCharges = Math.max(0, nnum(body?.shippingCharges, 0));
    const notes = String(body?.notes || "").trim();
    const itemsIn = Array.isArray(body?.items) ? body.items : [];

    if (!fromLocationId) return NextResponse.json({ error: "FROM_LOCATION_REQUIRED" }, { status: 400 });
    if (!toLocationId) return NextResponse.json({ error: "TO_LOCATION_REQUIRED" }, { status: 400 });
    if (fromLocationId === toLocationId) return NextResponse.json({ error: "SAME_LOCATION_TRANSFER" }, { status: 400 });
    if (!referenceNo) return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    if (!["PENDING", "IN_TRANSIT", "COMPLETED"].includes(status))
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    if (!itemsIn.length) return NextResponse.json({ error: "ITEMS_REQUIRED" }, { status: 400 });

    const doc = await StockTransfer.findOne({ _id: id, companyId: session.companyId });
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (doc.status === "COMPLETED") return NextResponse.json({ error: "CANNOT_EDIT_COMPLETED" }, { status: 400 });

    const oldStatus = doc.status;
    const oldFromLocationId = doc.fromLocationId.toString();
    const oldToLocationId = doc.toLocationId.toString();
    const oldItems = doc.items;

    const productIds = itemsIn.map((x: any) => String(x.productId || "")).filter(Boolean);
    const products = await Product.find({
      companyId: session.companyId,
      isActive: true,
      _id: { $in: productIds },
    })
      .select("_id name sku manageStock")
      .lean();

    const pMap = new Map(products.map((p: any) => [String(p._id), p]));
    const items = itemsIn.map((x: any) => {
      const productId = String(x.productId || "").trim();
      const qty = Math.max(0, nnum(x.qty));
      const unitPrice = Math.max(0, nnum(x.unitPrice));
      const prod = pMap.get(productId);
      if (!prod) throw new Error("INVALID_PRODUCT");
      return {
        productId,
        nameSnapshot: prod.name,
        skuSnapshot: prod.sku,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });

    if (items.some((it: any) => !it.productId || it.qty <= 0 || it.unitPrice < 0))
      return NextResponse.json({ error: "INVALID_ITEMS" }, { status: 400 });

    // Reverse old stock movements if status was IN_TRANSIT or COMPLETED
    if (oldStatus === "IN_TRANSIT" || oldStatus === "COMPLETED") {
      // Reverse OUT movements (add back to source)
      for (const item of oldItems) {
        const product = pMap.get(item.productId.toString());
        if (product?.manageStock) {
          await updateProductStock({
            companyId: session.companyId,
            productId: item.productId.toString(),
            locationId: oldFromLocationId,
            quantity: item.qty,
            type: "TRANSFER_IN",
            referenceType: "STOCK_TRANSFER",
            referenceId: id,
            referenceNo: `Reverse: ${doc.referenceNo}`,
            notes: "Stock transfer update - reverse OUT",
            createdBy: session.userId,
          });
        }
      }
    }

    if (oldStatus === "COMPLETED") {
      // Reverse IN movements (remove from destination)
      for (const item of oldItems) {
        const product = pMap.get(item.productId.toString());
        if (product?.manageStock) {
          await updateProductStock({
            companyId: session.companyId,
            productId: item.productId.toString(),
            locationId: oldToLocationId,
            quantity: item.qty,
            type: "TRANSFER_OUT",
            referenceType: "STOCK_TRANSFER",
            referenceId: id,
            referenceNo: `Reverse: ${doc.referenceNo}`,
            notes: "Stock transfer update - reverse IN",
            createdBy: session.userId,
          });
        }
      }
    }

    // Validate new stock availability
    if (status === "IN_TRANSIT" || status === "COMPLETED") {
      for (const item of items) {
        const product = pMap.get(item.productId);
        if (product?.manageStock) {
          await validateStockAvailability(
            session.companyId,
            item.productId,
            fromLocationId,
            item.qty
          );
        }
      }
    }

    const subtotal = items.reduce((s: number, it: any) => s + it.lineTotal, 0);
    const grandTotal = subtotal + shippingCharges;

    // Update document
    doc.fromLocationId = fromLocationId;
    doc.toLocationId = toLocationId;
    doc.transferDate = transferDate;
    doc.status = status;
    doc.referenceNo = referenceNo;
    doc.shippingCharges = shippingCharges;
    doc.notes = notes;
    doc.items = items;
    doc.subtotal = subtotal;
    doc.grandTotal = grandTotal;
    doc.updatedBy = session.userId;
    doc.finalizedAt = status === "COMPLETED" ? new Date() : null;

    await doc.save();

    // Apply new stock movements
    if (status === "IN_TRANSIT" || status === "COMPLETED") {
      // Move stock out from source location
      for (const item of items) {
        const product = pMap.get(item.productId);
        if (product?.manageStock) {
          await updateProductStock({
            companyId: session.companyId,
            productId: item.productId,
            locationId: fromLocationId,
            quantity: item.qty,
            type: "TRANSFER_OUT",
            referenceType: "STOCK_TRANSFER",
            referenceId: id,
            referenceNo,
            notes: `Updated transfer to ${toLocationId}`,
            createdBy: session.userId,
          });
        }
      }
    }

    if (status === "COMPLETED") {
      // Move stock in to destination location
      for (const item of items) {
        const product = pMap.get(item.productId);
        if (product?.manageStock) {
          await updateProductStock({
            companyId: session.companyId,
            productId: item.productId,
            locationId: toLocationId,
            quantity: item.qty,
            type: "TRANSFER_IN",
            referenceType: "STOCK_TRANSFER",
            referenceId: id,
            referenceNo,
            notes: `Updated transfer from ${fromLocationId}`,
            createdBy: session.userId,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (String(err?.message || "") === "INVALID_PRODUCT")
      return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
    if (String(err?.message || "").includes("Insufficient stock"))
      return NextResponse.json({ error: err.message }, { status: 400 });
    if (err?.code === 11000)
      return NextResponse.json({ error: "REFERENCE_ALREADY_EXISTS" }, { status: 409 });
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompanyAuth(req);
    requireCompanyAdmin(session);
    await connectDB();
    const { id } = await ctx.params;

    const doc = await StockTransfer.findOne({ _id: id, companyId: session.companyId });
    if (!doc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (doc.status !== "PENDING") return NextResponse.json({ error: "ONLY_PENDING_CAN_DELETE" }, { status: 400 });

    // Since it's PENDING, no stock movements to reverse
    const result = await StockTransfer.deleteOne({ _id: id, companyId: session.companyId });
    if (!result.deletedCount) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
