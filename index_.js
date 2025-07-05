const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const hand = require("express-async-handler");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

// Create an Express app
const app = express();

// apply middlewares
app.use(express.json());
// security middlewares
app.use(helmet());
app.use(cors());

// Create HTTP server using Express
const server = http.createServer(app);

// Create Socket.IO server
const io = socketIo(server, {cors: { origin: "*" }});

// Shared data between clients
let statusData = {};
let errorsData = [];
let carClient = null;
let webClient = null;

// Serve static files (HTML, CSS, JS)
app.use(express.static("public"));

// login route to auth clients
app.post("/login", hand(async (req, res) => {
  const { username, password } = req.body;

  if((username === "web-client" && password === "0000") || (username === "car-client" && password === "0000")) {
    // create JWT token
    const token = jwt.sign({clientName: username}, process.env.JWT_SECRET);
    return res.json({ token });
  }
  // If authentication fails
  return res.status(401).json({ error: "Invalid credentials" });
}));

// notfound middleware
app.use((req, res) => {
  res.status(404).json({message: `Not Found - ${req.originalUrl}`});
})

// Authentication middleware to validate JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) {
      return next(new Error("Authentication error"));
    }
    socket.clientType = decoded.clientName;
    next();
  });
});


// When a new client connects
io.on("connection", (socket) => {
  if(socket.clientType === "web-client") {
    webClient = socket;
    socket.emit("statusData", statusData);
    socket.emit("errorsData", errorsData);
    socket.emit("carConnection", {connect: Boolean(carClient)});
    io.emit("webConnection", {connect: true});
  } else if(socket.clientType === "car-client") {
    carClient = socket;
    socket.emit("webConnection", {connect: Boolean(webClient)});
    io.emit("carConnection", {connect: true});
  }

  // When car-client update status
  socket.on("updateStatus", (newStatus) => {
    // authorize credentials
    if(socket.clientType !== "car-client") return next(new Error("Authentication error"));

    // update statusData value
    statusData = newStatus;

    // Broadcast the updated status data to all clients
    io.emit("statusData", statusData);
  });

  // When car-client log new error
  socket.on("logError", (logs) => {
    // authorize credentials
    if(socket.clientType !== "car-client") return next(new Error("Authentication error"));

    errorsData.push({errorData: logs, timeStamp: Date.now()});

    // Broadcast the updated status data to all clients
    io.emit("errorsData", errorsData);
  });

  // When a client disconnects
  socket.on("disconnect", () => {
    if(socket.clientType === "car-client") {
      carClient = null;
      io.emit("carConnection", {connect: false});
    } else if (socket.clientType === "web-client") {
      webClient = null;
      io.emit("webConnection", {connect: false});
    }
  });
});

// Start the server on port 8080
const port = process.env.PORT || 8080;
server.listen(8080, () => {
  console.log(` ✔ Server running on http://localhost:${port}`);
});
