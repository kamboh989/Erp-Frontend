import mongoose, { Schema, InferSchemaType } from "mongoose";

const CompanyUserSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: { type: String, required: true },

    name: { type: String, trim: true },
    phone: { type: String, trim: true },

    // ✅ FIX: role must always exist (market standard)
    // ✅ default STAFF to avoid permission edge cases
    role: {
      type: String,
      enum: ["ADMIN", "STAFF"],
      required: true,
      default: "STAFF",
      index: true,
    },

    allowedModules: { type: [String], default: [] },

    // ✅ per-user settings permission
    allowedSettings: { type: [String], default: [] },

    isOwner: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },

    // ✅ if super-admin deactivates, user cannot be activated until unlock
    lockedBySuper: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ unique per company
CompanyUserSchema.index({ companyId: 1, email: 1 }, { unique: true });

// ✅ useful list/sort indexes
CompanyUserSchema.index({ companyId: 1, createdAt: -1 });
CompanyUserSchema.index({ companyId: 1, isOwner: 1, role: 1, isActive: 1 });

export type CompanyUserDoc = InferSchemaType<typeof CompanyUserSchema>;
export default mongoose.models.CompanyUser ||
  mongoose.model("CompanyUser", CompanyUserSchema);