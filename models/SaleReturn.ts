import mongoose, { Schema, InferSchemaType } from "mongoose";

const SaleReturnItemSchema = new Schema(
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

const SaleReturnPaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, trim: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    paidAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const SaleReturnSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerNameSnapshot: { type: String, trim: true },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    returnDate: { type: Date, required: true, index: true },

    status: { type: String, enum: ["DRAFT", "FINAL", "CANCELLED"], default: "DRAFT", index: true },

    referenceNo: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },

    shippingCharges: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, trim: true },
    paymentReference: { type: String, trim: true },
    paymentNote: { type: String, trim: true },
    paymentStatus: { type: String, enum: ["UNPAID", "PARTIAL", "PAID"], default: "UNPAID" },
    payments: { type: [SaleReturnPaymentSchema], default: [] },

    items: { type: [SaleReturnItemSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

SaleReturnSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export type SaleReturnDoc = InferSchemaType<typeof SaleReturnSchema>;
export default mongoose.models.SaleReturn || mongoose.model("SaleReturn", SaleReturnSchema);
