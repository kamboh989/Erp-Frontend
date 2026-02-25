import mongoose, { Schema, Types } from "mongoose";

const ContactPaymentSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, required: true, index: true },
    contactId: { type: Types.ObjectId, required: true, index: true }, // Mongo _id of Contact
    paidOn: { type: Date, required: true },
    paymentMethod: { type: String, trim: true, required: true }, // Cash/Bank/etc
    amount: { type: Number, required: true, min: 0 },
    referenceNo: { type: String, trim: true },
    paymentFor: { type: String, trim: true }, // optional: invoice/payment type
    note: { type: String, trim: true },
    attachment: {
      fileName: { type: String },
      mimeType: { type: String },
      url: { type: String }, // later (S3/local)
    },
    createdBy: { type: Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true },
);

ContactPaymentSchema.index({ companyId: 1, contactId: 1, paidOn: -1 });

export default mongoose.models.ContactPayment ||
  mongoose.model("ContactPayment", ContactPaymentSchema);