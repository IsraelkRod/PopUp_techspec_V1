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
