import Customer from "@/models/Customer";
import Supplier from "@/models/Supplier";
import { Types } from "mongoose";

export interface CustomerTotalUpdate {
  companyId: string;
  customerId: string;
  saleAmount?: number;
  saleReturnAmount?: number;
  paymentAmount?: number;
  type: "SALE" | "SALE_RETURN" | "PAYMENT" | "OPENING_BALANCE";
  operation: "ADD" | "SUBTRACT";
}

export interface SupplierTotalUpdate {
  companyId: string;
  supplierId: string;
  purchaseAmount?: number;
  purchaseReturnAmount?: number;
  paymentAmount?: number;
  type: "PURCHASE" | "PURCHASE_RETURN" | "PAYMENT" | "OPENING_BALANCE";
  operation: "ADD" | "SUBTRACT";
}

export async function updateCustomerTotals(params: CustomerTotalUpdate) {
  const { companyId, customerId, type, operation } = params;
  
  const customer = await Customer.findOne({
    _id: customerId,
    companyId: new Types.ObjectId(companyId)
  });
  
  if (!customer) {
    throw new Error("Customer not found");
  }

  const multiplier = operation === "ADD" ? 1 : -1;

  switch (type) {
    case "SALE":
      if (params.saleAmount) {
        customer.totals.totalSaleDue += (params.saleAmount * multiplier);
      }
      break;
    case "SALE_RETURN":
      if (params.saleReturnAmount) {
        customer.totals.totalSaleReturnDue += (params.saleReturnAmount * multiplier);
        // Sale return reduces the sale due
        customer.totals.totalSaleDue -= (params.saleReturnAmount * multiplier);
      }
      break;
    case "PAYMENT":
      if (params.paymentAmount) {
        if (params.paymentAmount > 0) {
          // Payment reduces sale due or increases advance
          const remainingDue = customer.totals.totalSaleDue - customer.totals.totalSaleReturnDue;
          if (remainingDue > 0) {
            const paymentToApply = Math.min(params.paymentAmount, remainingDue);
            customer.totals.totalSaleDue -= paymentToApply;
            const advanceAmount = params.paymentAmount - paymentToApply;
            if (advanceAmount > 0) {
              customer.totals.advanceBalance += advanceAmount;
            }
          } else {
            customer.totals.advanceBalance += params.paymentAmount;
          }
        }
      }
      break;
    case "OPENING_BALANCE":
      // Set opening balance
      customer.totals.openingBalanceDue = params.saleAmount || 0;
      break;
  }

  await customer.save();
  return customer.totals;
}

export async function updateSupplierTotals(params: SupplierTotalUpdate) {
  const { companyId, supplierId, type, operation } = params;
  
  const supplier = await Supplier.findOne({
    _id: supplierId,
    companyId: new Types.ObjectId(companyId)
  });
  
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const multiplier = operation === "ADD" ? 1 : -1;

  switch (type) {
    case "PURCHASE":
      if (params.purchaseAmount) {
        supplier.totals.totalPurchaseDue += (params.purchaseAmount * multiplier);
      }
      break;
    case "PURCHASE_RETURN":
      if (params.purchaseReturnAmount) {
        supplier.totals.totalPurchaseReturnDue += (params.purchaseReturnAmount * multiplier);
        // Purchase return reduces the purchase due
        supplier.totals.totalPurchaseDue -= (params.purchaseReturnAmount * multiplier);
      }
      break;
    case "PAYMENT":
      if (params.paymentAmount) {
        if (params.paymentAmount > 0) {
          // Payment reduces purchase due or increases advance
          const remainingDue = supplier.totals.totalPurchaseDue - supplier.totals.totalPurchaseReturnDue;
          if (remainingDue > 0) {
            const paymentToApply = Math.min(params.paymentAmount, remainingDue);
            supplier.totals.totalPurchaseDue -= paymentToApply;
            const advanceAmount = params.paymentAmount - paymentToApply;
            if (advanceAmount > 0) {
              supplier.totals.advanceBalance += advanceAmount;
            }
          } else {
            supplier.totals.advanceBalance += params.paymentAmount;
          }
        }
      }
      break;
    case "OPENING_BALANCE":
      // Set opening balance
      supplier.totals.openingBalanceDue = params.purchaseAmount || 0;
      break;
  }

  await supplier.save();
  return supplier.totals;
}

export async function getCustomerBalance(companyId: string, customerId: string) {
  const customer = await Customer.findOne({
    _id: customerId,
    companyId: new Types.ObjectId(companyId)
  }).select("totals");

  if (!customer) {
    return null;
  }

  const totalDue = customer.totals.totalSaleDue + customer.totals.openingBalanceDue;
  const totalReturns = customer.totals.totalSaleReturnDue;
  const advance = customer.totals.advanceBalance;
  
  const netDue = totalDue - totalReturns - advance;

  return {
    totalSaleDue: customer.totals.totalSaleDue,
    totalSaleReturnDue: customer.totals.totalSaleReturnDue,
    openingBalanceDue: customer.totals.openingBalanceDue,
    advanceBalance: customer.totals.advanceBalance,
    netDue: Math.max(0, netDue),
    netAdvance: netDue < 0 ? Math.abs(netDue) : 0
  };
}

export async function getSupplierBalance(companyId: string, supplierId: string) {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    companyId: new Types.ObjectId(companyId)
  }).select("totals");

  if (!supplier) {
    return null;
  }

  const totalDue = supplier.totals.totalPurchaseDue + supplier.totals.openingBalanceDue;
  const totalReturns = supplier.totals.totalPurchaseReturnDue;
  const advance = supplier.totals.advanceBalance;
  
  const netDue = totalDue - totalReturns - advance;

  return {
    totalPurchaseDue: supplier.totals.totalPurchaseDue,
    totalPurchaseReturnDue: supplier.totals.totalPurchaseReturnDue,
    openingBalanceDue: supplier.totals.openingBalanceDue,
    advanceBalance: supplier.totals.advanceBalance,
    netDue: Math.max(0, netDue),
    netAdvance: netDue < 0 ? Math.abs(netDue) : 0
  };
}