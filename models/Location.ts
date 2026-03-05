import mongoose, { Schema, InferSchemaType } from "mongoose";

const LocationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false, index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

LocationSchema.index({ companyId: 1, name: 1 }, { unique: true });
// ✅ only 1 default per company (partial unique index)
LocationSchema.index(
  { companyId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export type LocationDoc = InferSchemaType<typeof LocationSchema>;
export default mongoose.models.Location || mongoose.model("Location", LocationSchema);