const express = require("express");
const cors = require("cors");
const app = express();
const socket = require("socket.io");
const corsOptions = require("./config/corsOptions");
const errorHandler = require("./middleware/errorHandler");
const SessionStore = require("./model/SessionStore");
const { v4: uuid } = require("uuid");

app.use(cors(corsOptions));
app.use(express.json());

app.use(errorHandler);

const server = app.listen(3500, () => {
	console.log("Server listening on port 3500.");
});

const io = socket(server, {
	cors: {
		origin: ["http://localhost:3000", "http://127.0.0.1:5173"],
	},
});

// create session store
const sessionStore = new SessionStore();

io.use((socket, next) => {
	// console.log("all session", sessionStore.getAllSessions());

	const sessionId = socket.handshake.auth?.sessionId;
	if (sessionId) {
		// find existing session
		const session = sessionStore.findSession(sessionId);
		// console.log("found session", { session });

		if (session) {
			socket.sessionId = sessionId;
			socket.userId = session.userId;
			socket.username = session.username;

			console.log("found session return");

			return next();
		}
	}

	const username = socket.handshake.auth?.username;

	if (!username) {
		// console.log("invalid username");
		return next(new Error("Invalid username!"));
	}

	// create new session
	socket.sessionId = uuid();
	socket.userId = uuid();
	socket.username = username;
	next();
});

io.on("connection", (socket) => {
	console.log({ userId: socket.userId, username: socket.username });
	// save session
	sessionStore.saveSession(socket.sessionId, {
		userId: socket.userId,
		username: socket.username,
		active: true,
	});

	// emit session event
	socket.emit("session", {
		username: socket.username,
		userId: socket.userId,
		sessionId: socket.sessionId,
	});

	// join the 'userId' room
	socket.join(socket.userId);

	// setting users
	const users = [];
	sessionStore.getAllSessions().forEach((session) => {
		users.push({
			userId: session.userId,
			username: session.username,
			active: session.active,
		});
	});

	console.log(`New user ${socket.userId} connected!`);

	// update users list
	socket.emit("user_list", users);

	// notify other users
	socket.broadcast.emit("new_user", {
		userId: socket.userId,
		username: socket.username,
		active: true,
	});

	socket.on("send_msg", (msg) => {
		// console.log(msg);
		// message to both recipient and sender
		socket.to(msg.from).to(msg.userId).emit("recieve_msg", msg);
	});

	// remove users on disconnect
	socket.on("disconnect", async () => {
		// io.in(...).allSockets() return the list of all socket ids connected to this id
		const matchingSockets = await io.in(socket.userId).allSockets();

		// check all the sockets are disconnected
		const isDisconnected = matchingSockets.size === 0;
		console.log({ userId: socket.userId, isDisconnected });

		if (isDisconnected) {
			// notify other users
			socket.broadcast.emit("user_disconnected", socket.userId);

			// update session
			sessionStore.saveSession(socket.sessionId, {
				userId: socket.userId,
				username: socket.username,
				active: false,
			});
		}
	});
});
