import mongoose, { Schema, InferSchemaType } from "mongoose";

const PurchaseOrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    lineTotal: { type: Number, required: true },

    // snapshots (name/sku at time of order)
    nameSnapshot: { type: String, default: "" },
    skuSnapshot: { type: String, default: "" },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    supplierNameSnapshot: { type: String, default: "" },

    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    locationName: { type: String, default: "" },

    orderDate: { type: Date, required: true },

    // Professional minimal statuses
    status: { type: String, enum: ["DRAFT", "FINAL", "CANCELLED"], default: "DRAFT", index: true },

    referenceNo: { type: String, required: true, trim: true },

    items: { type: [PurchaseOrderItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    notes: { type: String, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ companyId: 1, referenceNo: 1 }, { unique: true });
PurchaseOrderSchema.index({ companyId: 1, supplierId: 1, createdAt: -1 });

export type PurchaseOrderDoc = InferSchemaType<typeof PurchaseOrderSchema>;
export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", PurchaseOrderSchema);