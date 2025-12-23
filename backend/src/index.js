import "./config/env.js";
import { createServer } from "http";
import { Server } from "socket.io";

import { app } from "./app.js";
import connectDB from "./db/connectDB.js";
import { socketAuthMiddleware } from "./middlewares/socketAuth.middleware.js";
import { socketHandler } from "./socket/socket.handler.js";

const PORT = process.env.PORT || 8000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
});

io.use(socketAuthMiddleware);
socketHandler(io);

httpServer.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running on ${PORT}`);
});
