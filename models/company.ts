import mongoose, { Schema, InferSchemaType } from "mongoose";

const CompanySchema = new Schema(
  {
    businessName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },

    // login identity (owner email)
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },

    // plan
    planDays: { type: Number, required: true },
    planStartsAt: { type: Date, required: true },
    planExpiresAt: { type: Date, required: true },

    // access control
    enabledModules: { type: [String], default: [] },
    maxUsers: { type: Number, default: 1 },

    isActive: { type: Boolean, default: true },

    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CompanySchema.index({ businessName: 1 });
CompanySchema.index({ isActive: 1 });

export type CompanyDoc = InferSchemaType<typeof CompanySchema>;
export default mongoose.models.Company || mongoose.model("Company", CompanySchema);
