import mongoose, { Schema, Types } from "mongoose";

const SupplierActivitySchema = new Schema(
  {
    companyId: { type: Types.ObjectId, required: true, index: true },
    contactId: { type: Types.ObjectId, required: true, index: true },
    action: { type: String, trim: true, required: true }, // "CREATED", "UPDATED", "PAYMENT_ADDED", "NOTE_ADDED"
    by: { type: Types.ObjectId, ref: "CompanyUser", required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

SupplierActivitySchema.index({ companyId: 1, contactId: 1, createdAt: -1 });

export default mongoose.models.SupplierActivity ||
  mongoose.model("SupplierActivity", SupplierActivitySchema);