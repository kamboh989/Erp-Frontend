import mongoose, { Schema, InferSchemaType } from "mongoose";

const StockMovementSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    
    type: { 
      type: String, 
      enum: ["IN", "OUT", "TRANSFER_OUT", "TRANSFER_IN", "ADJUSTMENT", "PURCHASE", "SALE", "RETURN"], 
      required: true,
      index: true 
    },
    
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    
    referenceType: { 
      type: String, 
      enum: ["STOCK_TRANSFER", "PURCHASE_ORDER", "SALE_ORDER", "STOCK_ADJUSTMENT", "PURCHASE_RETURN", "SALE_RETURN"],
      index: true 
    },
    referenceId: { type: Schema.Types.ObjectId, index: true },
    referenceNo: { type: String, trim: true },
    
    notes: { type: String, trim: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ companyId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ companyId: 1, locationId: 1, createdAt: -1 });
StockMovementSchema.index({ companyId: 1, referenceType: 1, referenceId: 1 });

export default mongoose.models.StockMovement || mongoose.model("StockMovement", StockMovementSchema);
export type StockMovementDoc = InferSchemaType<typeof StockMovementSchema>;