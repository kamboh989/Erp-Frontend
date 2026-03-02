import mongoose, { Schema, Types } from "mongoose";

const SupplierCounterSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, required: true, index: true },
    key: { type: String, required: true }, // e.g. "CONTACT_SUPPLIER"
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SupplierCounterSchema.index({ companyId: 1, key: 1 }, { unique: true });

// ✅ SAFE export (prevents overwrite errors)
const SupplierCounter =
  mongoose.models.SupplierCounter || mongoose.model("SupplierCounter", SupplierCounterSchema);

export default SupplierCounter;