require("dotenv").config({ path: ".env.local" });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
const email = process.env.SEED_SUPER_EMAIL;
const pass = process.env.SEED_SUPER_PASS;

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
if (!email || !pass) throw new Error("Missing SEED_SUPER_EMAIL / SEED_SUPER_PASS");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    permissions: { type: [String], default: [] },
    allowedModules: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const exists = await User.findOne({ email: email.toLowerCase() }).lean();
  if (exists) {
    console.log("✅ Super admin already exists:", email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(pass, 10);

  await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name: "Super Admin",
    role: "SUPER_ADMIN",
    companyId: null,
    permissions: ["ANY"],
    allowedModules: [],
    isActive: true,
  });

  console.log("✅ Super admin created:", email);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
