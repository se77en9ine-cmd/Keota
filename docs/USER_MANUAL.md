# 39POS Enterprise User Manual

## 1. Quick Start & Logging In
1. Open your browser or launch the 39POS desktop application.
2. Sign in with your username and password, or tap your name and enter your 4-digit Cashier PIN (e.g. `3939` for Cashier, `1234` for Admin).
3. The system dynamically loads your language preference (Lao, Thai, Japanese, Chinese, or English) with high-legibility Unicode typography.

## 2. Operating the POS Register
- **Scanning Barcodes:** Use any 1D/2D USB or Bluetooth barcode scanner. The scanner automatically adds matching items to your active cart.
- **Manual Search:** Press `F2` or click the search box to search by product name, SKU, or category.
- **Product Variants:** Tapping products with multiple options (e.g., Beverage sizes or Charger colors) pops up the variant selector.
- **Hold & Resume Order:** Tap **Hold Bill** to park the current order and serve the next customer. Tap **Held** to resume or void previous parked tickets.
- **Customer Loyalty:** Type the member's phone number or name in the Customer field to accrue loyalty reward points.

## 3. Processing Payments & Split Currency
1. Click **Pay Now**.
2. Select tender method: **Cash**, **Credit/Debit Card**, **QR Pay (PromptPay/BCEL One)**, or **Transfer**.
3. For multi-currency payments:
   - Select the received currency (e.g. `LAK` or `THB`).
   - Enter the tendered amount or click Quick Cash presets.
   - The system automatically calculates exact change in your preferred currency using high-precision Decimal math.
4. Tap **Confirm & Print Receipt** to print to your 80mm ESC/POS thermal printer or download a PDF invoice.

## 4. Register Locking & Fast Shift Handovers
- When stepping away from the register, click **Lock PIN** in the navigation bar.
- The next cashier can simply enter their 4-digit PIN to immediately switch registers without logging out.

## 5. End of Day Closing
1. Go to **Financials & Expenses** -> **Close Shift Register**.
2. Count physical cash in drawer and enter the amount.
3. The system compares actual vs. expected cash, alerts you to discrepancies, and locks the shift audit trail.
