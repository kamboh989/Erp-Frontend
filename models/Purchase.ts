import mongoose, { Schema, InferSchemaType } from "mongoose";

const PurchaseItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    nameSnapshot: { type: String, trim: true },
    skuSnapshot: { type: String, trim: true },

    qty: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    supplierNameSnapshot: { type: String, trim: true },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    purchaseDate: { type: Date, required: true, index: true },

    status: { type: String, enum: ["DRAFT", "FINAL", "CANCELLED"], default: "DRAFT", index: true },

    referenceNo: { type: String, required: true, trim: true }, // ✅ required

    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },

    shippingCharges: { type: Number, default: 0, min: 0 },

    subtotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    items: { type: [PurchaseItemSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

PurchaseSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export type PurchaseDoc = InferSchemaType<typeof PurchaseSchema>;
export default mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);