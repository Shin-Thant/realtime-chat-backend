class MessageStore {
	constructor() {
		this.messages = [];
	}

	saveMessage(message) {
		this.messages.push(message);
	}

	findMessagesPerUser(userId) {
		return this.messages.filter(
			({ userId: to, from }) => to === userId || from === userId
		);
	}
}

module.exports = MessageStore;
