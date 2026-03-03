import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProductSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    name: { type: String, required: true, trim: true },

    // SKU unique PER company
    sku: { type: String, required: true, trim: true, uppercase: true },

    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },

    manageStock: { type: Boolean, default: true },
    currentStock: { type: Number, default: 0, min: 0 },
    
    openingStock: { type: Number, default: 0, min: 0 },
    alertQty: { type: Number, default: 0, min: 0 },

    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ companyId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ companyId: 1, createdAt: -1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;
export default mongoose.models.Product || mongoose.model("Product", ProductSchema);