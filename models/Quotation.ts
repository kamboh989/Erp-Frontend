import mongoose, { Schema, InferSchemaType } from "mongoose";

const QuotationItemSchema = new Schema(
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

const QuotationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerNameSnapshot: { type: String, trim: true },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    quotationDate: { type: Date, required: true, index: true },
    expiryDate: { type: Date, default: null },

    status: { type: String, enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"], default: "DRAFT", index: true },

    referenceNo: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },

    items: [QuotationItemSchema],

    shippingCharges: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  },
  { timestamps: true },
);

// ✅ Unique per company
QuotationSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export default mongoose.models.Quotation || mongoose.model("Quotation", QuotationSchema);
export type QuotationType = InferSchemaType<typeof QuotationSchema>;