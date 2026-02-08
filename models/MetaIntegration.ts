import mongoose, { Schema, InferSchemaType } from "mongoose";

const MetaIntegrationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    // which page is connected
    pageId: { type: String, required: true, index: true },
    pageName: { type: String, default: "" },

    // encrypted page access token
    pageAccessTokenEnc: { type: String, required: true },

    // allow multiple forms
    formIds: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MetaIntegrationSchema.index({ companyId: 1, pageId: 1 }, { unique: true });

export type MetaIntegrationDoc = InferSchemaType<typeof MetaIntegrationSchema>;
export default mongoose.models.MetaIntegration ||
  mongoose.model("MetaIntegration", MetaIntegrationSchema);
