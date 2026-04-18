import mongoose, { Schema, InferSchemaType } from "mongoose";

const QuoteItemSchema = new Schema(
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

const QuoteSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerNameSnapshot: { type: String, trim: true },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    quoteDate: { type: Date, required: true, index: true },

    status: { type: String, enum: ["DRAFT", "FINAL", "CANCELLED"], default: "DRAFT", index: true },

    referenceNo: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },

    shippingCharges: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    items: { type: [QuoteItemSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

QuoteSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export type QuoteDoc = InferSchemaType<typeof QuoteSchema>;
export default mongoose.models.Quote || mongoose.model("Quote", QuoteSchema);
