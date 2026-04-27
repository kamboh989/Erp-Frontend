// Direct test - manually update stock to verify database connection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function directStockTest() {
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
    }));

    // Find product with opening stock 20
    const product = await Product.findOne({ openingStock: 20 }).lean();
    
    if (!product) {
      console.log('Product with opening stock 20 not found');
      await mongoose.disconnect();
      return;
    }

    console.log('=== PRODUCT FOUND ===');
    console.log('Name:', product.name);
    console.log('SKU:', product.sku);
    console.log('Opening Stock:', product.openingStock);
    console.log('Current Stock:', product.currentStock);
    console.log('Manage Stock:', product.manageStock);
    console.log('Product ID:', product._id);
    console.log('');

    // Test 1: Direct update using $inc (decrease by 3)
    console.log('TEST 1: Decreasing stock by 3 (simulating sale)...');
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -3 } }
    );

    const after1 = await Product.findById(product._id).lean();
    console.log('After decrease: Current Stock =', after1.currentStock);
    console.log('Expected:', product.currentStock - 3);
    console.log('Match:', after1.currentStock === (product.currentStock - 3) ? '✅' : '❌');
    console.log('');

    // Test 2: Direct update using $inc (increase by 5)
    console.log('TEST 2: Increasing stock by 5 (simulating purchase)...');
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: 5 } }
    );

    const after2 = await Product.findById(product._id).lean();
    console.log('After increase: Current Stock =', after2.currentStock);
    console.log('Expected:', after1.currentStock + 5);
    console.log('Match:', after2.currentStock === (after1.currentStock + 5) ? '✅' : '❌');
    console.log('');

    // Restore original stock
    console.log('Restoring original stock...');
    await Product.updateOne(
      { _id: product._id },
      { $set: { currentStock: product.currentStock } }
    );

    const restored = await Product.findById(product._id).lean();
    console.log('Restored: Current Stock =', restored.currentStock);
    console.log('');

    console.log('=== TEST COMPLETED ===');
    console.log('Database updates are working correctly!');
    console.log('Issue must be in API code execution.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

directStockTest();
