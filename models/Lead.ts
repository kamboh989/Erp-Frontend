import mongoose, { Schema, InferSchemaType } from "mongoose";
import Counter from "@/models/Counter";

/* ---------------- ACTIVITY ---------------- */
const ActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["NOTE", "CALL", "FOLLOW_UP", "EMAIL"],
      required: true,
    },
    note: { type: String, default: "" },
    byUserId: { type: Schema.Types.ObjectId, ref: "CompanyUser", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ---------------- META (OPTIONAL SUBDOC) ---------------- */
const LeadMetaSchema = new Schema(
  {
    pageId: { type: String },
    formId: { type: String },
    leadgenId: { type: String },
  },
  { _id: false }
);

/* ---------------- LEAD ---------------- */
const LeadSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // ✅ 7-digit professional lead id
    leadNo: { type: Number, default: null, index: true },
    leadId7: { type: String, default: "", index: true },

    // identity
    name: { type: String, trim: true, default: "Unknown" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    businessName: { type: String, trim: true, default: "" },

    // source
    source: {
      type: String,
      enum: ["MANUAL", "META"],
      required: true,
      index: true,
    },

    // ✅ OPTIONAL: MANUAL leads me meta save nahi hogi
    meta: { type: LeadMetaSchema, default: undefined },

    // workflow
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "CONVERTED", "LOST"],
      default: "NEW",
      index: true,
    },

    // assignment
    assignedToIds: {
      type: [Schema.Types.ObjectId],
      ref: "CompanyUser",
      default: [],
      index: true,
    },

    // follow-up
    nextFollowUpAt: { type: Date, default: null },
    followUpType: {
      type: String,
      enum: ["CALL", "MEETING", "WHATSAPP", "EMAIL"],
      default: "CALL",
    },
    followUpNote: { type: String, default: "" },

    // system
    createdBy: { type: String, enum: ["SYSTEM", "USER"], required: true },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "CompanyUser",
      default: null,
    },

    activities: { type: [ActivitySchema], default: [] },
    lastActivityAt: { type: Date, default: null },

    // soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "CompanyUser",
      default: null,
    },
  },
  { timestamps: true }
);

/* ---------------- SAFE GUARD (IMPORTANT) ---------------- */
LeadSchema.pre("validate", async function () {
  // @ts-ignore
  if (!this.companyId) return;

  // ✅ generate lead id once
  // @ts-ignore
  if (!this.leadNo || !this.leadId7) {
    const c = await Counter.findOneAndUpdate(
      // @ts-ignore
      { companyId: this.companyId, key: "LEAD" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean();

    const next = Number(c?.seq || 1);

    // strict 7-digit numeric space
    if (next > 9999999) {
      throw new Error("LEAD_ID_LIMIT_REACHED");
    }

    // @ts-ignore
    this.leadNo = next;
    // @ts-ignore
    this.leadId7 = String(next).padStart(7, "0"); // "0000001"
  }

  // @ts-ignore
  if (this.source === "MANUAL") {
    // @ts-ignore
    this.meta = undefined;
    return;
  }

  // @ts-ignore
  const id = this.meta?.leadgenId;
  if (!id || String(id).trim() === "") {
    // @ts-ignore
    this.meta = undefined;
  }
});

/* ---------------- INDEXES ---------------- */
LeadSchema.index({ companyId: 1, createdAt: -1 });
LeadSchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 });

// ✅ per-company uniqueness for lead id
LeadSchema.index({ companyId: 1, leadNo: 1 }, { unique: true });
LeadSchema.index({ companyId: 1, leadId7: 1 }, { unique: true });

/**
 * ✅ IMPORTANT:
 * Unique only when meta.leadgenId exists AND is a string (partial index).
 * - MANUAL leads: meta missing => ignored
 * - META leads: leadgenId present => unique enforced
 */
LeadSchema.index(
  { companyId: 1, "meta.leadgenId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "meta.leadgenId": { $exists: true, $type: "string" },
    },
  }
);

/**
 * ✅ NEW: Prevent duplicates by phone/email (ignore empty strings)
 * - same companyId + same phone => blocked
 * - same companyId + same email => blocked
 */
LeadSchema.index(
  { companyId: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: "string", $ne: "" },
    },
  }
);

LeadSchema.index(
  { companyId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string", $ne: "" },
    },
  }
);

export type LeadDoc = InferSchemaType<typeof LeadSchema>;
export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);