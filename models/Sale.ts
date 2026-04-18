import mongoose, { Schema, InferSchemaType } from "mongoose";

const SaleItemSchema = new Schema(
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

const SalePaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, trim: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    paidAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const SaleSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerNameSnapshot: { type: String, trim: true },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    saleDate: { type: Date, required: true, index: true },

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
    paymentStatus: { type: String, enum: ["UNPAID", "PARTIAL", "PAID"], default: "UNPAID", index: true },
    payments: { type: [SalePaymentSchema], default: [] },

    items: { type: [SaleItemSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

SaleSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export type SaleDoc = InferSchemaType<typeof SaleSchema>;
export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
