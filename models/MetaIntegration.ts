import mongoose, { Schema, InferSchemaType } from "mongoose";

const MetaIntegrationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, unique: true, index: true },

    isConnected: { type: Boolean, default: false },

    // after connect (future)
    pageId: { type: String, default: "" },
    formIds: { type: [String], default: [] },

    // store securely (encrypt later)
    accessToken: { type: String, default: "" },

    // assignment
    defaultOwnerId: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  },
  { timestamps: true }
);

export type MetaIntegrationDoc = InferSchemaType<typeof MetaIntegrationSchema>;
export default mongoose.models.MetaIntegration || mongoose.model("MetaIntegration", MetaIntegrationSchema);
