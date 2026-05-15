import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
      methods: ["GET", "POST"],
    }
  });
  return io;
};

export const getIO = () => {
  if(!io){
    throw new Error("Socket.io is not initialised!");
  }
  return io;
}
