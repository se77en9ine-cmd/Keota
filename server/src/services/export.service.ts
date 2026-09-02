import ExcelJS from 'exceljs';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import { products, sales, saleItems, customers, inventory, expenses, income } from '../database/schema';
import { CurrencyService } from './currency.service';
import { ProductService } from './product.service';
import { InventoryService } from './inventory.service';

interface ExportOptions {
  currency?: string;
  lang?: string;
  ids?: string[];
  startDate?: string;
  endDate?: string;
  channel?: string;
  codFilter?: string;
  warehouseId?: string;
  lossType?: string;
  poOutflowMode?: 'ACTUAL_PAID' | 'TOTAL_COMMITTED';
}

const EXPORT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    sheetProducts: 'Products Catalog',
    productName: 'Product Name',
    sku: 'SKU',
    barcode: 'Barcode',
    category: 'Category',
    posMode: 'POS Mode',
    purchaseCost: 'Purchase Cost ({CUR})',
    sellingPrice: 'Selling Price ({CUR})',
    grossMargin: 'Margin (%)',
    unitProfit: 'Gross Profit ({CUR})',
    currentStock: 'Current Stock',
    taxRate: 'Tax Rate (%)',
    active: 'Active',
    yes: 'YES',
    no: 'NO',

    // Sales
    sheetSales: 'Sales Transactions',
    invoiceNo: 'Invoice No',
    refNo: 'Ref #',
    customer: 'Customer',
    phone: 'Phone',
    posChannel: 'POS Channel',
    items: 'Items / Menu',
    qty: 'QTY',
    itemsOrdered: 'Items / Menu Ordered',
    dateTime: 'Date & Time',
    subtotal: 'Subtotal ({CUR})',
    discount: 'Discount ({CUR})',
    tax: 'Tax ({CUR})',
    grandTotal: 'Grand Total ({CUR})',
    paymentStatus: 'Payment Status',
    isCod: 'COD Order',

    // COD
    sheetCod: 'COD Intelligence & Deliveries',
    courier: 'Courier Carrier',
    trackingNo: 'Tracking Number',
    deliveryAddress: 'Delivery Address',
    codCollectable: 'COD Collectable ({CUR})',
    deliveryStage: 'Delivery Stage',
    settlementStatus: 'Settlement Status',
    freightLoss: 'Freight / Refusal Loss ({CUR})',

    // Inventory
    sheetInventory: 'Inventory Valuation',
    batchNumber: 'Batch Number',
    expiryDate: 'Expiry Date',
    quantity: 'Quantity',
    unitCost: 'Average Cost ({CUR})',
    totalValue: 'Total Value ({CUR})',
    stockStatus: 'Stock Status',
    statusNormal: 'Normal',
    statusLowStock: 'Low Stock',
    statusExpiringSoon: 'Expiring Soon',
    statusExpired: 'Expired',

    // P&L
    sheetPnl: 'Income Statement (P&L)',
    accountDesc: 'Account / Line Item Description',
    flow: 'Flow',
    type: 'Type',
    amount: 'Amount ({CUR})',
    shareOfRev: '% of Revenue',
    tier1Header: '1. OPERATING REVENUE & INFLOWS',
    posOmnichannelSales: 'POS & Omnichannel Sales Revenue',
    totalOperatingRevenue: 'TOTAL OPERATING REVENUE',
    tier2Header: '2. DIRECT COSTS & FREIGHT DEDUCTIONS',
    cogs: 'Cost of Goods Sold (Unit Costs from POs)',
    sellerPaidDelivery: 'Store Free Shipping (Seller-Paid Delivery)',
    codFreightLosses: 'COD Delivery Refusal Freight Losses',
    grossProfit: 'GROSS PROFIT',
    margin: 'MARGIN',
    tier3Header: '3. OPERATING EXPENSES (OPEX)',
    noRecordedExpenses: 'No general overhead or store expenses recorded in this period',
    totalOpex: 'TOTAL OPERATING EXPENSES',
    netProfit: 'NET OPERATING PROFIT (EBITDA)',
    netMargin: 'NET MARGIN',
    inflowBadge: '+ Inflow',
    costBadge: '- Cost',
    freeShipBadge: '- Free Ship',
    lossBadge: '- Loss',
    opexBadge: '- OPEX',

    // Loss
    sheetLoss: 'Loss & Shrinkage Report',
    warehouse: 'Warehouse',
    lossReason: 'Loss Reason / Type',
    qtyLost: 'Qty Lost',
    totalCostLoss: 'Total Cost Loss ({CUR})',
    totalRetailLoss: 'Retail Value Lost ({CUR})',
    recordedBy: 'Recorded By',
    notes: 'Notes / Reason Detail',
    totalSummary: 'TOTAL SUMMARY',
  },
  la: {
    sheetProducts: 'ລາຍການສິນຄ້າ',
    productName: 'ຊື່ສິນຄ້າ (Product Name)',
    sku: 'ລະຫັດສິນຄ້າ (SKU)',
    barcode: 'ບາໂຄດ (Barcode)',
    category: 'ໝວດໝູ່ສິນຄ້າ',
    posMode: 'ໂໝດຂາຍ POS',
    purchaseCost: 'ຕົ້ນທຶນ ({CUR})',
    sellingPrice: 'ລາຄາຂາຍ ({CUR})',
    grossMargin: 'ອັດຕາກຳໄລ (%)',
    unitProfit: 'ກຳໄລຕໍ່ໜ່ວຍ ({CUR})',
    currentStock: 'ຈຳນວນໃນສາງ',
    taxRate: 'ອັດຕາພາສີ (%)',
    active: 'ສະຖານະເປີດໃຊ້',
    yes: 'ເປີດໃຊ້ງານ',
    no: 'ປິດໃຊ້ງານ',

    // Sales
    sheetSales: 'ລາຍການຂາຍ',
    invoiceNo: 'ເລກທີບິນ',
    refNo: 'ລະຫັດອ້າງອີງ',
    customer: 'ລູກຄ້າ',
    phone: 'ເບີໂທ',
    posChannel: 'ຊ່ອງທາງຂາຍ',
    items: 'ລາຍການສິນຄ້າ / ເມນູ',
    qty: 'ຈຳນວນ',
    itemsOrdered: 'ລາຍການສິນຄ້າ / ເມນູທີ່ສັ່ງ (Items Ordered)',
    dateTime: 'ວັນທີ & ເວລາ',
    subtotal: 'ມູນຄ່າລວມ ({CUR})',
    discount: 'ສ່ວນຫຼຸດ ({CUR})',
    tax: 'ພາສີ ({CUR})',
    grandTotal: 'ຍອດລວມທັງໝົດ ({CUR})',
    paymentStatus: 'ສະຖານະຊຳລະ',
    isCod: 'ອໍເດີ COD',

    // COD
    sheetCod: 'ລາຍງານສົ່ງເຄື່ອງເກັບເງິນປາຍທາງ (COD)',
    courier: 'ບໍລິສັດຂົນສົ່ງ',
    trackingNo: 'ເລກພັດສະດຸ',
    deliveryAddress: 'ທີ່ຢູ່ຈັດສົ່ງ',
    codCollectable: 'ຍອດເກັບເງິນປາຍທາງ ({CUR})',
    deliveryStage: 'ສະຖານະຈັດສົ່ງ',
    settlementStatus: 'ສະຖານະຊຳລະເງິນ',
    freightLoss: 'ຄ່າຂົນສົ່ງສູນເສຍ ({CUR})',

    // Inventory
    sheetInventory: 'ມູນຄ່າສາງສິນຄ້າ (Inventory Valuation)',
    batchNumber: 'ເລກຊຸດຜະລິດ',
    expiryDate: 'ວັນໝົດອາຍຸ',
    quantity: 'ຈຳນວນ',
    unitCost: 'ຕົ້ນທຶນສະເລ່ຍ ({CUR})',
    totalValue: 'ມູນຄ່າລວມ ({CUR})',
    stockStatus: 'ສະຖານະສາງສິນຄ້າ',
    statusNormal: 'ປົກກະຕິ',
    statusLowStock: 'ສິນຄ້າໃກ້ໝົດ',
    statusExpiringSoon: 'ໃກ້ໝົດອາຍຸ',
    statusExpired: 'ໝົດອາຍຸແລ້ວ',

    // P&L
    sheetPnl: 'ໃບລາຍງານກຳໄລ-ຂາດທຶນ (P&L)',
    accountDesc: 'ໝວດບັນຊີ / ລາຍລະອຽດລາຍການ',
    flow: 'ກະແສເງິນ',
    type: 'ປະເພດ',
    amount: 'ຈຳນວນເງິນ ({CUR})',
    shareOfRev: '% ສັດສ່ວນລາຍໄດ້',
    tier1Header: '1. ລາຍຮັບຈາກການດຳເນີນງານ & ກະແສເງິນເຂົ້າ',
    posOmnichannelSales: 'ລາຍຮັບຈາກການຂາຍໜ້າຮ້ານ POS & ຊ່ອງທາງອອນລາຍ',
    totalOperatingRevenue: 'ຍອດລວມລາຍຮັບຈາກການດຳເນີນງານທັງໝົດ',
    tier2Header: '2. ຕົ້ນທຶນທາງກົງ & ຄ່າເສຍຫາຍຄ່າສົ່ງປາຍທາງ',
    cogs: 'ຕົ້ນທຶນຂາຍສິນຄ້າ (COGS - ຕົ້ນທຶນຈາກໃບສັ່ງຊື້ PO)',
    sellerPaidDelivery: 'ຄ່າສົ່ງຟຣີຈາກຮ້ານ (Store Free Shipping)',
    codFreightLosses: 'ຄ່າຂົນສົ່ງສູນເສຍຈາກການປະຕິເສດຮັບ COD',
    grossProfit: 'ກຳໄລຂັ້ນຕົ້ນ',
    margin: 'MARGIN',
    tier3Header: '3. ລາຍຈ່າຍໃນການດຳເນີນງານ (OPEX)',
    noRecordedExpenses: 'ບໍ່ມີລາຍຈ່າຍທົ່ວໄປຖືກບັນທຶກໃນໄລຍະນີ້',
    totalOpex: 'ຍອດລວມລາຍຈ່າຍດຳເນີນງານທັງໝົດ',
    netProfit: 'ກຳໄລສຸດທິຈາກການດຳເນີນງານ (EBITDA)',
    netMargin: 'NET MARGIN',
    inflowBadge: '+ Inflow',
    costBadge: '- Cost',
    freeShipBadge: '- Free Ship',
    lossBadge: '- Loss',
    opexBadge: '- OPEX',

    // Loss
    sheetLoss: 'ລາຍງານສິນຄ້າເສຍຫາຍ & ສູນເສຍ',
    warehouse: 'ສາງສິນຄ້າ',
    lossReason: 'ສາເຫດ / ປະເພດການສູນເສຍ',
    qtyLost: 'ຈຳນວນສູນເສຍ',
    totalCostLoss: 'ມູນຄ່າຕົ້ນທຶນສູນເສຍ ({CUR})',
    totalRetailLoss: 'ມູນຄ່າຂາຍສູນເສຍ ({CUR})',
    recordedBy: 'ຜູ້ບັນທຶກ',
    notes: 'ໝາຍເຫດ',
    totalSummary: 'ສະຫຼຸບລວມທັງໝົດ',
  },
  th: {
    sheetProducts: 'แคตตาล็อกสินค้า',
    productName: 'ชื่อสินค้า (Product Name)',
    sku: 'รหัสสินค้า (SKU)',
    barcode: 'บาร์โค้ด (Barcode)',
    category: 'หมวดหมู่สินค้า',
    posMode: 'โหมดขาย POS',
    purchaseCost: 'ต้นทุน ({CUR})',
    sellingPrice: 'ราคาขาย ({CUR})',
    grossMargin: 'อัตรากำไร (%)',
    unitProfit: 'กำไรต่อหน่วย ({CUR})',
    currentStock: 'สต็อกคงเหลือ',
    taxRate: 'อัตราภาษี (%)',
    active: 'สถานะการใช้งาน',
    yes: 'เปิดใช้งาน',
    no: 'ปิดใช้งาน',

    // Sales
    sheetSales: 'รายงานการขาย',
    invoiceNo: 'เลขที่ใบเสร็จ',
    refNo: 'รหัสอ้างอิง',
    customer: 'ลูกค้า',
    phone: 'เบอร์โทร',
    posChannel: 'ช่องทางการขาย',
    items: 'รายการสินค้า / เมนู',
    qty: 'จำนวน',
    itemsOrdered: 'รายการสินค้า / เมนูที่สั่ง (Items Ordered)',
    dateTime: 'วันที่ & เวลา',
    subtotal: 'ยอดรวมย่อย ({CUR})',
    discount: 'ส่วนลด ({CUR})',
    tax: 'ภาษี ({CUR})',
    grandTotal: 'ยอดรวมสุทธิ ({CUR})',
    paymentStatus: 'สถานะชำระเงิน',
    isCod: 'ออเดอร์ COD',

    // COD
    sheetCod: 'รายงานเก็บเงินปลายทาง (COD)',
    courier: 'บริษัทขนส่ง',
    trackingNo: 'เลขพัสดุ',
    deliveryAddress: 'ที่อยู่จัดส่ง',
    codCollectable: 'ยอดเก็บเงินปลายทาง ({CUR})',
    deliveryStage: 'สถานะการจัดส่ง',
    settlementStatus: 'สถานะการตัดยอด',
    freightLoss: 'ค่าขนส่งเสียหาย ({CUR})',

    // Inventory
    sheetInventory: 'มูลค่าสต็อกสินค้า (Inventory Valuation)',
    batchNumber: 'หมายเลขแบทช์',
    expiryDate: 'วันหมดอายุ',
    quantity: 'จำนวน',
    unitCost: 'ต้นทุนเฉลี่ย ({CUR})',
    totalValue: 'มูลค่ารวม ({CUR})',
    stockStatus: 'สถานะสต็อก',
    statusNormal: 'ปกติ',
    statusLowStock: 'สต็อกเหลือน้อย',
    statusExpiringSoon: 'ใกล้หมดอายุ',
    statusExpired: 'หมดอายุแล้ว',

    // P&L
    sheetPnl: 'งบกำไรขาดทุน (P&L)',
    accountDesc: 'หมวดบัญชี / รายละเอียดรายการ',
    flow: 'กระแสเงิน',
    type: 'ประเภท',
    amount: 'จำนวนเงิน ({CUR})',
    shareOfRev: '% สัดส่วนรายได้',
    tier1Header: '1. รายได้จากการดำเนินงาน & กระแสเงินเข้า',
    posOmnichannelSales: 'รายได้จากการขายหน้าร้าน POS & ช่องทางออนไลน์',
    totalOperatingRevenue: 'ยอดรวมรายได้จากการดำเนินงานทั้งหมด',
    tier2Header: '2. ต้นทุนทางตรง & ค่าเสียหายค่าส่งปลายทาง',
    cogs: 'ต้นทุนขายสินค้า (COGS - ต้นทุนจากใบสั่งซื้อ PO)',
    sellerPaidDelivery: 'ค่าส่งฟรีจากร้าน (Store Free Shipping)',
    codFreightLosses: 'ค่าขนส่งเสียหายจากการปฏิเสธรับ COD',
    grossProfit: 'กำไรขั้นต้น',
    margin: 'MARGIN',
    tier3Header: '3. ค่าใช้จ่ายในการดำเนินงาน (OPEX)',
    noRecordedExpenses: 'ไม่มีค่าใช้จ่ายทั่วไปที่บันทึกในช่วงเวลานี้',
    totalOpex: 'ยอดรวมค่าใช้จ่ายดำเนินงานทั้งหมด',
    netProfit: 'กำไรสุทธิจากการดำเนินงาน (EBITDA)',
    netMargin: 'NET MARGIN',
    inflowBadge: '+ Inflow',
    costBadge: '- Cost',
    freeShipBadge: '- Free Ship',
    lossBadge: '- Loss',
    opexBadge: '- OPEX',

    // Loss
    sheetLoss: 'รายงานสินค้าเสียหาย & สูญหาย',
    warehouse: 'คลังสินค้า',
    lossReason: 'สาเหตุ / ประเภทความสูญเสีย',
    qtyLost: 'จำนวนที่สูญเสีย',
    totalCostLoss: 'มูลค่าต้นทุนสูญเสีย ({CUR})',
    totalRetailLoss: 'มูลค่าราคาขายสูญเสีย ({CUR})',
    recordedBy: 'ผู้บันทึก',
    notes: 'หมายเหตุ',
    totalSummary: 'สรุปรวมทั้งหมด',
  },
  zh: {
    sheetProducts: '商品目录',
    productName: '商品名称',
    sku: '商品编码 (SKU)',
    barcode: '条形码 (Barcode)',
    category: '商品分类',
    posMode: '经营模式',
    purchaseCost: '采购成本 ({CUR})',
    sellingPrice: '销售价格 ({CUR})',
    grossMargin: '毛利率 (%)',
    unitProfit: '单位毛利 ({CUR})',
    currentStock: '当前库存',
    taxRate: '税率 (%)',
    active: '启用状态',
    yes: '是',
    no: '否',

    // Sales
    sheetSales: '销售明细报表',
    invoiceNo: '发票单号',
    refNo: '参考单号',
    customer: '客户',
    phone: '联系电话',
    posChannel: '销售渠道',
    items: '商品 / 菜品',
    qty: '数量',
    itemsOrdered: '已购商品 / 菜品明细',
    dateTime: '交易时间',
    subtotal: '小计金额 ({CUR})',
    discount: '折扣金额 ({CUR})',
    tax: '税额 ({CUR})',
    grandTotal: '总计金额 ({CUR})',
    paymentStatus: '支付状态',
    isCod: '货到付款订单',

    // COD
    sheetCod: '货到付款 (COD) 配送明细',
    courier: '物流快递公司',
    trackingNo: '运单号',
    deliveryAddress: '配送地址',
    codCollectable: '代收货款 ({CUR})',
    deliveryStage: '配送进度',
    settlementStatus: '结算状态',
    freightLoss: '运费损失 ({CUR})',

    // Inventory
    sheetInventory: '库存估值报表',
    batchNumber: '批次号',
    expiryDate: '有效期至',
    quantity: '库存数量',
    unitCost: '平均成本 ({CUR})',
    totalValue: '库存总值 ({CUR})',
    stockStatus: '库存状态',
    statusNormal: '正常',
    statusLowStock: '库存偏低',
    statusExpiringSoon: '临期预警',
    statusExpired: '已过期',

    // P&L
    sheetPnl: '损益表 (P&L)',
    accountDesc: '科目 / 摘要明细',
    flow: '资金流向',
    type: '类型',
    amount: '金额 ({CUR})',
    shareOfRev: '占营收比例 (%)',
    tier1Header: '1. 营业收入与现金流入',
    posOmnichannelSales: 'POS及全渠道销售收入',
    totalOperatingRevenue: '营业总收入',
    tier2Header: '2. 直接成本与物流运费扣除',
    cogs: '商品销售成本 (COGS - 采购成本)',
    sellerPaidDelivery: '商家包邮运费 (Store Free Shipping)',
    codFreightLosses: 'COD拒收运费损失',
    grossProfit: '毛利润',
    margin: 'MARGIN',
    tier3Header: '3. 营业费用 (OPEX)',
    noRecordedExpenses: '该期间无其他营业支出记录',
    totalOpex: '营业总费用',
    netProfit: '净营业利润 (EBITDA)',
    netMargin: 'NET MARGIN',
    inflowBadge: '+ Inflow',
    costBadge: '- Cost',
    freeShipBadge: '- Free Ship',
    lossBadge: '- Loss',
    opexBadge: '- OPEX',

    // Loss
    sheetLoss: '损耗与报废报表',
    warehouse: '存放仓库',
    lossReason: '损耗原因 / 类型',
    qtyLost: '损耗数量',
    totalCostLoss: '成本损失总额 ({CUR})',
    totalRetailLoss: '零售价值损失 ({CUR})',
    recordedBy: '记录人',
    notes: '详细备注',
    totalSummary: '统计汇总',
  },
  jp: {
    sheetProducts: '商品カタログ',
    productName: '商品名 (Product Name)',
    sku: '商品コード (SKU)',
    barcode: 'バーコード (Barcode)',
    category: 'カテゴリー',
    posMode: 'POSモード',
    purchaseCost: '仕入原価 ({CUR})',
    sellingPrice: '販売価格 ({CUR})',
    grossMargin: '粗利率 (%)',
    unitProfit: '単位粗利益 ({CUR})',
    currentStock: '現在庫数',
    taxRate: '消費税率 (%)',
    active: '有効状態',
    yes: '有効',
    no: '無効',

    // Sales
    sheetSales: '売上取引明細',
    invoiceNo: '伝票番号',
    refNo: '参照番号',
    customer: '顧客名',
    phone: '電話番号',
    posChannel: '販売チャネル',
    items: '注文商品 / メニュー',
    qty: '数量',
    itemsOrdered: '注文商品 / メニュー明細',
    dateTime: '日時',
    subtotal: '小計 ({CUR})',
    discount: '値引 ({CUR})',
    tax: '税額 ({CUR})',
    grandTotal: '総支払額 ({CUR})',
    paymentStatus: '支払ステータス',
    isCod: '代引注文',

    // COD
    sheetCod: '代金引換 (COD) 配送管理',
    courier: '配送業者',
    trackingNo: '追跡番号',
    deliveryAddress: '配送先住所',
    codCollectable: '代引回収金額 ({CUR})',
    deliveryStage: '配送ステージ',
    settlementStatus: '精算ステータス',
    freightLoss: '運賃損失 ({CUR})',

    // Inventory
    sheetInventory: '在庫評価額レポート',
    batchNumber: 'ロット番号',
    expiryDate: '有効期限',
    quantity: '在庫数',
    unitCost: '平均原価 ({CUR})',
    totalValue: '在庫総額 ({CUR})',
    stockStatus: '在庫状態',
    statusNormal: '正常',
    statusLowStock: '残少',
    statusExpiringSoon: '期限間近',
    statusExpired: '期限切れ',

    // P&L
    sheetPnl: '損益計算書 (P&L)',
    accountDesc: '勘定科目 / 明細',
    flow: '資金フロー',
    type: '区分',
    amount: '金額 ({CUR})',
    shareOfRev: '売上比率 (%)',
    tier1Header: '1. 営業収益・キャッシュインフロー',
    posOmnichannelSales: 'POSおよびオムニチャネル売上',
    totalOperatingRevenue: '総営業収益',
    tier2Header: '2. 直接原価および配送費用控除',
    cogs: '売上原価 (COGS - 発注仕入原価)',
    sellerPaidDelivery: '店舗負担配送料 (Store Free Shipping)',
    codFreightLosses: 'COD受取拒否配送損失',
    grossProfit: '売上総利益 (粗利益)',
    margin: 'MARGIN',
    tier3Header: '3. 営業費用 (OPEX)',
    noRecordedExpenses: '該当期間に一般経費の記録はありません',
    totalOpex: '総営業費用',
    netProfit: '営業利益 (EBITDA)',
    netMargin: 'NET MARGIN',
    inflowBadge: '+ Inflow',
    costBadge: '- Cost',
    freeShipBadge: '- Free Ship',
    lossBadge: '- Loss',
    opexBadge: '- OPEX',

    // Loss
    sheetLoss: '廃棄・損耗レポート',
    warehouse: '倉庫',
    lossReason: '損耗理由 / 区分',
    qtyLost: '損耗数量',
    totalCostLoss: '原価損失総額 ({CUR})',
    totalRetailLoss: '売価損失総額 ({CUR})',
    recordedBy: '記録者',
    notes: '詳細備考',
    totalSummary: '総合計',
  },
};

