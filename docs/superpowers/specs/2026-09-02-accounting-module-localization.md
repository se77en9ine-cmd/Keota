# Accounting Module Multi-Locale Localization & Typography Specification

## 1. Overview & Goals
Complete end-to-end multi-language localization and typography overhaul for the entire Accounting module (`/accounting`), covering:
- **General Ledger Tab (`GeneralLedgerTab.tsx`)**
- **Chart of Accounts Tab (`ChartOfAccountsTab.tsx`)**
- **Operating Expenses, Other Income & Shift Closing (`AccountingPage.tsx`)**
- **Manual Journal Voucher Modal (`Post Manual Voucher`)**

### Standards:
1. **Full Locale Separation across All 5 Languages**:
   Every term cleanly separated in `la.json`, `th.json`, `en.json`, `zh.json`, and `jp.json`.
2. **Localize 18 Standard Chart of Accounts**:
   - `1010`: Cash on Hand (Register Drawer) / ເງິນສົດໃນລິ້ນຊັກ / เงินสดในลิ้นชัก
   - `1020`: Bank Account & Digital QR / ບັນຊີທະນາຄານ & ເງິນໂອນ QR / บัญชีธนาคารและ QR
   - `1200`: Merchandise Inventory Asset / ສິນຄ້າໃນສາງ / สินค้าคงคลัง
   - `1300`: Accounts Receivable (COD) / ລູກໜີ້ການຄ້າ (COD) / ลูกหนี้การค้า (COD)
   - `2010`: Accounts Payable (Suppliers) / ເຈົ້າໜີ້ການຄ້າ / เจ้าหนี้การค้า
   - `2100`: Sales Tax & VAT Payable / ພາສີ & VAT ຄ້າງຈ່າຍ / ภาษีขายและ VAT ค้างจ่าย
   - `3010`: Owner Initial Capital / ທຶນເລີ່ມຕົ້ນຂອງເຈົ້າຂອງຮ້ານ / ทุนประเดิมเจ้าของ
   - `3020`: Retained Earnings / ກຳໄລສະສົມ / กำไรสะสม
   - `4010`: POS In-Store Sales Revenue / ລາຍຮັບຂາຍໜ້າຮ້ານ POS / รายได้ขายหน้าร้าน POS
   - `4020`: Online Platform Sales Revenue / ລາຍຮັບຂາຍແພລດຟອມອອນລາຍ / รายได้ขายแพลตฟอร์มออนไลน์
   - `4090`: Miscellaneous Income / ລາຍຮັບອື່ນໆ / รายรับอื่นๆ
   - `5010`: Cost of Goods Sold (COGS) / ຕົ້ນທຶນສິນຄ້າທີ່ຂາຍ (COGS) / ต้นทุนขาย (COGS)
   - `5020`: Inventory Shrinkage & Loss / ສິນຄ້າເສຍຫາຍ & ສູນຫາຍ / สินค้าเสียหายและสูญหาย
   - `6010`: Utilities & Electricity / ຄ່ານ້ຳ, ຄ່າໄຟ & ສາທາລະນູປະໂພກ / ค่าน้ำค่าไฟ
   - `6020`: Store Rent & Facility / ຄ່າເຊົ່າຮ້ານ & ສະຖານທີ່ / ค่าเช่าร้าน
   - `6030`: Staff Salaries & Wages / ເງິນເດືອນ & ຄ່າຈ້າງພະນັກງານ / เงินเดือนและค่าจ้าง
   - `6040`: Delivery Freight Loss (Refused COD) / ຄ່າຂົນສົ່ງເສຍຫາຍ (ລູກຄ້າປະຕິເສດ COD) / ค่าขนส่งเสียหายจากปฏิเสธ COD
   - `6050`: Repairs & Maintenance / ຄ່າສ້ອມແປງ & ບຳລຸງຮັກສາ / ค่าซ่อมแซมและบำรุงรักษา
   - `6090`: General & Administrative Expenses / ລາຍຈ່າຍບໍລິຫານທົ່ວໄປ (G&A) / ค่าใช้จ่ายบริหารทั่วไป
3. **Account Types & Normal Balance**:
   - Types: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`
   - Normal Balance: `DEBIT` (`ເດບິດ (DR)`), `CREDIT` (`ເຄຣດິດ (CR)`)
4. **Action Buttons, Modals, Forms & Droplists**:
   - `Select Account...`, `All Ledger Accounts (Consolidated)`
   - `Date`, `Voucher #`, `Reference / Memo`, `Debit (DR)`, `Credit (CR)`, `Running Balance`
   - `Total Debit`, `Total Credit`, `Net Ending Balance`
   - `Post Manual Voucher`, `Voucher Date`, `Voucher Memo`, `Account`, `Add Line`, `Remove Line`
5. **Build Verification**:
   Zero errors on client and server.
