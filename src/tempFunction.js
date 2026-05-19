import crypto from 'node:crypto';

// Modern rewrite of the legacy POS-webhook intake (see src/tempFunction.legacy.js
// and the review in docs/tempFunction-review.md). Verifies the provider signature
// over the RAW body, rejects replays, treats money as integer cents, and writes
// through a parameterized db boundary. Dependencies are injected for testability.

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export class WebhookError extends Error {
  constructor(message, { code, status = 400 } = {}) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
    this.status = status;
  }
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function verifySignature({
  rawBody,
  timestamp,
  signature,
  secret,
  toleranceMs = DEFAULT_TOLERANCE_MS,
  now = Date.now,
}) {
  if (!rawBody || !timestamp || !signature || !secret) {
    throw new WebhookError('Missing signature material', {
      code: 'SIGNATURE_MISSING',
      status: 401,
    });
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    throw new WebhookError('Invalid signature timestamp', {
      code: 'SIGNATURE_TIMESTAMP',
      status: 401,
    });
  }
  if (Math.abs(now() - ts) > toleranceMs) {
    throw new WebhookError('Signature timestamp outside tolerance', {
      code: 'SIGNATURE_REPLAY',
      status: 401,
    });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new WebhookError('Signature mismatch', {
      code: 'SIGNATURE_MISMATCH',
      status: 401,
    });
  }
  return true;
}

const assertCents = (value, label) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new WebhookError(`Invalid ${label}`, { code: 'INVALID_AMOUNT' });
  }
  return value;
};

export function totalCentsFromItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new WebhookError('Sale has no line items', { code: 'EMPTY_ITEMS' });
  }
  return items.reduce((sum, item) => {
    if (!isPlainObject(item)) {
      throw new WebhookError('Malformed line item', { code: 'INVALID_ITEM' });
    }
    const unit = assertCents(item.unitPriceCents, 'unitPriceCents');
    const qty = item.quantity;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new WebhookError('Invalid quantity', { code: 'INVALID_QUANTITY' });
    }
    return sum + unit * qty;
  }, 0);
}

export async function ingestPosSale(request, deps) {
  const { db, secret, now = Date.now } = deps;
  const { rawBody, headers } = request;

  // 1. Authenticate against the RAW body before parsing.
  verifySignature({
    rawBody,
    timestamp: headers['x-timestamp'],
    signature: headers['x-signature'],
    secret,
    now,
  });

  // 2. Parse only after the body is trusted.
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new WebhookError('Body is not valid JSON', { code: 'INVALID_JSON' });
  }

  const { eventId, vendorId, currency = 'USD', items } = payload;
  if (!eventId || !vendorId) {
    throw new WebhookError('Missing eventId or vendorId', {
      code: 'MISSING_FIELDS',
    });
  }

  // 3. Idempotency: a replayed/duplicate provider event is a no-op.
  const existing = await db.findSaleByEventId(eventId);
  if (existing) {
    return { status: 'duplicate', sale: existing };
  }

  // 4. Compute the total in integer cents and persist via the parameterized boundary.
  const totalCents = totalCentsFromItems(items);
  const sale = await db.insertSale({
    idempotencyKey: eventId,
    vendorId,
    currency,
    totalCents,
    items,
  });

  return { status: 'created', sale };
}

export default ingestPosSale;
