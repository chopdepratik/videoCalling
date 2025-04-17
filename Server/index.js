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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send offer
  socket.on("send-offer", ({ offer, to }) => {
    io.to(to).emit("receive-offer", { offer, from: socket.id });
  });

  // Send answer
  socket.on("send-answer", ({ answer, to }) => {
    io.to(to).emit("receive-answer", { answer, from: socket.id });
  });

  // ICE candidate exchange
  socket.on("send-ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("receive-ice-candidate", { candidate, from: socket.id });
  });

  // Join room
  socket.on("join", () => {
    socket.broadcast.emit("user-joined", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
