import crypto from 'node:crypto';

// In-memory user store. Same shape a Postgres-backed repo will expose, so the
// rest of the app doesn't change when we swap the implementation.
export function createUserRepo() {
  const byId = new Map();
  const byEmail = new Map();

  return {
    async findByEmail(email) {
      return byEmail.get(String(email).toLowerCase()) ?? null;
    },

    async findById(id) {
      return byId.get(id) ?? null;
    },

    async create({ email, passwordHash, role }) {
      const user = {
        id: crypto.randomUUID(),
        email: String(email).toLowerCase(),
        passwordHash,
        role,
        createdAt: new Date().toISOString(),
      };
      byId.set(user.id, user);
      byEmail.set(user.email, user);
      return user;
    },
  };
}

// In-memory market + event store. A market (the host's "project") owns a list of
// scheduled event dates.
export function createMarketRepo() {
  const markets = new Map();
  const eventsByMarket = new Map();

  return {
    async createMarket({ hostId, name, location }) {
      const market = {
        id: crypto.randomUUID(),
        hostId,
        name,
        location,
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      markets.set(market.id, market);
      eventsByMarket.set(market.id, []);
      return market;
    },

    async getMarket(id) {
      return markets.get(id) ?? null;
    },

    async listMarkets() {
      return [...markets.values()];
    },

    async addEvent({ marketId, startsAt, endsAt }) {
      const event = {
        id: crypto.randomUUID(),
        marketId,
        startsAt,
        endsAt,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };
      eventsByMarket.get(marketId).push(event);
      return event;
    },

    async listEvents(marketId) {
      return [...(eventsByMarket.get(marketId) ?? [])];
    },
  };
}

// In-memory POS connection store (a vendor's link to Square/Clover/Stripe…).
// Tokens are stored already-encrypted by the caller.
export function createConnectionRepo() {
  const byId = new Map();

  const find = (vendorId, provider) =>
    [...byId.values()].find(
      (c) => c.vendorId === vendorId && c.provider === provider
    ) ?? null;

  return {
    async upsert({ vendorId, provider, ...rest }) {
      const existing = find(vendorId, provider);
      if (existing) {
        Object.assign(existing, rest, { updatedAt: new Date().toISOString() });
        return existing;
      }
      const connection = {
        id: crypto.randomUUID(),
        vendorId,
        provider,
        ...rest,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      byId.set(connection.id, connection);
      return connection;
    },

    async findById(id) {
      return byId.get(id) ?? null;
    },

    async findByVendorAndProvider(vendorId, provider) {
      return find(vendorId, provider);
    },

    async listByVendor(vendorId) {
      return [...byId.values()].filter((c) => c.vendorId === vendorId);
    },
  };
}

// In-memory vendor application store (the host's vendor funnel).
export function createApplicationRepo() {
  const byId = new Map();

  return {
    async create({ marketId, vendorId, note }) {
      const application = {
        id: crypto.randomUUID(),
        marketId,
        vendorId,
        note,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      byId.set(application.id, application);
      return application;
    },

    async getById(id) {
      return byId.get(id) ?? null;
    },

    async listByMarket(marketId) {
      return [...byId.values()].filter((a) => a.marketId === marketId);
    },

    async findByMarketAndVendor(marketId, vendorId) {
      return (
        [...byId.values()].find(
          (a) => a.marketId === marketId && a.vendorId === vendorId
        ) ?? null
      );
    },

    async updateStatus(id, status) {
      const application = byId.get(id);
      application.status = status;
      return application;
    },
  };
}
