import mongoose, { Schema, InferSchemaType } from "mongoose";
import type { Permission, UserRole, AppModule } from "@/types/rbac";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },

    role: { type: String, required: true }, // UserRole

    // SUPER_ADMIN will have companyId = null
    companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },

    // Fine-grained perms (optional)
    permissions: { type: [String], default: [] }, // Permission[]

    // Allowed modules for this user (subset of company enabledModules)
    allowedModules: { type: [String], default: [] }, // AppModule[]

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique per company: same email allowed in different companies? usually NO.
// Professional SaaS: globally unique email is common.
UserSchema.index({ email: 1 }, { unique: true });

// Multi-tenant query speed:
UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ companyId: 1, createdAt: -1 });

export type UserDoc = InferSchemaType<typeof UserSchema>;
export default mongoose.models.User || mongoose.model("User", UserSchema);