EXPORT_TRANSLATIONS.ja = EXPORT_TRANSLATIONS.jp;

function getDictionary(lang?: string): Record<string, string> {
  const norm = (lang || 'en').toLowerCase().split('-')[0];
  return EXPORT_TRANSLATIONS[norm] || EXPORT_TRANSLATIONS['en'];
}

async function getCurrencyHelper(targetCurrency?: string) {
  const allCurrencies = await CurrencyService.getCurrencies(true);
  const targetCode = (targetCurrency || 'USD').toUpperCase().trim();
  const matched = allCurrencies.find((c) => c.code === targetCode) || {
    code: 'USD',
    symbol: '$',
    exchangeRate: 1.0,
    decimalPlaces: 2,
  };

  const rate = matched.exchangeRate || 1.0;
  const curLabel = `${matched.symbol} ${matched.code}`;

  const convert = (usdAmount: number | null | undefined): number => {
    if (usdAmount === null || usdAmount === undefined || isNaN(usdAmount)) return 0;
    const val = usdAmount * rate;
    return matched.decimalPlaces === 0 ? Math.round(val) : Number(val.toFixed(matched.decimalPlaces || 2));
  };

  return {
    curCode: matched.code,
    curSymbol: matched.symbol,
    curLabel,
    rate,
    decimalPlaces: matched.decimalPlaces || 2,
    convert,
  };
}

