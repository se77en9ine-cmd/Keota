# Omnichannel & Online Platform Orders Hub — System Design

## 1. Overview & Goal
Enable retail stores, restaurants, and cafes to seamlessly accept, tag, track, and fulfill orders coming from diverse **Online Platforms and Sales Channels**:
- **In-Store POS** (Walk-in, Dine-in, Takeaway)
- **Food Delivery Platforms** (GrabFood, Foodpanda, Lineman)
- **E-Commerce & Marketplaces** (Shopee, Lazada, TikTok Shop, Official Web Store)
- **Social & Direct Messaging** (WhatsApp, Facebook Messenger, Phone orders)

---

## 2. Omnichannel Data Architecture

### Database Schema Updates (`sales` table)
| Column | Type | Description |
|---|---|---|
| `channel` | `TEXT` | `POS`, `WEB_STORE`, `GRAB_FOOD`, `FOODPANDA`, `SHOPEE`, `TIKTOK_SHOP`, `WHATSAPP`, `PHONE` |
| `orderType` | `TEXT` | `DINE_IN`, `TAKEAWAY`, `DELIVERY`, `PICKUP` |
| `fulfillmentStatus` | `TEXT` | `PENDING`, `PREPARING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED` |
| `externalOrderId` | `TEXT` | Reference ID from platform (e.g. `GF-88421`, `SP-99214`, `FP-1092`) |
| `deliveryAddress` | `TEXT` | Optional delivery address or drop-off point |
| `deliveryContact` | `TEXT` | Customer recipient phone number / rider notes |

---

## 3. Visual Pipeline & Dispatch Hub (`/online-orders`)

### A. Real-Time Kanban Stages
1. 🔔 **New Pending**: Incoming online orders with glowing badge & alert chime. Buttons: **Accept** or **Reject / Cancel**.
2. 🍳 **Preparing / Kitchen**: Order accepted and currently being packaged or cooked.
3. 📦 **Ready for Pickup**: Packaged order waiting for rider or customer pickup.
4. 🛵 **Out for Delivery / Dispatched**: Rider on the way to customer.
5. ✅ **Completed**: Successfully delivered & settled.

### B. View Switcher
- **Visual Kanban Column Cards**: Color-coded platform badges (Grab green, Foodpanda pink, Shopee orange, TikTok dark, WhatsApp green).
- **Compact Table View**: Searchable, filterable by date, platform channel, and payment status.
- **Simulation Button**: "Simulate Incoming Online Order" to test instant alerts, live dispatching, and sound FX without waiting for external webhooks.

---

## 4. In-POS Channel Selector (`CartPanel.tsx`)
- Cashiers taking phone, WhatsApp, or third-party pickup orders directly in POS can select the **Sales Channel** via a channel badge dropdown (e.g., `Store POS`, `GrabFood`, `Foodpanda`, `WhatsApp Order`).
- Channel badge displays on active cart, receipts, and order histories.

---

## 5. Channel Analytics & Revenue Breakdown (`ReportsPage.tsx`)
- Revenue & order volume segmented by platform (In-store vs Online Channels).
