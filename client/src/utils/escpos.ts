import { CartItemDTO, PaymentTenderDTO } from '39pos-shared';

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  taxId?: string;
  invoiceNo: string;
  cashierName: string;
  customerName?: string;
  tableNo?: string;
  items: CartItemDTO[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: PaymentTenderDTO[];
  change: number;
  headerText?: string;
  footerText?: string;
  date: string;
}

export class EscPosBuilder {
  private buffer: number[] = [];

  // ESC/POS Commands
  private static ESC = 0x1b;
  private static GS = 0x1d;

  constructor() {
    this.init();
  }

  public init(): this {
    this.buffer.push(EscPosBuilder.ESC, 0x40); // Initialize printer
    return this;
  }

  public align(align: 'left' | 'center' | 'right'): this {
    const val = align === 'left' ? 0 : align === 'center' ? 1 : 2;
    this.buffer.push(EscPosBuilder.ESC, 0x61, val);
    return this;
  }

  public bold(enable: boolean): this {
    this.buffer.push(EscPosBuilder.ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  public textSize(width: number = 1, height: number = 1): this {
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(EscPosBuilder.GS, 0x21, n);
    return this;
  }

  public text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  public line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public divider(char: string = '-', length: number = 42): this {
    this.line(char.repeat(length));
    return this;
  }

  public twoColumns(left: string, right: string, totalWidth: number = 42): this {
    const space = totalWidth - left.length - right.length;
    const padding = space > 0 ? ' '.repeat(space) : ' ';
    this.line(`${left}${padding}${right}`);
    return this;
  }

  public cut(feedLines: number = 4): this {
    for (let i = 0; i < feedLines; i++) {
      this.buffer.push(0x0a);
    }
    this.buffer.push(EscPosBuilder.GS, 0x56, 0x41, 0x00); // Full cut
    return this;
  }

  public openCashDrawer(): this {
    this.buffer.push(EscPosBuilder.ESC, 0x70, 0x00, 0x19, 0xfa); // Pulse RJ11 pin 2
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  public static buildReceiptBytes(data: ReceiptData): Uint8Array {
    const builder = new EscPosBuilder();

    builder
      .align('center')
      .bold(true)
      .textSize(2, 2)
      .line(data.storeName)
      .textSize(1, 1)
      .bold(false);

    if (data.storeAddress) builder.line(data.storeAddress);
    if (data.storePhone) builder.line(`Tel: ${data.storePhone}`);
    if (data.taxId) builder.line(`Tax ID: ${data.taxId}`);
    if (data.headerText) builder.line(data.headerText);

    builder.divider('=');
    builder.align('left');
    builder.twoColumns(`Invoice: ${data.invoiceNo}`, data.date.split('T')[0]);
    builder.twoColumns(`Cashier: ${data.cashierName}`, data.tableNo ? `Table: ${data.tableNo}` : '');
    if (data.customerName) builder.line(`Customer: ${data.customerName}`);

    builder.divider('-');
    builder.bold(true);
    builder.twoColumns('ITEM / QTY', 'AMOUNT');
    builder.bold(false);
    builder.divider('-');

    for (const item of data.items) {
      const lineName = item.variantName ? `${item.name} (${item.variantName})` : item.name;
      builder.line(lineName);
      const qtyPrice = `  ${item.quantity} x $${item.unitPrice.toFixed(2)}`;
      const total = `$${item.totalPrice.toFixed(2)}`;
      builder.twoColumns(qtyPrice, total);
    }

    builder.divider('-');
    builder.twoColumns('Subtotal:', `$${data.subtotal.toFixed(2)}`);
    if (data.discount > 0) builder.twoColumns('Discount:', `-$${data.discount.toFixed(2)}`);
    if (data.tax > 0) builder.twoColumns('Tax (VAT 7%):', `$${data.tax.toFixed(2)}`);
    builder.divider('=');

    builder.bold(true).textSize(1, 2);
    builder.twoColumns('TOTAL DUE:', `$${data.total.toFixed(2)}`);
    builder.bold(false).textSize(1, 1);
    builder.divider('-');

    for (const p of data.payments) {
      builder.twoColumns(`Paid (${p.paymentMethod}):`, `${p.currency} ${p.tenderedAmount.toLocaleString()}`);
    }
    builder.twoColumns('Change Returned:', `$${data.change.toFixed(2)}`);

    builder.divider('=');
    builder.align('center');
    if (data.footerText) {
      builder.line(data.footerText);
    } else {
      builder.line('Thank you for your visit!');
      builder.line('Please come again');
    }

    builder.cut();
    return builder.getBytes();
  }
}
