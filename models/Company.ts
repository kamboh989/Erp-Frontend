import mongoose, { Schema, InferSchemaType } from "mongoose";

const CompanySchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true },

    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, trim: true },

    enabledModules: { type: [String], default: [] },
    maxUsers: { type: Number, default: 1 },

    isActive: { type: Boolean, default: true },

    // optional (agar tum use karna chaho later)
    planStartsAt: { type: Date },
    planExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export type CompanyDoc = InferSchemaType<typeof CompanySchema>;
export default mongoose.models.Company || mongoose.model("Company", CompanySchema);
