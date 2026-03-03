import mongoose, { Schema, InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true }, // optional
    description: { type: String, trim: true }, // optional

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ companyId: 1, name: 1 }, { unique: true });
CategorySchema.index({ companyId: 1, code: 1 }, { unique: false });

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;
export default mongoose.models.Category || mongoose.model("Category", CategorySchema);