export class ProfileError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ProfileError';
    this.status = status;
  }
}

const VENDOR_FIELDS = ['businessName', 'category', 'bio', 'website'];
const HOST_FIELDS = ['orgName', 'bio', 'website'];

export function createProfileService({ profiles }) {
  return {
    async get(actor) {
      const profile = await profiles.get(actor.id);
      return profile ?? { userId: actor.id, role: actor.role };
    },

    async upsert(actor, data = {}) {
      const allowed = actor.role === 'vendor' ? VENDOR_FIELDS : HOST_FIELDS;
      const fields = {};
      for (const key of allowed) {
        if (data[key] !== undefined) fields[key] = data[key];
      }
      if (
        actor.role === 'vendor' &&
        data.businessName !== undefined &&
        !String(data.businessName).trim()
      ) {
        throw new ProfileError('businessName cannot be empty');
      }
      return profiles.upsert(actor.id, actor.role, fields);
    },
  };
}
