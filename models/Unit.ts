import mongoose, { Schema, InferSchemaType } from "mongoose";

const UnitSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    name: { type: String, required: true, trim: true },
    short: { type: String, required: true, trim: true },
    allowDecimal: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

UnitSchema.index({ companyId: 1, name: 1 }, { unique: true });

export type UnitDoc = InferSchemaType<typeof UnitSchema>;
export default mongoose.models.Unit || mongoose.model("Unit", UnitSchema);