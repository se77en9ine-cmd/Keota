# POS Customer Loyalty Points Lifecycle & Redemption Standard

## 1. Member Lookup & Tier Auto-Discount
- Every POS checkout interface MUST provide a dedicated, searchable **Customer Lookup Modal** (search by name, phone, member code, email).
- Selecting a customer automatically binds their membership tier discount rate (e.g. VIP Platinum 15%, Gold 10%, Silver 5%) and displays their live points balance.

## 2. Dual Points Redemption Workflow
- **Points-as-Discount**: 100 Points = $1.00 USD base discount (1 pt = $0.01). Cashiers can apply quick preset increments (`100 pts`, `500 pts`, `Max pts`) to deduct from order subtotal before taxes.
- **Points-as-Tender**: `LOYALTY_POINTS` MUST be available in multi-tender payment methods, supporting split payments.

## 3. Server-Side Atomic Point Accounting
- Backend checkout endpoints MUST validate point sufficiency (`cust.points >= pointsRedeemed`) before executing sale orders.
- Calculate newly earned points on net total (1 pt per $10 spent).
- Atomically update balance:
  $$\text{New Points} = \max(0, \text{Current Points} - \text{Redeemed Points} + \text{Earned Points})$$
