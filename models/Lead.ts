import mongoose, { Schema, InferSchemaType } from "mongoose";

const ActivitySchema = new Schema(
  {
    type: { type: String, enum: ["NOTE", "CALL", "FOLLOW_UP", "EMAIL"], required: true },
    note: { type: String, default: "" },
    byUserId: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LeadSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    // minimum identity
    name: { type: String, trim: true, default: "Unknown" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    businessName: { type: String, trim: true, default: "" },

    // source
    source: { type: String, enum: ["MANUAL", "META"], required: true, index: true },

    // meta identifiers (optional)
    meta: {
      pageId: { type: String, default: "" },
      formId: { type: String, default: "" },
      leadgenId: { type: String, default: "" },
    },

    // workflow
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "CONVERTED", "LOST"],
      default: "NEW",
      index: true,
    },

    // ✅ MULTI-ASSIGN (replaces assignedTo)
    assignedToIds: { type: [Schema.Types.ObjectId], ref: "CompanyUser", default: [], index: true },

    // ✅ FOLLOW-UP (professional minimal)
    nextFollowUpAt: { type: Date, default: null },
    followUpType: { type: String, enum: ["CALL", "MEETING", "WHATSAPP", "EMAIL"], default: "CALL" },
    followUpNote: { type: String, default: "" },

    // system fields
    createdBy: { type: String, enum: ["SYSTEM", "USER"], required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },

    activities: { type: [ActivitySchema], default: [] },
    lastActivityAt: { type: Date, default: null },

    // ✅ SOFT DELETE
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedByUserId: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ companyId: 1, createdAt: -1 });
LeadSchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 });
LeadSchema.index({ companyId: 1, phone: 1 });
LeadSchema.index({ companyId: 1, email: 1 });
LeadSchema.index({ companyId: 1, "meta.leadgenId": 1 }, { unique: true, sparse: true });


export type LeadDoc = InferSchemaType<typeof LeadSchema>;
export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