export class ExportService {
  public static async generateProductsExcel(options?: ExportOptions): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curLabel, convert } = await getCurrencyHelper(options?.currency);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet(dict.sheetProducts || 'Products Catalog');

    sheet.columns = [
      { header: dict.productName || 'Product Name', key: 'name', width: 32 },
      { header: dict.sku || 'SKU', key: 'sku', width: 18 },
      { header: dict.barcode || 'Barcode', key: 'barcode', width: 20 },
      { header: dict.category || 'Category', key: 'category', width: 22 },
      { header: dict.batchNumber || 'Batch Number', key: 'batchNumber', width: 18 },
      { header: dict.expiryDate || 'Expiry Date', key: 'expiryDate', width: 16 },
      { header: dict.posMode || 'POS Mode', key: 'posMode', width: 18 },
      { header: (dict.purchaseCost || 'Purchase Cost ({CUR})').replace('{CUR}', curLabel), key: 'purchasePrice', width: 22 },
      { header: (dict.sellingPrice || 'Selling Price ({CUR})').replace('{CUR}', curLabel), key: 'sellingPrice', width: 22 },
      { header: dict.grossMargin || 'Margin (%)', key: 'margin', width: 16 },
      { header: (dict.unitProfit || 'Gross Profit ({CUR})').replace('{CUR}', curLabel), key: 'profit', width: 22 },
      { header: dict.currentStock || 'Current Stock', key: 'stockQuantity', width: 16 },
      { header: dict.taxRate || 'Tax Rate (%)', key: 'taxRate', width: 14 },
      { header: dict.active || 'Active', key: 'isActive', width: 14 },
    ];

    // Header styling
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' }, // 39POS green
    };

    const all = await ProductService.getProducts();
    const productList = options?.ids && options.ids.length > 0
      ? all.filter((p) => options.ids!.includes(p.id))
      : all;
    for (const p of productList) {
      const cost = convert(p.purchasePrice);
      const price = convert(p.sellingPrice);
      const profit = price - cost;
      const margin = p.sellingPrice > 0 ? `${(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100).toFixed(1)}%` : '0.0%';

      let modeLabel = p.posMode || 'ALL';
      if (modeLabel === 'ALL') modeLabel = 'All Modes';
      else if (modeLabel === 'RETAIL_MINIMART') modeLabel = 'Retail';
      else if (modeLabel === 'RESTAURANT_CAFE') modeLabel = 'Resto/Cafe';
      else if (modeLabel === 'ONLINE_HUB') modeLabel = 'Online Hub';

      sheet.addRow({
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.categoryName || 'Uncategorized',
        batchNumber: p.batchNumber || '—',
        expiryDate: p.expiryDate || '—',
        posMode: modeLabel,
        purchasePrice: cost,
        sellingPrice: price,
        margin,
        profit,
        stockQuantity: p.stockQuantity ?? 0,
        taxRate: p.taxRate,
        isActive: p.isActive ? (dict.yes || 'YES') : (dict.no || 'NO'),
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  public static async generateSalesReportExcel(options?: ExportOptions): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curLabel, convert } = await getCurrencyHelper(options?.currency);

    const fontNameMap: Record<string, string> = {
      la: 'Noto Sans Lao',
      th: 'Noto Sans Thai',
      jp: 'Noto Serif JP',
      ja: 'Noto Serif JP',
      zh: 'Noto Serif SC',
      en: 'Arial Narrow',
    };
    const norm = (lang || 'en').toLowerCase().split('-')[0];
    const defaultFontName = fontNameMap[norm] || 'Arial Narrow';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet(dict.sheetSales || 'Sales Transactions', {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: dict.invoiceNo || 'Invoice No', key: 'invoiceNo', width: 22 },
      { header: dict.refNo || 'Ref #', key: 'externalOrderId', width: 16 },
      { header: dict.posChannel || 'POS Channel', key: 'channel', width: 20 },
      { header: dict.items || dict.itemsOrdered || 'Items / Menu', key: 'items', width: 34 },
      { header: dict.qty || dict.quantity || 'QTY', key: 'qty', width: 12 },
      { header: dict.customer || 'Customer', key: 'customer', width: 22 },
      { header: dict.phone || 'Phone', key: 'phone', width: 18 },
      { header: dict.paymentStatus || 'Payment Status', key: 'status', width: 16 },
      { header: dict.isCod || 'COD Order', key: 'isCod', width: 14 },
      { header: dict.dateTime || 'Date & Time', key: 'createdAt', width: 24 },
      { header: (dict.subtotal || 'Subtotal ({CUR})').replace('{CUR}', curLabel), key: 'subtotal', width: 18 },
      { header: (dict.discount || 'Discount ({CUR})').replace('{CUR}', curLabel), key: 'discount', width: 16 },
      { header: (dict.tax || 'Tax ({CUR})').replace('{CUR}', curLabel), key: 'tax', width: 16 },
      { header: (dict.grandTotal || 'Grand Total ({CUR})').replace('{CUR}', curLabel), key: 'total', width: 20 },
    ];

    sheet.getRow(1).font = { name: defaultFontName, bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }, // Blue
    };

    const all = await db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        externalOrderId: sales.externalOrderId,
        channel: sales.channel,
        orderType: sales.orderType,
        tableNo: sales.tableNo,
        customerName: customers.name,
        customerSurname: customers.surname,
        customerPhone: customers.phone,
        deliveryContact: sales.deliveryContact,
        createdAt: sales.createdAt,
        subtotal: sales.subtotal,
        discountAmount: sales.discountAmount,
        taxAmount: sales.taxAmount,
        totalAmount: sales.totalAmount,
        paymentStatus: sales.paymentStatus,
        isCod: sales.isCod,
        itemsSummary: sql<string>`COALESCE((SELECT GROUP_CONCAT(sale_items.name || ' x' || CAST(sale_items.quantity AS INT), ', ') FROM sale_items WHERE sale_items.sale_id = ${sales.id}), '')`,
        itemNames: sql<string>`COALESCE((SELECT GROUP_CONCAT(sale_items.name, ', ') FROM sale_items WHERE sale_items.sale_id = ${sales.id}), '')`,
        itemsCount: sql<number>`COALESCE((SELECT SUM(sale_items.quantity) FROM sale_items WHERE sale_items.sale_id = ${sales.id}), 0)`,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(sql`${sales.createdAt} DESC`);

    const fSales = all.filter((s) => {
      if (options?.startDate || options?.endDate) {
        const d = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (options?.startDate && d < options.startDate) return false;
        if (options?.endDate && d > options.endDate) return false;
      }
      if (options?.channel && options.channel !== 'ALL' && s.channel !== options.channel) return false;
      if (options?.codFilter === 'COD_ONLY' && !s.isCod) return false;
      if (options?.codFilter === 'PREPAID_ONLY' && s.isCod) return false;
      return true;
    });

    for (const s of fSales) {
      const customerDisp = s.customerName
        ? `${s.customerName} ${s.customerSurname || ''}`.trim()
        : s.deliveryContact || 'Guest';
      const phoneDisp = s.customerPhone || (s.deliveryContact && /[\d+]/.test(s.deliveryContact) ? s.deliveryContact : '—');

      let channelDisplay = s.channel || 'POS';
      if (s.channel === 'POS_RC' || ((s.channel === 'POS' || !s.channel) && (s.orderType === 'DINE_IN' || Boolean(s.tableNo)))) {
        channelDisplay = 'In-Store POS-RC';
      } else if (s.channel === 'POS_MR' || ((s.channel === 'POS' || !s.channel) && s.orderType !== 'DINE_IN' && !s.tableNo)) {
        channelDisplay = 'In-Store POS-MR';
      } else if (s.channel === 'GRAB_FOOD' || s.channel === 'GF') {
        channelDisplay = 'GrabFood';
      } else if (s.channel === 'FOODPANDA' || s.channel === 'FP') {
        channelDisplay = 'Foodpanda';
      } else if (s.channel === 'SHOPEE' || s.channel === 'SP') {
        channelDisplay = 'Shopee';
      } else if (s.channel === 'TIKTOK_SHOP' || s.channel === 'TT') {
        channelDisplay = 'TikTok Shop';
      }

      const row = sheet.addRow({
        invoiceNo: s.invoiceNo,
        externalOrderId: s.externalOrderId || '—',
        channel: channelDisplay,
        items: s.itemNames || (s.itemsSummary ? s.itemsSummary.replace(/\s*x\d+/g, '') : '—'),
        qty: s.itemsCount || 1,
        customer: customerDisp,
        phone: phoneDisp,
        status: s.paymentStatus,
        isCod: s.isCod ? (dict.yes || 'YES') : (dict.no || 'NO'),
        createdAt: s.createdAt,
        subtotal: convert(s.subtotal),
        discount: convert(s.discountAmount),
        tax: convert(s.taxAmount),
        total: convert(s.totalAmount),
      });

      row.font = { name: defaultFontName, size: 10 };
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  public static async generateCodReportExcel(options?: ExportOptions): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curLabel, convert } = await getCurrencyHelper(options?.currency);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet(dict.sheetCod || 'COD Deliveries');

    sheet.columns = [
      { header: dict.invoiceNo || 'Invoice No', key: 'invoiceNo', width: 22 },
      { header: dict.refNo || 'Ref #', key: 'externalOrderId', width: 16 },
      { header: dict.courier || 'Courier Carrier', key: 'courierName', width: 20 },
      { header: dict.trackingNo || 'Tracking Number', key: 'courierTrackingNo', width: 22 },
      { header: 'Delivery Fee ({CUR})'.replace('{CUR}', curLabel), key: 'deliveryFee', width: 18 },
      { header: 'Fee Payer', key: 'deliveryFeePayer', width: 24 },
      { header: 'Store Freight Cost ({CUR})'.replace('{CUR}', curLabel), key: 'storeFreightCost', width: 24 },
      { header: dict.customer || 'Recipient', key: 'customer', width: 24 },
      { header: dict.phone || 'Phone', key: 'phone', width: 18 },
      { header: dict.deliveryAddress || 'Delivery Address', key: 'deliveryAddress', width: 32 },
      { header: (dict.codCollectable || 'COD Collectable ({CUR})').replace('{CUR}', curLabel), key: 'collectable', width: 22 },
      { header: dict.deliveryStage || 'Delivery Stage', key: 'pipelineStage', width: 20 },
      { header: dict.settlementStatus || 'Settlement Status', key: 'settlementStatus', width: 20 },
      { header: (dict.freightLoss || 'Freight Loss ({CUR})').replace('{CUR}', curLabel), key: 'deliveryFeeLoss', width: 22 },
      { header: dict.dateTime || 'Date & Time', key: 'createdAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' }, // Amber / Delivery gold
    };

    const all = await db
      .select({
        invoiceNo: sales.invoiceNo,
        externalOrderId: sales.externalOrderId,
        courierName: sales.courierName,
        courierTrackingNo: sales.courierTrackingNo,
        deliveryFee: sales.deliveryFee,
        deliveryFeePayer: sales.deliveryFeePayer,
        customerName: customers.name,
        customerSurname: customers.surname,
        customerPhone: customers.phone,
        deliveryContact: sales.deliveryContact,
        deliveryAddress: sales.deliveryAddress,
        totalAmount: sales.totalAmount,
        codCollectedAmount: sales.codCollectedAmount,
        deliveryFeeLoss: sales.deliveryFeeLoss,
        pipelineStage: sales.pipelineStage,
        fulfillmentStatus: sales.fulfillmentStatus,
        paymentStatus: sales.paymentStatus,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.isCod, true));

    const fCod = all.filter((s) => {
      if (options?.startDate || options?.endDate) {
        const d = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (options?.startDate && d < options.startDate) return false;
        if (options?.endDate && d > options.endDate) return false;
      }
      return true;
    });

    for (const s of fCod) {
      const recipientDisp = s.customerName
        ? `${s.customerName} ${s.customerSurname || ''}`.trim()
        : s.deliveryContact || 'Guest Recipient';
      const phoneDisp = s.customerPhone || (s.deliveryContact && /[\d+]/.test(s.deliveryContact) ? s.deliveryContact : '—');

      let settleStatus = 'PENDING_IN_TRANSIT';
      if (s.paymentStatus === 'PAID' || s.fulfillmentStatus === 'DELIVERED') {
        settleStatus = 'SETTLED_PAID';
      } else if (s.fulfillmentStatus === 'CANCELLED' || s.pipelineStage === 'REJECTED') {
        settleStatus = 'REFUSED_LOSS';
      }

      const isSellerPaid = s.deliveryFeePayer === 'SELLER_PAYS';
      const payerLabel = isSellerPaid ? 'STORE_PAYS (OPEX Expense)' : 'CUSTOMER_PAYS (Direct)';
      const storeExpenseVal = isSellerPaid ? convert(s.deliveryFee || 0) : 0;

      sheet.addRow({
        invoiceNo: s.invoiceNo,
        externalOrderId: s.externalOrderId || '—',
        courierName: s.courierName || 'In-House / Express',
        courierTrackingNo: s.courierTrackingNo || '—',
        deliveryFee: convert(s.deliveryFee || 0),
        deliveryFeePayer: payerLabel,
        storeFreightCost: storeExpenseVal,
        customer: recipientDisp,
        phone: phoneDisp,
        deliveryAddress: s.deliveryAddress || '—',
        collectable: convert(s.totalAmount),
        pipelineStage: s.pipelineStage || s.fulfillmentStatus || 'NEW',
        settlementStatus: settleStatus,
        deliveryFeeLoss: convert(s.deliveryFeeLoss || 0),
        createdAt: s.createdAt,
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  public static async generateInventoryExcel(options?: ExportOptions): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curLabel, convert } = await getCurrencyHelper(options?.currency);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet(dict.sheetInventory || 'Inventory Valuation');

    sheet.columns = [
      { header: dict.productName || 'Product Name', key: 'name', width: 32 },
      { header: dict.sku || 'SKU', key: 'sku', width: 18 },
      { header: dict.barcode || 'Barcode', key: 'barcode', width: 20 },
      { header: dict.warehouse || 'Warehouse', key: 'warehouse', width: 28 },
      { header: dict.batchNumber || 'Batch Number', key: 'batchNumber', width: 18 },
      { header: dict.expiryDate || 'Expiry Date', key: 'expiryDate', width: 16 },
      { header: dict.quantity || 'Quantity', key: 'quantity', width: 14 },
      { header: (dict.unitCost || 'Average Cost ({CUR})').replace('{CUR}', curLabel), key: 'avgCost', width: 22 },
      { header: (dict.totalValue || 'Total Value ({CUR})').replace('{CUR}', curLabel), key: 'totalValue', width: 22 },
      { header: dict.stockStatus || 'Stock Status', key: 'status', width: 18 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate 800
    };

    const all = await InventoryService.getStockSummary();
    const nowStr = new Date().toISOString().slice(0, 10);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const inv of all) {
      const isLow = (inv.quantity || 0) <= 10;
      const isExpired = inv.expiryDate && inv.expiryDate < nowStr;
      const isExpiring = inv.expiryDate && inv.expiryDate <= in30Days && !isExpired;

      let statusStr = dict.statusNormal || 'Normal';
      if (isExpired) statusStr = dict.statusExpired || 'Expired';
      else if (isExpiring) statusStr = dict.statusExpiringSoon || 'Expiring Soon';
      else if (isLow) statusStr = dict.statusLowStock || 'Low Stock';

      sheet.addRow({
        name: inv.productName || 'Unknown Product',
        sku: inv.sku || '—',
        barcode: inv.barcode || '—',
        warehouse: inv.warehouseName || 'Central Warehouse',
        batchNumber: inv.batchNumber || '—',
        expiryDate: inv.expiryDate || '—',
        quantity: inv.quantity,
        avgCost: convert(inv.avgCost),
        totalValue: convert(inv.quantity * inv.avgCost),
        status: statusStr,
      });
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  public static async generatePnlExcel(options?: ExportOptions): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curLabel, convert } = await getCurrencyHelper(options?.currency);

    const fontNameMap: Record<string, string> = {
      la: 'Noto Sans Lao',
      th: 'Noto Sans Thai',
      jp: 'Noto Serif JP',
      ja: 'Noto Serif JP',
      zh: 'Noto Serif SC',
      en: 'Arial Narrow',
    };
    const norm = (lang || 'en').toLowerCase().split('-')[0];
    const defaultFontName = fontNameMap[norm] || 'Arial Narrow';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet(dict.sheetPnl || 'Income Statement (P&L)', {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: dict.accountDesc || 'Account / Line Item Description', key: 'account', width: 44 },
      { header: dict.category || 'Category', key: 'category', width: 22 },
      { header: dict.flow || 'Flow', key: 'flow', width: 18 },
      { header: (dict.amount || 'Amount ({CUR})').replace('{CUR}', curLabel), key: 'amount', width: 24 },
      { header: dict.shareOfRev || '% of Revenue', key: 'share', width: 18 },
    ];

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { name: defaultFontName, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' }, // Teal 600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getColumn('amount').alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getColumn('share').alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getColumn('flow').alignment = { vertical: 'middle', horizontal: 'center' };

    const allSales = await db.select().from(sales);
    const allIncomes = await db.select().from(income);
    const allExpenses = await db.select().from(expenses);

    const fSales = allSales.filter((s) => {
      if (!options?.startDate && !options?.endDate) return true;
      const d = s.createdAt ? s.createdAt.slice(0, 10) : '';
      if (options?.startDate && d < options.startDate) return false;
      if (options?.endDate && d > options.endDate) return false;
      return true;
    });

    const fIncomes = allIncomes.filter((i) => {
      if (!options?.startDate && !options?.endDate) return true;
      const d = i.createdAt ? i.createdAt.slice(0, 10) : '';
      if (options?.startDate && d < options.startDate) return false;
      if (options?.endDate && d > options.endDate) return false;
      return true;
    });

    const fExpenses = allExpenses.filter((e) => {
      if (!options?.startDate && !options?.endDate) return true;
      const d = e.createdAt ? e.createdAt.slice(0, 10) : (e.expenseDate || '');
      if (options?.startDate && d < options.startDate) return false;
      if (options?.endDate && d > options.endDate) return false;
      return true;
    });

    // 1. Operating Revenue
    const grossSalesRev = fSales.reduce((sum, s) => sum + (s.paymentStatus === 'PAID' ? (s.totalAmount || 0) : 0), 0);
    const otherIncomesTotal = fIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalRev = grossSalesRev + otherIncomesTotal;

    // 2. Direct Costs & Freight Deductions
    const paidSaleIds = fSales.filter((s) => s.paymentStatus === 'PAID').map((s) => s.id);
    let totalCogs = 0;
    if (paidSaleIds.length > 0) {
      const paidItems = await db.select().from(saleItems).where(inArray(saleItems.saleId, paidSaleIds));
      totalCogs = paidItems.reduce((sum, it) => sum + (it.costPrice || 0) * (it.quantity || 0), 0);
    }

    const sellerPaidDeliveryFees = fSales.reduce(
      (sum, s) => sum + (s.paymentStatus === 'PAID' && s.deliveryFeePayer === 'SELLER_PAYS' ? (s.deliveryFee || 0) : 0),
      0
    );
    const deliveryFreightLosses = fSales.reduce((sum, s) => sum + (s.deliveryFeeLoss || 0), 0);

    const totalDirectCosts = totalCogs + sellerPaidDeliveryFees + deliveryFreightLosses;
    const grossProfit = totalRev - totalDirectCosts;
    const grossMargin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;

    // 3. Operating Expenses (OPEX)
    const totalOpex = fExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalOpex;
    const netMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

    const formatShare = (amt: number) => (totalRev > 0 ? `${((amt / totalRev) * 100).toFixed(1)}%` : '0.0%');

    // ── Row Helper ──
    const appendRow = (data: { account: string; category?: string; flow?: string; amount?: any; share?: string }, style?: { fontBold?: boolean; bgColor?: string; textColor?: string; italic?: boolean }) => {
      const row = sheet.addRow(data);
      row.font = {
        name: defaultFontName,
        size: 10,
        bold: Boolean(style?.fontBold),
        italic: Boolean(style?.italic),
        color: style?.textColor ? { argb: style.textColor } : undefined,
      };
      if (style?.bgColor) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.bgColor },
        };
      }
      return row;
    };

    // ── TIER 1: OPERATING REVENUE ──
    appendRow({ account: dict.tier1Header || '1. OPERATING REVENUE & INFLOWS', category: 'HEADER', flow: 'INFLOW', amount: '', share: '' }, { fontBold: true, bgColor: 'FFF0FDFA', textColor: 'FF0F766E' });
    appendRow({
      account: `   ${dict.posOmnichannelSales || 'POS & Omnichannel Sales Revenue'}`,
      category: 'SALES',
      flow: dict.inflowBadge || '+ Inflow',
      amount: convert(grossSalesRev),
      share: formatShare(grossSalesRev),
    });
    for (const inc of fIncomes) {
      appendRow({
        account: `   ${inc.description || 'Other Income'}`,
        category: inc.category || 'OTHER_INCOME',
        flow: dict.inflowBadge || '+ Inflow',
        amount: convert(inc.amount),
        share: formatShare(inc.amount),
      });
    }
    appendRow({
      account: dict.totalOperatingRevenue || 'TOTAL OPERATING REVENUE',
      category: 'SUBTOTAL',
      flow: '100.0%',
      amount: convert(totalRev),
      share: '100.0%',
    }, { fontBold: true, bgColor: 'FFF8FAFC' });

    sheet.addRow({});

    // ── TIER 2: DIRECT COSTS & FREIGHT DEDUCTIONS ──
    appendRow({ account: dict.tier2Header || '2. DIRECT COSTS & FREIGHT DEDUCTIONS', category: 'HEADER', flow: 'OUTFLOW', amount: '', share: '' }, { fontBold: true, bgColor: 'FFFFF1F2', textColor: 'FFE11D48' });
    appendRow({
      account: `   ${dict.cogs || 'Cost of Goods Sold (Unit Costs from POs)'}`,
      category: 'COGS',
      flow: dict.costBadge || '- Cost',
      amount: -convert(totalCogs),
      share: formatShare(totalCogs),
    });

    if (sellerPaidDeliveryFees > 0) {
      appendRow({
        account: `   ${dict.sellerPaidDelivery || 'Store Free Shipping (Seller-Paid Delivery)'}`,
        category: 'FREE_SHIPPING',
        flow: dict.freeShipBadge || '- Free Ship',
        amount: -convert(sellerPaidDeliveryFees),
        share: formatShare(sellerPaidDeliveryFees),
      });
    }

    if (deliveryFreightLosses > 0) {
      appendRow({
        account: `   ${dict.codFreightLosses || 'COD Delivery Refusal Freight Losses'}`,
        category: 'FREIGHT_LOSS',
        flow: dict.lossBadge || '- Loss',
        amount: -convert(deliveryFreightLosses),
        share: formatShare(deliveryFreightLosses),
      });
    }

    appendRow({
      account: dict.grossProfit || 'GROSS PROFIT',
      category: 'GROSS_PROFIT',
      flow: `${dict.margin || 'MARGIN'}: ${grossMargin.toFixed(1)}%`,
      amount: convert(grossProfit),
      share: `${grossMargin.toFixed(1)}%`,
    }, { fontBold: true, bgColor: 'FFF3E8FF', textColor: 'FF7E22CE' }); // Purple tint

    sheet.addRow({});

    // ── TIER 3: OPERATING EXPENSES (OPEX) ──
    appendRow({ account: dict.tier3Header || '3. OPERATING EXPENSES (OPEX)', category: 'HEADER', flow: 'OUTFLOW', amount: '', share: '' }, { fontBold: true, bgColor: 'FFFFFBEB', textColor: 'FFB45309' });
    if (fExpenses.length === 0) {
      appendRow({
        account: `   ${dict.noRecordedExpenses || 'No general overhead or store expenses recorded in this period'}`,
        category: 'OPERATIONS',
        flow: '—',
        amount: 0,
        share: '0.0%',
      }, { italic: true, textColor: 'FF94A3B8' });
    } else {
      for (const exp of fExpenses) {
        appendRow({
          account: `   ${exp.description || 'Store Expense'}`,
          category: exp.category || 'OPERATIONS',
          flow: dict.opexBadge || '- OPEX',
          amount: -convert(exp.amount),
          share: formatShare(exp.amount),
        });
      }
    }

    appendRow({
      account: dict.totalOpex || 'TOTAL OPERATING EXPENSES',
      category: 'SUBTOTAL',
      flow: `OPEX: ${totalRev > 0 ? ((totalOpex / totalRev) * 100).toFixed(1) : '0.0'}%`,
      amount: -convert(totalOpex),
      share: formatShare(totalOpex),
    }, { fontBold: true, bgColor: 'FFF8FAFC' });

    sheet.addRow({});

    // ── BOTTOM LINE: NET OPERATING PROFIT (EBITDA) ──
    const netRow = appendRow({
      account: dict.netProfit || 'NET OPERATING PROFIT (EBITDA)',
      category: 'BOTTOM_LINE',
      flow: `${dict.netMargin || 'NET MARGIN'}: ${netMargin.toFixed(1)}%`,
      amount: convert(netProfit),
      share: `${netMargin.toFixed(1)}%`,
    }, { fontBold: true, bgColor: 'FFDCFCE7', textColor: 'FF15803D' }); // Emerald Green

    netRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF10B981' } },
        bottom: { style: 'double', color: { argb: 'FF10B981' } },
      };
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  public static async generateLossReportExcel(options?: ExportOptions): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curLabel, convert } = await getCurrencyHelper(options?.currency);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet(dict.sheetLoss || 'Loss & Shrinkage Report');

    sheet.columns = [
      { header: dict.dateTime || 'Date & Time', key: 'date', width: 22 },
      { header: dict.productName || 'Product Name', key: 'product', width: 32 },
      { header: dict.sku || 'SKU / Barcode', key: 'sku', width: 18 },
      { header: dict.warehouse || 'Warehouse', key: 'warehouse', width: 18 },
      { header: dict.batchNumber || 'Batch #', key: 'batch', width: 16 },
      { header: dict.lossReason || 'Loss Reason / Type', key: 'type', width: 20 },
      { header: dict.qtyLost || 'Qty Lost', key: 'quantity', width: 12 },
      { header: (dict.unitCost || 'Unit Cost ({CUR})').replace('{CUR}', curLabel), key: 'cost', width: 18 },
      { header: (dict.totalCostLoss || 'Total Cost Loss ({CUR})').replace('{CUR}', curLabel), key: 'totalCost', width: 22 },
      { header: (dict.totalRetailLoss || 'Retail Value Lost ({CUR})').replace('{CUR}', curLabel), key: 'totalRetail', width: 22 },
      { header: dict.recordedBy || 'Recorded By', key: 'recordedBy', width: 20 },
      { header: dict.notes || 'Notes / Reason Detail', key: 'notes', width: 36 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE11D48' }, // Rose / Warning Red
    };

    const { InventoryService } = await import('./inventory.service');
    const { history, summary } = await InventoryService.getLossHistory({
      startDate: options?.startDate,
      endDate: options?.endDate,
      warehouseId: options?.warehouseId,
      lossType: options?.lossType,
    });

    for (const h of history) {
      sheet.addRow({
        date: h.createdAt || '—',
        product: h.productName || 'Unknown Product',
        sku: h.sku || h.barcode || '—',
        warehouse: h.warehouseName || 'Central WH',
        batch: h.batchNumber || '—',
        type: h.type || 'DAMAGE',
        quantity: h.absQuantity,
        cost: convert(h.cost),
        totalCost: convert(h.totalCostValue),
        totalRetail: convert(h.totalRetailValue),
        recordedBy: h.createdByName || 'System/Staff',
        notes: h.notes || '—',
      });
    }

    // Summary Row
    sheet.addRow({});
    const summaryRow = sheet.addRow({
      date: dict.totalSummary || 'TOTAL SUMMARY',
      product: `Total Records: ${summary.totalRecords}`,
      quantity: summary.totalItemsLost,
      totalCost: convert(summary.totalLossCost),
      totalRetail: convert(summary.totalLossRetail),
    });
    summaryRow.font = { bold: true };

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Generates Excel Export for Cash Flow Auto Summarize
   */
  public static async generateCashFlowExcel(options?: ExportOptions & { granularity?: 'day' | 'month' | 'year' | 'all' }): Promise<Buffer> {
    const lang = options?.lang || 'en';
    const dict = getDictionary(lang);
    const { curCode, curLabel, convert } = await getCurrencyHelper(options?.currency);
    const poMode = options?.poOutflowMode || 'ACTUAL_PAID';
    const poHeader = poMode === 'TOTAL_COMMITTED' ? `Supplier Stock Total POs (${curLabel})` : `Supplier Stock Paid POs (${curLabel})`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '39POS Enterprise';
    const sheet = workbook.addWorksheet('Cash Flow Summary');

    sheet.columns = [
      { header: 'Period / Time Bucket', key: 'period', width: 24 },
      { header: `Sales Inflow (${curLabel})`, key: 'inflowSales', width: 22 },
      { header: `Other Incomes (${curLabel})`, key: 'inflowIncome', width: 22 },
      { header: `Total Inflow (${curLabel})`, key: 'totalInflow', width: 24 },
      { header: poHeader, key: 'outflowPurchases', width: 28 },
      { header: `Store OPEX Outflow (${curLabel})`, key: 'outflowExpenses', width: 24 },
      { header: `Total Outflow (${curLabel})`, key: 'totalOutflow', width: 24 },
      { header: `Net Cash Flow (${curLabel})`, key: 'netCashFlow', width: 24 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // Emerald green
    };

    const { CashFlowService } = await import('./cashFlow.service');
    const { summary, timeSeries } = await CashFlowService.getCashFlowSummary({
      granularity: options?.granularity || 'day',
      startDate: options?.startDate,
      endDate: options?.endDate,
      currency: curCode,
      poOutflowMode: poMode,
    });

    for (const row of timeSeries) {
      const addedRow = sheet.addRow({
        period: row.period,
        inflowSales: convert(row.inflowSales),
        inflowIncome: convert(row.inflowIncome),
        totalInflow: convert(row.inflow),
        outflowPurchases: convert(row.outflowPurchases),
        outflowExpenses: convert(row.outflowExpenses),
        totalOutflow: convert(row.outflow),
        netCashFlow: convert(row.net),
      });

      if (row.net < 0) {
        addedRow.getCell('netCashFlow').font = { color: { argb: 'FFE11D48' }, bold: true };
      } else {
        addedRow.getCell('netCashFlow').font = { color: { argb: 'FF059669' }, bold: true };
      }
    }

    // Summary Row
    sheet.addRow({});
    const summaryRow = sheet.addRow({
      period: 'TOTAL GRAND SUMMARY',
      inflowSales: convert(summary.totalInflowSales),
      inflowIncome: convert(summary.totalInflowIncome),
      totalInflow: convert(summary.totalInflow),
      outflowPurchases: convert(summary.totalOutflowPurchases),
      outflowExpenses: convert(summary.totalOutflowExpenses),
      totalOutflow: convert(summary.totalOutflow),
      netCashFlow: convert(summary.netCashFlow),
    });
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}

