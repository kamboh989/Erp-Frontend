// Test script to create a FINAL sale and check stock update
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testCreateSale() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Get first active product
    const Product = mongoose.model('Product', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      name: String,
      sku: String,
      currentStock: Number,
      manageStock: Boolean,
      sellingPrice: Number,
      isActive: Boolean,
    }));

    const product = await Product.findOne({ isActive: true, manageStock: true }).lean();
    if (!product) {
      console.log('No product found with manageStock=true');
      await mongoose.disconnect();
      return;
    }

    console.log('=== BEFORE SALE ===');
    console.log(`Product: ${product.name} (${product.sku})`);
    console.log(`Current Stock: ${product.currentStock || 0}\n`);

    // Get first customer
    const Customer = mongoose.model('Customer', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      name: String,
      businessName: String,
      contactType: String,
      status: String,
    }));

    const customer = await Customer.findOne({ 
      companyId: product.companyId,
      contactType: { $in: ['CUSTOMER', 'BOTH'] },
      status: 'ACTIVE'
    }).lean();

    if (!customer) {
      console.log('No customer found');
      await mongoose.disconnect();
      return;
    }

    // Get first location
    const Location = mongoose.model('Location', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      name: String,
    }));

    const location = await Location.findOne({ companyId: product.companyId }).lean();
    if (!location) {
      console.log('No location found');
      await mongoose.disconnect();
      return;
    }

    // Create FINAL sale
    const Sale = mongoose.model('Sale', new mongoose.Schema({
      companyId: mongoose.Schema.Types.ObjectId,
      customerId: mongoose.Schema.Types.ObjectId,
      customerNameSnapshot: String,
      locationId: mongoose.Schema.Types.ObjectId,
      saleDate: Date,
      status: String,
      referenceNo: String,
      notes: String,
      shippingCharges: Number,
      subtotal: Number,
      grandTotal: Number,
      paidAmount: Number,
      dueAmount: Number,
      paymentMethod: String,
      paymentStatus: String,
      payments: Array,
      items: [{
        productId: mongoose.Schema.Types.ObjectId,
        nameSnapshot: String,
        skuSnapshot: String,
        qty: Number,
        unitPrice: Number,
        lineTotal: Number,
      }],
      finalizedAt: Date,
    }, { timestamps: true }));

    const saleQty = 5;
    const unitPrice = product.sellingPrice || 100;
    const lineTotal = saleQty * unitPrice;

    console.log('Creating FINAL sale...');
    console.log(`Sale Quantity: ${saleQty}`);
    console.log(`Expected New Stock: ${(product.currentStock || 0) - saleQty}\n`);

    const sale = await Sale.create({
      companyId: product.companyId,
      customerId: customer._id,
      customerNameSnapshot: customer.businessName || customer.name,
      locationId: location._id,
      saleDate: new Date(),
      status: 'FINAL',
      referenceNo: `TEST-SALE-${Date.now()}`,
      notes: 'Test sale from script',
      shippingCharges: 0,
      subtotal: lineTotal,
      grandTotal: lineTotal,
      paidAmount: 0,
      dueAmount: lineTotal,
      paymentMethod: '',
      paymentStatus: 'UNPAID',
      payments: [],
      items: [{
        productId: product._id,
        nameSnapshot: product.name,
        skuSnapshot: product.sku,
        qty: saleQty,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
      }],
      finalizedAt: new Date(),
    });

    console.log('Sale created successfully!');
    console.log(`Sale ID: ${sale._id}\n`);

    // Now manually update stock (simulating what the API should do)
    console.log('Updating product stock...');
    await Product.updateOne(
      { _id: product._id, companyId: product.companyId },
      { $inc: { currentStock: -saleQty } }
    );

    // Check updated stock
    const updatedProduct = await Product.findById(product._id).lean();
    console.log('=== AFTER SALE ===');
    console.log(`Product: ${updatedProduct.name} (${updatedProduct.sku})`);
    console.log(`Current Stock: ${updatedProduct.currentStock || 0}`);
    console.log(`Stock Updated: ${updatedProduct.currentStock === (product.currentStock - saleQty) ? '✅ YES' : '❌ NO'}\n`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCreateSale();
