// Test script to verify stock updates
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testStockUpdate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    const Product = mongoose.model('Product', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      name: String,
      sku: String,
      currentStock: Number,
      openingStock: Number,
      manageStock: Boolean,
      isActive: Boolean,
    }));

    const Sale = mongoose.model('Sale', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      status: String,
      items: [{
        productId: mongoose.Schema.Types.ObjectId,
        qty: Number,
      }],
      createdAt: Date,
    }));

    const Purchase = mongoose.model('Purchase', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      status: String,
      items: [{
        productId: mongoose.Schema.Types.ObjectId,
        qty: Number,
      }],
      createdAt: Date,
    }));

    // Get latest products
    console.log('=== PRODUCTS (Latest 5) ===');
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    products.forEach(p => {
      console.log(`Product: ${p.name} (${p.sku})`);
      console.log(`  Opening Stock: ${p.openingStock || 0}`);
      console.log(`  Current Stock: ${p.currentStock || 0}`);
      console.log(`  Manage Stock: ${p.manageStock}`);
      console.log(`  ID: ${p._id}\n`);
    });

    // Get latest FINAL sales
    console.log('\n=== FINAL SALES (Latest 3) ===');
    const sales = await Sale.find({ status: 'FINAL' })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    
    for (const sale of sales) {
      console.log(`Sale Date: ${sale.createdAt}`);
      console.log(`Items:`);
      for (const item of sale.items) {
        const prod = await Product.findById(item.productId).lean();
        console.log(`  - ${prod?.name || 'Unknown'} (Qty: ${item.qty}, Current Stock: ${prod?.currentStock || 0})`);
      }
      console.log('');
    }

    // Get latest FINAL purchases
    console.log('\n=== FINAL PURCHASES (Latest 3) ===');
    const purchases = await Purchase.find({ status: 'FINAL' })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    
    for (const purchase of purchases) {
      console.log(`Purchase Date: ${purchase.createdAt}`);
      console.log(`Items:`);
      for (const item of purchase.items) {
        const prod = await Product.findById(item.productId).lean();
        console.log(`  - ${prod?.name || 'Unknown'} (Qty: ${item.qty}, Current Stock: ${prod?.currentStock || 0})`);
      }
      console.log('');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testStockUpdate();
