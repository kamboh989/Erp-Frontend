const mongoose = require("mongoose");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");

async function fixQuotations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/erp");

    const quotations = await Quotation.find({}).lean();
    console.log(`Found ${quotations.length} quotations`);

    for (const q of quotations) {
      if (!q.items || q.items.length === 0) {
        console.log(`Quotation ${q._id} has no items, skipping`);
        continue;
      }

      

      const updatedItems = [];
      for (const it of q.items) {
        if (!it.productId) continue;

        const prod = await Product.findById(it.productId).select("name sku").lean();
        if (!prod) continue;

        updatedItems.push({
          productId: it.productId,
          nameSnapshot: it.nameSnapshot || prod.name,
          skuSnapshot: it.skuSnapshot || prod.sku,
          qty: it.qty,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
        });
      }

      await Quotation.updateOne({ _id: q._id }, { items: updatedItems });
      console.log(`Updated quotation ${q._id}`);
    }

    console.log("Done");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

fixQuotations();