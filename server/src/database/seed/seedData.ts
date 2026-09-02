import bcrypt from 'bcryptjs';

export async function getSeedData() {
  const adminPasswordHash = await bcrypt.hash('3939', 10);
  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);
  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const accountantPasswordHash = await bcrypt.hash('accountant123', 10);

  const roles = [
    { id: 'role-super-admin', name: 'SUPER_ADMIN', description: 'Full system control & settings', isSystem: true },
    { id: 'role-owner', name: 'OWNER', description: 'Business owner with full store & financial access', isSystem: true },
    { id: 'role-manager', name: 'MANAGER', description: 'Store manager with inventory and discount approvals', isSystem: true },
    { id: 'role-accountant', name: 'ACCOUNTANT', description: 'Financial reports, expenses and closing audits', isSystem: true },
    { id: 'role-warehouse', name: 'WAREHOUSE', description: 'Stock receiving, transfers and adjustments', isSystem: true },
    { id: 'role-cashier', name: 'CASHIER', description: 'Front-desk POS sales and shift cashier', isSystem: true },
    { id: 'role-staff', name: 'STAFF', description: 'General floor staff and order takers', isSystem: true },
  ];

  const permissions = [
    { id: 'perm-pos-sell', code: 'POS_SELL', module: 'POS', description: 'Perform POS checkouts' },
    { id: 'perm-pos-discount', code: 'POS_DISCOUNT', module: 'POS', description: 'Apply manual discounts' },
    { id: 'perm-pos-refund', code: 'POS_REFUND', module: 'POS', description: 'Process customer refunds' },
    { id: 'perm-prod-manage', code: 'PROD_MANAGE', module: 'PRODUCTS', description: 'Create and edit products' },
    { id: 'perm-inv-manage', code: 'INV_MANAGE', module: 'INVENTORY', description: 'Manage stock and warehouses' },
    { id: 'perm-pur-manage', code: 'PUR_MANAGE', module: 'PURCHASE', description: 'Create and receive purchase orders' },
    { id: 'perm-acc-manage', code: 'ACC_MANAGE', module: 'ACCOUNTING', description: 'View and manage finances' },
    { id: 'perm-rep-view', code: 'REP_VIEW', module: 'REPORTS', description: 'View analytics and reports' },
    { id: 'perm-rep-export', code: 'REP_EXPORT', module: 'REPORTS', description: 'Export Excel/PDF reports' },
    { id: 'perm-sys-settings', code: 'SYS_SETTINGS', module: 'SETTINGS', description: 'Configure system & backup' },
    { id: 'perm-usr-manage', code: 'USR_MANAGE', module: 'USERS', description: 'Manage employee accounts' },
  ];

  const stores = [
    {
      id: 'store-flagship',
      name: '39POS Flagship Superstore & Bistro',
      code: 'ST-001',
      address: 'Lane Xang Avenue, Chanthabouly, Vientiane Capital, Laos',
      phone: '+856 21 213939',
      email: 'flagship@39pos.com',
      taxId: 'LA-TAX-99887766',
      currency: 'USD',
      receiptHeader: '39POS ENTERPRISE STORE\nWelcome! Multi-Currency Accepted\nWiFi: 39POS_Guest / Pass: pos2026',
      receiptFooter: 'Thank you for shopping with us!\nExchange/Return within 7 days with receipt.\nVisit www.39pos.com',
      logoUrl: 'https://images.unsplash.com/photo-1556742049-0a67e55722c0?w=200&auto=format&fit=crop&q=80'
    },
    {
      id: 'store-bangkok',
      name: '39POS Downtown Café & Retail Hub',
      code: 'ST-002',
      address: 'Sukhumvit Soi 39, Khlong Toei Nuea, Watthana, Bangkok 10110, Thailand',
      phone: '+66 2 393 9000',
      email: 'bangkok@39pos.com',
      taxId: 'TH-010555393911',
      currency: 'THB',
      receiptHeader: '39POS BANGKOK CAFÉ & BISTRO\nSpecialty Coffee & Gourmet Dining',
      receiptFooter: 'Thank You! Khop Khun Krub / Ka\nFollow us IG: @39pos.bkk',
      logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80'
    }
  ];

  const users = [
    {
      id: 'user-admin',
      username: 'Supper',
      email: 'supper@39pos.com',
      passwordHash: adminPasswordHash,
      pinCode: '3939',
      fullName: 'Supper',
      roleId: 'role-super-admin',
      storeId: 'store-flagship',
      language: 'en',
      currency: 'USD',
      theme: 'dark',
      phone: '+1 415 555 0199',
      address: 'San Francisco, CA',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isActive: true
    },
    {
      id: 'user-cashier-1',
      username: 'cashier1',
      email: 'cashier1@39pos.com',
      passwordHash: cashierPasswordHash,
      pinCode: '1111',
      fullName: 'Khamphanh Sengsavang',
      roleId: 'role-cashier',
      storeId: 'store-flagship',
      language: 'la',
      currency: 'LAK',
      theme: 'dark',
      phone: '+856 20 5558 3939',
      address: 'Vientiane, Laos',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      isActive: true
    },
    {
      id: 'user-manager-1',
      username: 'manager1',
      email: 'manager@39pos.com',
      passwordHash: managerPasswordHash,
      pinCode: '8888',
      fullName: 'Nattaporn Chaiyarat',
      roleId: 'role-manager',
      storeId: 'store-flagship',
      language: 'th',
      currency: 'THB',
      theme: 'dark',
      phone: '+66 89 777 8888',
      address: 'Bangkok, Thailand',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      isActive: true
    },
    {
      id: 'user-accountant-1',
      username: 'accountant1',
      email: 'accountant@39pos.com',
      passwordHash: accountantPasswordHash,
      pinCode: '5555',
      fullName: 'Chen Wei Ling',
      roleId: 'role-accountant',
      storeId: 'store-flagship',
      language: 'zh',
      currency: 'CNY',
      theme: 'dark',
      phone: '+86 21 6888 5555',
      address: 'Shanghai, China',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      isActive: true
    }
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', isBase: true, exchangeRate: 1.0, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
    { code: 'LAK', name: 'Lao Kip (ກີບ)', symbol: '₭', isBase: false, exchangeRate: 22000.0, decimalPlaces: 0, symbolPosition: 'after', isActive: true },
    { code: 'THB', name: 'Thai Baht (บาท)', symbol: '฿', isBase: false, exchangeRate: 36.5, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
    { code: 'EUR', name: 'Euro', symbol: '€', isBase: false, exchangeRate: 0.92, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
    { code: 'CNY', name: 'Chinese Yuan (人民币)', symbol: '¥', isBase: false, exchangeRate: 7.25, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
    { code: 'JPY', name: 'Japanese Yen (円)', symbol: '¥', isBase: false, exchangeRate: 155.0, decimalPlaces: 0, symbolPosition: 'before', isActive: true },
    { code: 'KRW', name: 'Korean Won (원)', symbol: '₩', isBase: false, exchangeRate: 1380.0, decimalPlaces: 0, symbolPosition: 'before', isActive: true },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBase: false, exchangeRate: 1.35, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', isBase: false, exchangeRate: 4.68, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
    { code: 'VND', name: 'Vietnamese Dong (đồng)', symbol: '₫', isBase: false, exchangeRate: 25400.0, decimalPlaces: 0, symbolPosition: 'after', isActive: true },
    { code: 'KHR', name: 'Cambodian Riel (រៀល)', symbol: '៛', isBase: false, exchangeRate: 4100.0, decimalPlaces: 0, symbolPosition: 'after', isActive: true },
  ];

  const categories = [
    { id: 'cat-bev', name: 'Beverages & Drinks', code: 'BEV', icon: 'Coffee' },
    { id: 'cat-food', name: 'Gourmet Food & Dishes', code: 'FOOD', icon: 'Utensils' },
    { id: 'cat-bakery', name: 'Bakery & Desserts', code: 'BAKE', icon: 'Cake' },
    { id: 'cat-grocery', name: 'Supermarket & Groceries', code: 'GROC', icon: 'ShoppingBag' },
    { id: 'cat-pharma', name: 'Pharmacy & Healthcare', code: 'PHAR', icon: 'HeartPulse' },
    { id: 'cat-elec', name: 'Electronics & Gadgets', code: 'ELEC', icon: 'Laptop' },
  ];

  const brands = [
    { id: 'brand-39', name: '39POS Signature Roast', logoUrl: '' },
    { id: 'brand-coke', name: 'Coca-Cola Co.', logoUrl: '' },
    { id: 'brand-nestle', name: 'Nestlé', logoUrl: '' },
    { id: 'brand-pfizer', name: 'Pfizer Healthcare', logoUrl: '' },
    { id: 'brand-apple', name: 'Apple Inc.', logoUrl: '' },
    { id: 'brand-farm', name: 'Organic Valley Farms', logoUrl: '' },
  ];

  const units = [
    { id: 'unit-pcs', name: 'Piece', symbol: 'pcs', conversionRate: 1.0 },
    { id: 'unit-kg', name: 'Kilogram', symbol: 'kg', conversionRate: 1.0 },
    { id: 'unit-cup', name: 'Cup', symbol: 'cup', conversionRate: 1.0 },
    { id: 'unit-btl', name: 'Bottle', symbol: 'btl', conversionRate: 1.0 },
    { id: 'unit-can', name: 'Can', symbol: 'can', conversionRate: 1.0 },
    { id: 'unit-bx', name: 'Box', symbol: 'box', conversionRate: 1.0 },
    { id: 'unit-plt', name: 'Plate', symbol: 'plt', conversionRate: 1.0 },
  ];

  const suppliers = [
    {
      id: 'sup-mega',
      name: 'Mega Distribution International',
      companyName: 'Mega Logistics Asia Ltd.',
      taxId: 'TAX-MEGA-8899',
      email: 'sales@megadistrib.com',
      phone: '+856 21 445566',
      address: 'Vientiane Logistics Park, Laos',
      creditLimit: 50000,
      balance: 1250
    },
    {
      id: 'sup-pharma',
      name: 'Global Med & Pharma Supply',
      companyName: 'Global Medicare Corp.',
      taxId: 'TAX-PHARM-7711',
      email: 'orders@globalmed.com',
      phone: '+66 2 888 9999',
      address: 'Pharma Park, Pathum Thani, Thailand',
      creditLimit: 100000,
      balance: 0
    },
    {
      id: 'sup-coffee',
      name: 'Bolaven Plateau Specialty Coffee Beans',
      companyName: 'Bolaven Coffee Estate Ltd.',
      taxId: 'TAX-COF-3322',
      email: 'beans@bolavencoffee.la',
      phone: '+856 31 223344',
      address: 'Pakxong, Champasak, Laos',
      creditLimit: 20000,
      balance: 450
    }
  ];

  const warehouses = [
    { id: 'wh-main', storeId: 'store-flagship', name: 'Central Warehouse & Cold Storage', code: 'WH-01', location: 'Zone A - Vientiane Hub', isDefault: true },
    { id: 'wh-retail', storeId: 'store-flagship', name: 'Front Store POS Shelf Storage', code: 'WH-02', location: 'Zone B - Ground Floor', isDefault: false },
    { id: 'wh-bkk', storeId: 'store-bangkok', name: 'Bangkok Kitchen & Store Storage', code: 'WH-03', location: 'Sukhumvit 39 Depot', isDefault: false },
  ];

  const products = [
    // 1. Café Beverage
    {
      id: 'prod-iced-latte',
      sku: 'BEV-LATTE-01',
      barcode: '8851959132014',
      name: 'Signature Iced Caramel Latte',
      description: 'Double espresso shot with creamy milk and house-made salted caramel syrup.',
      categoryId: 'cat-bev',
      brandId: 'brand-39',
      unitId: 'unit-cup',
      supplierId: 'sup-coffee',
      purchasePrice: 1.20,
      sellingPrice: 3.50,
      wholesalePrice: 3.00,
      minPrice: 2.80,
      maxDiscount: 20,
      taxRate: 7.0,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: true,
      stockLocation: 'Barista Station 1'
    },
    // 2. Restaurant Food
    {
      id: 'prod-wagyu-steak',
      sku: 'FOOD-STEAK-01',
      barcode: '8851959132021',
      name: 'Australian Wagyu Ribeye Steak (250g)',
      description: 'Charcoal grilled wagyu ribeye served with truffle mashed potatoes & red wine jus.',
      categoryId: 'cat-food',
      brandId: 'brand-farm',
      unitId: 'unit-plt',
      supplierId: 'sup-mega',
      purchasePrice: 12.00,
      sellingPrice: 28.00,
      wholesalePrice: 25.00,
      minPrice: 22.00,
      maxDiscount: 15,
      taxRate: 7.0,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: false,
      stockLocation: 'Main Kitchen Cold Room'
    },
    // 3. Bakery
    {
      id: 'prod-butter-croissant',
      sku: 'BAKE-CROIS-01',
      barcode: '8851959132038',
      name: 'French Artisanal Butter Croissant',
      description: 'Flaky and buttery layered golden pastry baked fresh every morning.',
      categoryId: 'cat-bakery',
      brandId: 'brand-39',
      unitId: 'unit-pcs',
      supplierId: 'sup-mega',
      purchasePrice: 0.80,
      sellingPrice: 2.20,
      wholesalePrice: 1.80,
      minPrice: 1.60,
      maxDiscount: 25,
      taxRate: 7.0,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: false,
      stockLocation: 'Bakery Display Showcase'
    },
    // 4. Supermarket Beverage
    {
      id: 'prod-coca-cola',
      sku: 'GROC-COKE-01',
      barcode: '8851959132045',
      name: 'Coca-Cola Original 330ml Can',
      description: 'Refreshing carbonated soft drink chilled can.',
      categoryId: 'cat-grocery',
      brandId: 'brand-coke',
      unitId: 'unit-can',
      supplierId: 'sup-mega',
      purchasePrice: 0.40,
      sellingPrice: 1.00,
      wholesalePrice: 0.80,
      minPrice: 0.70,
      maxDiscount: 10,
      taxRate: 7.0,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: false,
      stockLocation: 'Aisle 3 - Shelf A'
    },
    // 5. Pharmacy (with Batch & Expiry Date)
    {
      id: 'prod-paracetamol',
      sku: 'PHAR-PARA-01',
      barcode: '8851959132052',
      name: 'Paracetamol 500mg (Box of 100 Tablets)',
      description: 'Fast effective relief for fever, headache, body aches, and pain.',
      categoryId: 'cat-pharma',
      brandId: 'brand-pfizer',
      unitId: 'unit-bx',
      supplierId: 'sup-pharma',
      purchasePrice: 2.50,
      sellingPrice: 5.50,
      wholesalePrice: 4.80,
      minPrice: 4.50,
      maxDiscount: 10,
      taxRate: 0.0, // Tax-exempt medical product
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: false,
      stockLocation: 'Pharmacy Section B-4'
    },
    // 6. Pharmacy Antibiotic (Expiring Batch)
    {
      id: 'prod-amoxicillin',
      sku: 'PHAR-AMOX-01',
      barcode: '8851959132069',
      name: 'Amoxicillin 250mg Capsules (50s)',
      description: 'Prescription-grade antibiotic for bacterial infections.',
      categoryId: 'cat-pharma',
      brandId: 'brand-pfizer',
      unitId: 'unit-bx',
      supplierId: 'sup-pharma',
      purchasePrice: 4.00,
      sellingPrice: 9.00,
      wholesalePrice: 8.00,
      minPrice: 7.50,
      maxDiscount: 5,
      taxRate: 0.0,
      imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: false,
      stockLocation: 'Pharmacy Section Controlled Cabinet'
    },
    // 7. Electronics
    {
      id: 'prod-usbc-charger',
      sku: 'ELEC-CHG-65W',
      barcode: '8851959132076',
      name: 'GaN Ultra-Fast USB-C Charger 65W',
      description: 'Dual-port Type-C PD power adapter suitable for laptops, tablets, and smartphones.',
      categoryId: 'cat-elec',
      brandId: 'brand-apple',
      unitId: 'unit-pcs',
      supplierId: 'sup-mega',
      purchasePrice: 14.00,
      sellingPrice: 29.99,
      wholesalePrice: 24.00,
      minPrice: 22.00,
      maxDiscount: 15,
      taxRate: 7.0,
      imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80',
      isActive: true,
      trackInventory: true,
      hasVariants: true,
      stockLocation: 'Electronics Showcase A-1'
    }
  ];

  const productVariants = [
    {
      id: 'var-latte-regular',
      productId: 'prod-iced-latte',
      sku: 'BEV-LATTE-REG',
      barcode: '8851959132014-R',
      name: 'Regular (16 oz)',
      priceAdjustment: 0,
      costAdjustment: 0,
      attributesJson: JSON.stringify({ Size: '16oz', Ice: 'Standard' })
    },
    {
      id: 'var-latte-large',
      productId: 'prod-iced-latte',
      sku: 'BEV-LATTE-LRG',
      barcode: '8851959132014-L',
      name: 'Large (22 oz)',
      priceAdjustment: 0.75,
      costAdjustment: 0.20,
      attributesJson: JSON.stringify({ Size: '22oz', Ice: 'Standard' })
    },
    {
      id: 'var-chg-black',
      productId: 'prod-usbc-charger',
      sku: 'ELEC-CHG-65W-BLK',
      barcode: '8851959132076-B',
      name: 'Midnight Black',
      priceAdjustment: 0,
      costAdjustment: 0,
      attributesJson: JSON.stringify({ Color: 'Black' })
    },
    {
      id: 'var-chg-white',
      productId: 'prod-usbc-charger',
      sku: 'ELEC-CHG-65W-WHT',
      barcode: '8851959132076-W',
      name: 'Glacier White',
      priceAdjustment: 0,
      costAdjustment: 0,
      attributesJson: JSON.stringify({ Color: 'White' })
    }
  ];

  const inventory = [
    { id: 'inv-1', productId: 'prod-iced-latte', warehouseId: 'wh-main', quantity: 250, avgCost: 1.20, batchNumber: 'BATCH-2026-COF', expiryDate: '2026-12-31' },
    { id: 'inv-2', productId: 'prod-wagyu-steak', warehouseId: 'wh-main', quantity: 45, avgCost: 12.00, batchNumber: 'WAGYU-AU-88', expiryDate: '2026-09-30' },
    { id: 'inv-3', productId: 'prod-butter-croissant', warehouseId: 'wh-main', quantity: 60, avgCost: 0.80, batchNumber: 'BAKE-TODAY', expiryDate: '2026-08-20' },
    { id: 'inv-4', productId: 'prod-coca-cola', warehouseId: 'wh-main', quantity: 1200, avgCost: 0.40, batchNumber: 'COKE-2026-08', expiryDate: '2027-08-01' },
    // Pharmacy Batches with Expiry Dates
    { id: 'inv-5', productId: 'prod-paracetamol', warehouseId: 'wh-main', quantity: 180, avgCost: 2.50, batchNumber: 'PARA-2026-A', expiryDate: '2028-06-30' },
    { id: 'inv-6', productId: 'prod-amoxicillin', warehouseId: 'wh-main', quantity: 35, avgCost: 4.00, batchNumber: 'AMOX-2026-X', expiryDate: '2026-09-15' }, // Expiring soon
    { id: 'inv-7', productId: 'prod-usbc-charger', warehouseId: 'wh-main', quantity: 85, avgCost: 14.00, batchNumber: 'CHG-LOT-99', expiryDate: '' }
  ];

  const customers = [
    {
      id: 'cust-somchai',
      name: 'Somchai Prasert',
      phone: '+66 81 234 5678',
      email: 'somchai@gmail.com',
      memberCode: 'VIP-88001',
      points: 450,
      creditLimit: 2000,
      balance: 0,
      tier: 'GOLD',
      address: 'Bangkok, Thailand'
    },
    {
      id: 'cust-bounmy',
      name: 'Bounmy Vongphachanh',
      phone: '+856 20 5551 2345',
      email: 'bounmy.laos@yahoo.com',
      memberCode: 'VIP-88002',
      points: 1850,
      creditLimit: 5000,
      balance: 150,
      tier: 'PLATINUM',
      address: 'Vientiane, Laos'
    },
    {
      id: 'cust-alice',
      name: 'Alice Johnson',
      phone: '+1 415 555 2671',
      email: 'alice.j@corp.com',
      memberCode: 'MBR-10023',
      points: 80,
      creditLimit: 500,
      balance: 0,
      tier: 'BRONZE',
      address: 'California, USA'
    }
  ];

  const settings = [
    {
      id: 'set-gen',
      key: 'general_settings',
      category: 'GENERAL',
      valueJson: JSON.stringify({
        appName: '39POS Enterprise',
        defaultLanguage: 'en',
        defaultCurrency: 'USD',
        taxRateDefault: 7.0,
        enableSoundEffects: true,
        enableKitchenTickets: true,
        receiptPaperWidth: '80mm',
        barcodeFormat: 'EAN13',
        lowStockThreshold: 10,
        expiryAlertDays: 60
      })
    },
    {
      id: 'set-printer',
      key: 'printer_config',
      category: 'PRINTER',
      valueJson: JSON.stringify({
        receiptPrinterType: 'NETWORK_TCP', // NETWORK_TCP, WEB_USB, WEB_SERIAL, BROWSER_PRINT
        receiptPrinterIp: '192.168.1.200',
        receiptPrinterPort: 9100,
        kitchenPrinterIp: '192.168.1.201',
        kitchenPrinterPort: 9100,
        autoCutReceipt: true,
        openCashDrawerOnCash: true
      })
    },
    {
      id: 'set-storage',
      key: 'storage_config',
      category: 'STORAGE',
      valueJson: JSON.stringify({
        storageType: 'LOCAL', // LOCAL, NAS, S3, DROPBOX
        localDirectoryPath: 'D:\\39POS\\Data',
        nasSharePath: '\\\\192.168.1.100\\39pos-backup',
        s3Bucket: '39pos-cloud-enterprise-backups',
        autoBackupIntervalHours: 24,
        encryptionEnabled: true,
        compressionLevel: 'HIGH'
      })
    }
  ];

  return {
    roles,
    permissions,
    stores,
    users,
    currencies,
    categories,
    brands,
    units,
    suppliers,
    warehouses,
    products,
    productVariants,
    inventory,
    customers,
    settings
  };
}
