import "dotenv/config";
import http from "http";
import app from "./src/app.js"
import connectDB from "./src/common/config/db.js"
import { initSocket } from "./src/common/config/socket-io.js";
import { registerPollHandlers } from "./src/modules/poll/poll.sockets.js";

const PORT = process.env.PORT || 4000

const server = http.createServer(app);

const io = initSocket(server);

io.on("connection", (socket) => {
    console.log("[socket] connected", {
        socketId: socket.id,
        transport: socket.conn.transport.name,
        address: socket.handshake.address,
    });
    
    registerPollHandlers(io, socket);

    socket.on("disconnect", (reason) => {
        console.log("[socket] disconnected", {
            socketId: socket.id,
            reason,
        });
    })
})

const start = async () => {
    // connect to database
    await connectDB()
    server.listen(PORT, () => {
        console.log(`Server is running at ${PORT} in ${process.env.NODE_ENV} mode`)
    })
}

start().catch((err) => {
    console.error("Failed to start server", err)
    process.exit(1)
})
