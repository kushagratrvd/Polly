export const registerPollHandlers = (io, socket) => {
  socket.on("join-poll-room", (pollId) => {
    socket.join(pollId);
    console.log("[socket] joined poll room", {
      socketId: socket.id,
      pollId,
    });
  });

  socket.on("leave-poll-room", (pollId) => {
    socket.leave(pollId);
    console.log("[socket] left poll room", {
      socketId: socket.id,
      pollId,
    });
  })
}
