import mongoose, { Schema, InferSchemaType } from "mongoose";

const ItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    nameSnapshot: { type: String, trim: true },
    skuSnapshot: { type: String, trim: true },

    qty: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const PurchaseReturnSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    supplierNameSnapshot: { type: String, trim: true },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    returnDate: { type: Date, required: true, index: true },

    status: { type: String, enum: ["DRAFT", "FINAL", "CANCELLED"], default: "DRAFT", index: true },

    referenceNo: { type: String, required: true, trim: true },

    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },

    shippingCharges: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    items: { type: [ItemSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// unique ref per company (avoid duplicate returns)
PurchaseReturnSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });

export type PurchaseReturnDoc = InferSchemaType<typeof PurchaseReturnSchema>;
export default mongoose.models.PurchaseReturn ||
  mongoose.model("PurchaseReturn", PurchaseReturnSchema);