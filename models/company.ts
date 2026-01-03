import mongoose, { Schema, InferSchemaType } from "mongoose";
import type { AppModule } from "@/types/rbac";

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },

    // modules enabled for this tenant/company
    enabledModules: { type: [String], default: [] }, // AppModule[]

    // optional: for multi-branch etc
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CompanySchema.index({ name: 1 });

export type CompanyDoc = InferSchemaType<typeof CompanySchema>;
export default mongoose.models.Company || mongoose.model("Company", CompanySchema);
