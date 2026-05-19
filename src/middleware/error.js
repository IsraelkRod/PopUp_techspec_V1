// Single error handler for the API. Errors carry an optional `status` and `code`
// (e.g. AuthError, WebhookError); anything without a status is treated as a 500.
export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  const body = { error: err.message ?? 'Internal Server Error' };
  if (err.code) body.code = err.code;
  if (status >= 500) console.error(err);
  res.status(status).json(body);
}
