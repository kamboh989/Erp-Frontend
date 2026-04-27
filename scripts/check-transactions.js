// Check all sales and purchases for this product
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const productId = '69ef15bad146df03c9ad7244'; // oil product

    const Sale = mongoose.model('Sale', new mongoose.Schema({
      status: String,
      items: Array,
      createdAt: Date,
      referenceNo: String,
    }));

    const Purchase = mongoose.model('Purchase', new mongoose.Schema({
      status: String,
      items: Array,
      createdAt: Date,
      referenceNo: String,
    }));

    console.log('=== CHECKING SALES ===\n');
    const sales = await Sale.find({ 'items.productId': productId }).sort({ createdAt: -1 }).lean();
    
    if (sales.length === 0) {
      console.log('No sales found for this product\n');
    } else {
      sales.forEach((sale, i) => {
        const item = sale.items.find(it => String(it.productId) === productId);
        console.log(`Sale ${i + 1}:`);
        console.log('  Reference:', sale.referenceNo);
        console.log('  Status:', sale.status);
        console.log('  Quantity:', item?.qty || 0);
        console.log('  Date:', sale.createdAt);
        console.log('');
      });
    }

    console.log('=== CHECKING PURCHASES ===\n');
    const purchases = await Purchase.find({ 'items.productId': productId }).sort({ createdAt: -1 }).lean();
    
    if (purchases.length === 0) {
      console.log('No purchases found for this product\n');
    } else {
      purchases.forEach((purchase, i) => {
        const item = purchase.items.find(it => String(it.productId) === productId);
        console.log(`Purchase ${i + 1}:`);
        console.log('  Reference:', purchase.referenceNo);
        console.log('  Status:', purchase.status);
        console.log('  Quantity:', item?.qty || 0);
        console.log('  Date:', purchase.createdAt);
        console.log('');
      });
    }

    // Calculate expected stock
    const finalSales = sales.filter(s => s.status === 'FINAL');
    const finalPurchases = purchases.filter(p => p.status === 'FINAL');
    
    const totalSold = finalSales.reduce((sum, s) => {
      const item = s.items.find(it => String(it.productId) === productId);
      return sum + (item?.qty || 0);
    }, 0);
    
    const totalPurchased = finalPurchases.reduce((sum, p) => {
      const item = p.items.find(it => String(it.productId) === productId);
      return sum + (item?.qty || 0);
    }, 0);

    console.log('=== SUMMARY ===');
    console.log('Opening Stock: 20');
    console.log('Total FINAL Sales:', totalSold);
    console.log('Total FINAL Purchases:', totalPurchased);
    console.log('Expected Current Stock:', 20 + totalPurchased - totalSold);
    console.log('Actual Current Stock: 15');
    console.log('');
    console.log('Difference:', (20 + totalPurchased - totalSold) - 15);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTransactions();
