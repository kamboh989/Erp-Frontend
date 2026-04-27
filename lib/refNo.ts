import mongoose from "mongoose";
import Counter from "@/models/Counter";
import Purchase from "@/models/Purchase";
import Sale from "@/models/Sale";
import SaleReturn from "@/models/SaleReturn";
import PurchaseReturn from "@/models/PurchaseReturn";
import StockTransfer from "@/models/StockTransfer";
import Quotation from "@/models/Quotation";
import PurchaseOrder from "@/models/PurchaseOrder";

const MODEL_MAP: Record<string, mongoose.Model<any>> = {
  PURCHASE: Purchase,
  SALE: Sale,
  SALE_RETURN: SaleReturn,
  PURCHASE_RETURN: PurchaseReturn,
  STOCK_TRANSFER: StockTransfer,
  QUOTATION: Quotation,
  PURCHASE_ORDER: PurchaseOrder,
};

async function getActualCount(companyId: mongoose.Types.ObjectId, key: string): Promise<number> {
  const model = MODEL_MAP[key];
  if (!model) return 0;
  return await model.countDocuments({ companyId });
}

/**
 * Increments counter and returns next ref number.
 */
export async function nextRefNo(
  companyId: string,
  key: string,
  prefix: string
): Promise<string> {
  const companyObjId = new mongoose.Types.ObjectId(companyId);

  // If counter doesn't exist, initialize from actual count
  const existing = await Counter.findOne({ companyId: companyObjId, key }).lean();
  if (!existing) {
    const count = await getActualCount(companyObjId, key);
    await Counter.findOneAndUpdate(
      { companyId: companyObjId, key },
      { $setOnInsert: { seq: count } },
      { upsert: true, new: true }
    ).lean();
  }

  // Increment and return
  const doc = await Counter.findOneAndUpdate(
    { companyId: companyObjId, key },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, new: true }
  ).lean();

  const n = Number((doc as any)?.seq || 1);
  return `${prefix}-${String(n).padStart(5, "0")}`;
}

/**
 * Peeks next ref number WITHOUT incrementing.
 * Returns what the NEXT save will generate.
 */
export async function peekRefNo(
  companyId: string,
  key: string,
  prefix: string
): Promise<string> {
  const companyObjId = new mongoose.Types.ObjectId(companyId);

  const counter = await Counter.findOne({ companyId: companyObjId, key }).lean();

  let next: number;
  if (counter) {
    // Counter exists — next number = current seq + 1
    next = Number((counter as any).seq || 0) + 1;
  } else {
    // No counter yet — count actual records + 1
    const count = await getActualCount(companyObjId, key);
    next = count + 1;
  }

  return `${prefix}-${String(next).padStart(5, "0")}`;
}
