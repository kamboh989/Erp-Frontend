import mongoose, { Schema, Types } from "mongoose";

const CounterSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, required: true, index: true },
    key: { type: String, required: true }, // e.g. "CONTACT_CUSTOMER"
    seq: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CounterSchema.index({ companyId: 1, key: 1 }, { unique: true });

export default mongoose.models.CustomerCounter || mongoose.model("CustomerCounter", CounterSchema);