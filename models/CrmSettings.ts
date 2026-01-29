import mongoose, { Schema, InferSchemaType } from "mongoose";

const CrmSettingsSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true, unique: true },

    // defaults
    defaultLeadStatus: { type: String, default: "NEW" }, // NEW
    metaDefaultOwnerId: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },

    // auto behavior
    autoMoveToContactedOnFirstActivity: { type: Boolean, default: true },

    // assignment behavior for meta leads
    metaAssignmentMode: { type: String, enum: ["DEFAULT_OWNER", "UNASSIGNED"], default: "DEFAULT_OWNER" },
  },
  { timestamps: true }
);

export type CrmSettingsDoc = InferSchemaType<typeof CrmSettingsSchema>;
export default mongoose.models.CrmSettings || mongoose.model("CrmSettings", CrmSettingsSchema);
