import mongoose, { Schema, Types } from "mongoose";

const ContactNoteSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, required: true, index: true },
    contactId: { type: Types.ObjectId, required: true, index: true },
    heading: { type: String, trim: true, required: true },
    descriptionHtml: { type: String, default: "" }, // TinyMCE/Quill html
    isPrivate: { type: Boolean, default: false },
    documents: [
      {
        fileName: String,
        mimeType: String,
        url: String,
      },
    ],
    createdBy: { type: Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true },
);

ContactNoteSchema.index({ companyId: 1, contactId: 1, createdAt: -1 });

export default mongoose.models.ContactNote ||
  mongoose.model("ContactNote", ContactNoteSchema);