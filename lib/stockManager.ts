import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { Types } from "mongoose";

export interface StockUpdateParams {
  companyId: string;
  productId: string;
  locationId: string;
  quantity: number;
  type: "IN" | "OUT" | "TRANSFER_OUT" | "TRANSFER_IN" | "ADJUSTMENT" | "PURCHASE" | "SALE" | "RETURN";
  referenceType?: "STOCK_TRANSFER" | "PURCHASE_ORDER" | "SALE_ORDER" | "STOCK_ADJUSTMENT" | "PURCHASE_RETURN" | "SALE_RETURN";
  referenceId?: string;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
}

export async function updateProductStock(params: StockUpdateParams) {
  const {
    companyId,
    productId,
    locationId,
    quantity,
    type,
    referenceType,
    referenceId,
    referenceNo,
    notes,
    createdBy
  } = params;

  // Get current product
  const product = await Product.findOne({ 
    _id: productId, 
    companyId,
    manageStock: true 
  });
  
  if (!product) {
    throw new Error("Product not found or stock not managed");
  }

  // Find or create location stock entry
  let locationStock = product.locationStock.find(
    (ls: any) => ls.locationId.toString() === locationId
  );
  
  if (!locationStock) {
    locationStock = { locationId: new Types.ObjectId(locationId), stock: 0 };
    product.locationStock.push(locationStock);
  }

  const previousStock = locationStock.stock;
  let newStock: number;

  // Calculate new stock based on type
  switch (type) {
    case "IN":
    case "TRANSFER_IN":
    case "PURCHASE":
    case "RETURN":
      newStock = previousStock + Math.abs(quantity);
      break;
    case "OUT":
    case "TRANSFER_OUT":
    case "SALE":
      newStock = previousStock - Math.abs(quantity);
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Available: ${previousStock}, Required: ${Math.abs(quantity)}`);
      }
      break;
    case "ADJUSTMENT":
      newStock = quantity; // Direct set for adjustments
      break;
    default:
      throw new Error("Invalid stock movement type");
  }

  // Update location stock
  locationStock.stock = newStock;

  // Recalculate total stock
  product.currentStock = product.locationStock.reduce(
    (total: number, ls: any) => total + ls.stock, 
    0
  );

  // Save product
  await product.save();

  // Create stock movement record
  await StockMovement.create({
    companyId,
    productId,
    locationId,
    type,
    quantity: type.includes("OUT") || type === "SALE" ? -Math.abs(quantity) : Math.abs(quantity),
    previousStock,
    newStock,
    referenceType,
    referenceId: referenceId ? new Types.ObjectId(referenceId) : undefined,
    referenceNo,
    notes,
    createdBy: new Types.ObjectId(createdBy)
  });

  return {
    previousStock,
    newStock,
    totalStock: product.currentStock
  };
}

export async function getProductStockByLocation(companyId: string, productId: string, locationId?: string) {
  const product = await Product.findOne({ 
    _id: productId, 
    companyId 
  }).select("currentStock locationStock");

  if (!product) {
    return null;
  }

  if (locationId) {
    const locationStock = product.locationStock.find(
      (ls: any) => ls.locationId.toString() === locationId
    );
    return {
      totalStock: product.currentStock,
      locationStock: locationStock?.stock || 0
    };
  }

  return {
    totalStock: product.currentStock,
    locationStock: product.locationStock
  };
}

export async function validateStockAvailability(
  companyId: string, 
  productId: string, 
  locationId: string, 
  requiredQty: number
) {
  const stockInfo = await getProductStockByLocation(companyId, productId, locationId);
  
  if (!stockInfo) {
    throw new Error("Product not found");
  }

  if (stockInfo.locationStock < requiredQty) {
    throw new Error(`Insufficient stock. Available: ${stockInfo.locationStock}, Required: ${requiredQty}`);
  }

  return true;
}