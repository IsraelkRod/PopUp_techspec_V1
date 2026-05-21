export class MarketError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'MarketError';
    this.status = status;
  }
}

// notifications is optional; a no-op default keeps the service usable in isolation.
const noopNotifications = { async create() {} };

export function createMarketService({
  markets,
  applications,
  notifications = noopNotifications,
}) {
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
      const event = await markets.addEvent({
        marketId: market.id,
        startsAt,
        endsAt: endsAt ?? null,
      });

      // Notify everyone who applied to this market about the new date.
      const applicants = await applications.listByMarket(marketId);
      for (const a of applicants) {
        await notifications.create({
          userId: a.vendorId,
          type: 'event.added',
          message: `New date listed for "${market.name}"`,
          data: { marketId: market.id, eventId: event.id },
        });
      }
      return event;
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
      const market = await getMarketOr404(marketId);
      if (await applications.findByMarketAndVendor(marketId, actor.id)) {
        throw new MarketError('You have already applied to this market', 409);
      }
      const application = await applications.create({
        marketId,
        vendorId: actor.id,
        note: note ?? null,
      });

      // Notify the host of the new application.
      await notifications.create({
        userId: market.hostId,
        type: 'application.received',
        message: `New vendor application to "${market.name}"`,
        data: { marketId: market.id, applicationId: application.id },
      });
      return application;
    },

    async listApplications(actor, marketId) {
      await requireOwnedMarket(actor, marketId);
      return applications.listByMarket(marketId);
    },

    // Host approves or rejects a vendor application.
    async decide(actor, marketId, applicationId, decision) {
      const market = await requireOwnedMarket(actor, marketId);
      if (!['approved', 'rejected'].includes(decision)) {
        throw new MarketError('decision must be "approved" or "rejected"');
      }
      const application = await applications.getById(applicationId);
      if (!application || application.marketId !== marketId) {
        throw new MarketError('Application not found', 404);
      }
      const updated = await applications.updateStatus(applicationId, decision);

      // Notify the vendor of the decision.
      await notifications.create({
        userId: application.vendorId,
        type: 'application.decision',
        message: `Your application to "${market.name}" was ${decision}`,
        data: { marketId: market.id, applicationId, decision },
      });
      return updated;
    },

    // Host dashboard: each of the host's markets with event + application counts.
    async hostOverview(actor) {
      if (actor.role !== 'host') {
        throw new MarketError('Only hosts have an overview', 403);
      }
      const owned = await markets.listByHost(actor.id);
      const rows = [];
      for (const m of owned) {
        const events = await markets.listEvents(m.id);
        const apps = await applications.listByMarket(m.id);
        const applicationCounts = { pending: 0, approved: 0, rejected: 0 };
        for (const a of apps) {
          applicationCounts[a.status] = (applicationCounts[a.status] ?? 0) + 1;
        }
        rows.push({
          id: m.id,
          name: m.name,
          status: m.status,
          eventCount: events.length,
          applicationCounts,
        });
      }
      return { markets: rows, totals: { markets: rows.length } };
    },
  };
}
