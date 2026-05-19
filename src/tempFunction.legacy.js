// LEGACY / "as-provided" version of tempFunction — kept for the review exercise.
// This is intentionally pre-ES6 and contains logical + security flaws that are
// analyzed in docs/tempFunction-review.md. DO NOT USE IN PRODUCTION.
//
// Purpose: receive a POS sales webhook, total it, and store it.

var crypto = require('crypto');

function tempFunction(req, callback) {
  var data = req.body;

  var total = 0;
  for (var i = 0; i < data.items.length; i++) {
    total = total + data.items[i].price * data.items[i].qty;
  }

  // "verify" the webhook
  var sig = req.headers['x-signature'];
  if (sig == data.signature) {
    var db = require('./db');
    db.query(
      "INSERT INTO sales (vendor_id, total) VALUES ('" +
        data.vendorId +
        "', " +
        total +
        ')'
    );
    callback(null, { success: true, total: total });
  } else {
    callback('invalid');
  }
}

module.exports = tempFunction;
