import { normalizeSquarePayment } from '../src/pos/square/squareNormalizer.js';

describe('normalizeSquarePayment', () => {
  const payment = {
    id: 'pay_x',
    order_id: 'ord_x',
    amount_money: { amount: 1250, currency: 'USD' },
    created_at: '2026-05-01T12:00:00Z',
  };

  test('payment without an order has a total but no line items', () => {
    const sale = normalizeSquarePayment(payment, 'vendor_1');
    expect(sale).toMatchObject({
      idempotencyKey: 'square:pay_x',
      vendorId: 'vendor_1',
      currency: 'USD',
      totalCents: 1250,
      items: [],
      source: 'square',
    });
  });

  test('order line items are mapped, with quantity parsed to a number', () => {
    const order = {
      id: 'ord_x',
      line_items: [
        { name: 'Espresso', quantity: '3', base_price_money: { amount: 300 }, total_money: { amount: 900 } },
        { variation_name: 'Large', quantity: '1', base_price_money: { amount: 350 }, total_money: { amount: 350 } },
      ],
    };
    const sale = normalizeSquarePayment(payment, 'vendor_1', order);
    expect(sale.items).toEqual([
      { productName: 'Espresso', quantity: 3, unitPriceCents: 300, totalCents: 900 },
      { productName: 'Large', quantity: 1, unitPriceCents: 350, totalCents: 350 },
    ]);
  });
});
