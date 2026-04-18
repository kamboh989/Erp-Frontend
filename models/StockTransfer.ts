import mongoose, { Schema, InferSchemaType } from "mongoose";

const StockTransferItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    nameSnapshot: { type: String, trim: true },
    skuSnapshot: { type: String, trim: true },
    qty: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StockTransferSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    fromLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    toLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    transferDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ["PENDING", "IN_TRANSIT", "COMPLETED"], default: "PENDING", index: true },
    referenceNo: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    shippingCharges: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    items: { type: [StockTransferItemSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

StockTransferSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export default mongoose.models.StockTransfer || mongoose.model("StockTransfer", StockTransferSchema);
export type StockTransferDoc = InferSchemaType<typeof StockTransferSchema>;
