require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });

const mongoose = require("mongoose");

// Define schemas inline
const CustomerSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contactType: { type: String, enum: ["CUSTOMER", "SUPPLIER", "BOTH"] },
  totals: {
    totalSaleDue: { type: Number, default: 0 },
    totalSaleReturnDue: { type: Number, default: 0 },
  },
});

const SaleSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId },
  companyId: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String },
  dueAmount: { type: Number, default: 0 },
});

const SaleReturnSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId },
  companyId: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String },
  dueAmount: { type: Number, default: 0 },
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
const Sale = mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
const SaleReturn = mongoose.models.SaleReturn || mongoose.model("SaleReturn", SaleReturnSchema);

async function recalculateCustomerTotals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const customers = await Customer.find({ contactType: { $in: ["CUSTOMER", "BOTH"] } }).select("_id companyId");

    for (const customer of customers) {
      // Calculate totalSaleDue from FINAL sales
      const salesAgg = await Sale.aggregate([
        { $match: { customerId: customer._id, companyId: customer.companyId, status: "FINAL" } },
        { $group: { _id: null, totalDue: { $sum: "$dueAmount" } } }
      ]);
      const totalSaleDue = salesAgg[0]?.totalDue || 0;

      // Calculate totalSaleReturnDue from FINAL sale returns
      const returnsAgg = await SaleReturn.aggregate([
        { $match: { customerId: customer._id, companyId: customer.companyId, status: "FINAL" } },
        { $group: { _id: null, totalDue: { $sum: "$dueAmount" } } }
      ]);
      const totalSaleReturnDue = returnsAgg[0]?.totalDue || 0;

      await Customer.updateOne(
        { _id: customer._id },
        {
          $set: {
            "totals.totalSaleDue": totalSaleDue,
            "totals.totalSaleReturnDue": totalSaleReturnDue
          }
        }
      );

      console.log(`Updated customer ${customer._id}: saleDue=${totalSaleDue}, returnDue=${totalSaleReturnDue}`);
    }

    console.log("Recalculation complete");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

recalculateCustomerTotals();