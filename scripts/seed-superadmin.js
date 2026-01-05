require("dotenv").config({ path: ".env.local" });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// ✅ define schema here so no TS import needed
const SuperAdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SuperAdmin =
  mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.SEED_SUPER_EMAIL;
  const pass = process.env.SEED_SUPER_PASS;

  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!email || !pass) throw new Error("Missing SEED_SUPER_EMAIL / SEED_SUPER_PASS");

  await mongoose.connect(uri);

  const exists = await SuperAdmin.findOne({ email: email.toLowerCase() }).lean();
  if (exists) {
    console.log("✅ Super admin already exists:", email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(pass, 10);

  await SuperAdmin.create({
    email: email.toLowerCase(),
    passwordHash,
    isActive: true,
  });

  console.log("✅ Super admin created:", email);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
