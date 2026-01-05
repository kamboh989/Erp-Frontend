import mongoose, { Schema, InferSchemaType } from "mongoose";

const SuperAdminSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type SuperAdminDoc = InferSchemaType<typeof SuperAdminSchema>;
export default mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);
