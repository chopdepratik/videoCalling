const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all for testing
  }
});

// Keep track of connected users
const users = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Add to list and tell this client who else is here
  users.push(socket.id);
  socket.emit("all-users", users.filter(id => id !== socket.id));

  // When someone disconnects, remove them
  socket.on("disconnect", () => {
    const idx = users.indexOf(socket.id);
    if (idx !== -1) users.splice(idx, 1);
  });

  // Offer / Answer / ICE as before:
  socket.on("send-offer", ({ offer, to }) => {
    io.to(to).emit("receive-offer", { offer, from: socket.id });
  });

  socket.on("send-answer", ({ answer, to }) => {
    io.to(to).emit("receive-answer", { answer, from: socket.id });
  });

  socket.on("send-ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("receive-ice-candidate", { candidate, from: socket.id });
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
