# `tempFunction` — Review, Self-Critique & Rewrite

This documents the four review steps requested, against the representative POP UP
function: **receive a POS sales webhook, total it, and store it.**

- Legacy code: [`src/tempFunction.legacy.js`](../src/tempFunction.legacy.js)
- Rewritten code: [`src/tempFunction.js`](../src/tempFunction.js)
- Tests: [`tests/tempFunction.test.js`](../tests/tempFunction.test.js)

---

## 1. Review — logical & security concerns (first pass)

| # | Severity | Concern | Why it matters |
| --- | --- | --- | --- |
| R1 | **Critical** | **SQL injection** — query built by string concatenation with `data.vendorId` and `total`. | Attacker-controlled `vendorId` can break out of the string and run arbitrary SQL. |
| R2 | **Critical** | **Broken auth** — signature compared with loose `==`. | `==` allows type coercion; also not constant-time. |
| R3 | **High** | **No input validation** — `data.items` assumed to exist/iterate. | `undefined.length` throws; malformed payloads crash the worker. |
| R4 | **High** | **Money as floats** — `price * qty` on floating-point dollars. | `0.1 + 0.2` style drift corrupts financial totals. |
| R5 | **Medium** | **No error handling** — DB call not awaited/try-caught; callback style. | Failures are silent or unhandled; no rollback. |
| R6 | **Medium** | `var`, loose equality, `require()` inside the function. | Not ES6; per-call `require` and hoisting pitfalls. |
| R7 | **Low** | `total`/`success` returned but `vendorId` not validated as belonging to caller. | Cross-tenant write risk. |

---

## 2. Self-critique — where I was wrong / overlooked / over-stated

Reviewing my own list:

- **I was wrong about the *root* of R2.** I framed the signature bug as "`==` /
  timing attack." The deeper flaw is that the legacy code compares the header to
  **`data.signature` — a value inside the attacker-controlled body**. A signature you
  read out of the payload proves nothing; even a perfect constant-time compare would
  be useless. The real fix is an **HMAC over the raw body using a server-side secret**.
  Timing-safe comparison is necessary but secondary.
- **I overlooked idempotency / replay protection.** Webhooks are delivered
  *at-least-once*; providers retry. Without an idempotency key the same sale is
  inserted multiple times — a correctness bug I missed entirely.
- **I overlooked the raw-body requirement.** Signature verification must run on the
  **raw bytes before JSON parsing/re-serialization**, or the HMAC won't match. My
  first pass implied "validate then verify," which is backwards.
- **I overlooked timestamp/replay tolerance.** Even a valid signature can be replayed
  later; a timestamp window is needed.
- **R7 was under-specified, not wrong** — cross-tenant authorization is real, but I
  listed it as "Low" when an unauthorized financial write is arguably High.
- **Nothing in the list was outright incorrect to include**, but R6 (style) was
  ranked alongside security issues; it's real but lowest priority.

Net: the corrected priority order is **HMAC-over-raw-body + idempotency first**, then
SQL safety, validation, money-as-cents, and finally style/ergonomics.

---

## 3. Rewrite

See [`src/tempFunction.js`](../src/tempFunction.js). It addresses every confirmed item:

| Fix | How |
| --- | --- |
| Auth root cause + R2 | `verifySignature()` computes HMAC-SHA256 over `${timestamp}.${rawBody}` with a server secret, compares with `crypto.timingSafeEqual`. |
| Replay | Timestamp tolerance window (`SIGNATURE_REPLAY`). |
| Idempotency | `db.findSaleByEventId(eventId)` short-circuits duplicates → `{ status: 'duplicate' }`. |
| Raw body first | Verify on `rawBody`, **then** `JSON.parse`. |
| R1 SQL injection | All writes go through the parameterized `db` boundary (`src/db.js`); no string SQL. |
| R3 validation | `totalCentsFromItems` validates array, item shape, price, quantity. |
| R4 money | Integer **cents** only; `assertCents` rejects non-integers/negatives. |
| R5 errors | `async/await` + typed `WebhookError` with `code`/`status`. |
| R6 ES6 | ESM, `const`/`let`, arrow fns, `reduce`, destructuring, no in-fn `require`. |

---

## 4. Tests (Node + Jest)

See [`tests/tempFunction.test.js`](../tests/tempFunction.test.js):

- **Expected to PASS (happy path):** a correctly-signed webhook ingests, totals to
  `1250` cents with no float drift, and a replay is idempotent (`duplicate`).
- **Expected to FAIL/REJECT (failure path):** a body tampered *after* signing is
  rejected with `WebhookError code=SIGNATURE_MISMATCH`, and `insertSale` is never
  called. The test passes precisely because the function refuses the bad request.

> Note on the phrase "a test expected to fail": in a real suite both tests should be
> green. The second test asserts the function's **failure behavior** (it must reject),
> rather than being a deliberately red test. Run with `npm test`.
