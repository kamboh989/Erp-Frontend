import mongoose, { Schema, Types } from "mongoose";

export type ContactType = "SUPPLIER";
export type PartyType = "INDIVIDUAL" | "BUSINESS";
export type ContactStatus = "ACTIVE" | "INACTIVE";

const AddressSchema = new Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zip: { type: String, trim: true },
  },
  { _id: false }
);

const SupplierPersonSchema = new Schema(
  {
    prefix: { type: String, trim: true },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    salesCommissionPct: { type: Number, min: 0, max: 100, default: 0 },
    // allowLogin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: true, timestamps: true }
);

const MoreInfoSchema = new Schema(
  {
    taxNumber: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 }, // Rs
    payTerm: { type: String, trim: true }, // e.g. "30 Days" / "Months"
    billingAddress: { type: AddressSchema, default: {} },
    shippingAddress: { type: AddressSchema, default: {} },
  },
  { _id: false }
);

const SupplierSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, required: true, index: true },

    contactId: { type: String, required: true, index: true }, // e.g. S000123

    contactType: {
      type: String,
      enum: ["SUPPLIER"],
      required: true,
      default: "SUPPLIER",
      index: true,
    },

    partyType: {
      type: String,
      enum: ["INDIVIDUAL", "BUSINESS"],
      required: true,
    },

    businessName: { type: String, trim: true },
    name: { type: String, trim: true },

    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true, required: true },

    dateOfBirth: { type: Date, default: null },

    assignedTo: [{ type: Types.ObjectId, ref: "CompanyUser", index: true }],

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    // ✅ Supplier totals are PURCHASE based
    totals: {
      totalPurchaseDue: { type: Number, default: 0 },
      totalPurchaseReturnDue: { type: Number, default: 0 },
      openingBalanceDue: { type: Number, default: 0 },
      advanceBalance: { type: Number, default: 0 },

      // (optional backward compatibility if old docs exist)
      totalSaleDue: { type: Number, default: 0 },
      totalSaleReturnDue: { type: Number, default: 0 },
    },

    moreInfo: { type: MoreInfoSchema, default: {} },
    contactPersons: { type: [SupplierPersonSchema], default: [] },

    createdBy: { type: Types.ObjectId, ref: "CompanyUser", required: true },
    updatedBy: { type: Types.ObjectId, ref: "CompanyUser", default: null },
  },
  { timestamps: true }
);

// ✅ Unique per company
SupplierSchema.index({ companyId: 1, contactId: 1 }, { unique: true });

// ✅ prevent duplicate MOBILE within same company for SUPPLIER
SupplierSchema.index({ companyId: 1, contactType: 1, mobile: 1 }, { unique: true });

// ✅ prevent duplicate EMAIL within same company for SUPPLIER (email optional)
SupplierSchema.index({ companyId: 1, contactType: 1, email: 1 }, { unique: true, sparse: true });

// Search index
SupplierSchema.index({
  businessName: "text",
  name: "text",
  email: "text",
  mobile: "text",
  contactId: "text",
});

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
export default Supplier;