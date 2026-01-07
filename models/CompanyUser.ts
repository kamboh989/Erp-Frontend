import mongoose, { Schema, InferSchemaType } from "mongoose";

const CompanyUserSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    name: { type: String, trim: true },
    phone: { type: String, trim: true },

    role: { type: String, enum: ["ADMIN", "STAFF"], required: false },


    allowedModules: { type: [String], default: [] },

    isOwner: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompanyUserSchema.index({ companyId: 1, email: 1 }, { unique: true });
CompanyUserSchema.index({ companyId: 1, createdAt: -1 });

export type CompanyUserDoc = InferSchemaType<typeof CompanyUserSchema>;
export default mongoose.models.CompanyUser || mongoose.model("CompanyUser", CompanyUserSchema);
