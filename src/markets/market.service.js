export class MarketError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'MarketError';
    this.status = status;
  }
}

export function createMarketService({ markets, applications }) {
  async function getMarketOr404(id) {
    const market = await markets.getMarket(id);
    if (!market) throw new MarketError('Market not found', 404);
    return market;
  }

  async function requireOwnedMarket(actor, marketId) {
    const market = await getMarketOr404(marketId);
    if (market.hostId !== actor.id) {
      throw new MarketError('You do not own this market', 403);
    }
    return market;
  }

  return {
    // Host starts a project (creates a market).
    async createMarket(actor, { name, location } = {}) {
      if (actor.role !== 'host') {
        throw new MarketError('Only hosts can create markets', 403);
      }
      if (!name || !name.trim()) {
        throw new MarketError('Market name is required');
      }
      return markets.createMarket({
        hostId: actor.id,
        name: name.trim(),
        location: location ?? null,
      });
    },

    async listMarkets() {
      return markets.listMarkets();
    },

    async getMarket(id) {
      const market = await getMarketOr404(id);
      const events = await markets.listEvents(id);
      return { ...market, events };
    },

    // Host lists an event date on their market.
    async addEvent(actor, marketId, { startsAt, endsAt } = {}) {
      const market = await requireOwnedMarket(actor, marketId);
      if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
        throw new MarketError('A valid startsAt timestamp is required');
      }
      if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
        throw new MarketError('endsAt must be after startsAt');
      }
      return markets.addEvent({
        marketId: market.id,
        startsAt,
        endsAt: endsAt ?? null,
      });
    },

    async listEvents(marketId) {
      await getMarketOr404(marketId);
      return markets.listEvents(marketId);
    },

    // Vendor applies to a market (enters the funnel).
    async apply(actor, marketId, { note } = {}) {
      if (actor.role !== 'vendor') {
        throw new MarketError('Only vendors can apply to markets', 403);
      }
      await getMarketOr404(marketId);
      if (await applications.findByMarketAndVendor(marketId, actor.id)) {
        throw new MarketError('You have already applied to this market', 409);
      }
      return applications.create({
        marketId,
        vendorId: actor.id,
        note: note ?? null,
      });
    },

    async listApplications(actor, marketId) {
      await requireOwnedMarket(actor, marketId);
      return applications.listByMarket(marketId);
    },

    // Host approves or rejects a vendor application.
    async decide(actor, marketId, applicationId, decision) {
      await requireOwnedMarket(actor, marketId);
      if (!['approved', 'rejected'].includes(decision)) {
        throw new MarketError('decision must be "approved" or "rejected"');
      }
      const application = await applications.getById(applicationId);
      if (!application || application.marketId !== marketId) {
        throw new MarketError('Application not found', 404);
      }
      return applications.updateStatus(applicationId, decision);
    },
  };
}
