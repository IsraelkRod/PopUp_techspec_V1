// Central configuration. Real secrets come from environment variables in
// production; the dev defaults here let the app run with zero setup.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-jwt-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  posWebhookSecret:
    process.env.POPUP_POS_WEBHOOK_SECRET ?? 'whsec_dev_secret_change_me',
};
