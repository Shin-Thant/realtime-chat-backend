class SessionStore {
	constructor() {
		this.session = new Map();
	}

	findSession(id) {
		return this.session.get(id);
	}

	saveSession(id, session) {
		this.session.set(id, session);
	}

	getAllSessions() {
		return [...this.session.values()];
	}
}

module.exports = SessionStore;
