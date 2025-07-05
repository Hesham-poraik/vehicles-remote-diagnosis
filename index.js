const express = require("express");
const http = require("http");
var WebSocketServer = require("websocket").server;
const jwt = require("jsonwebtoken");
const hand = require("express-async-handler");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

// Create an Express app
const app = express();

// apply middlewares
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(express.static("public"));

// Create HTTP server using Express
const server = http.createServer(app);

// Shared data between clients
let statusData = {};
let errorsData = [];
let carClient = null;
let webClient = null;

// login route to auth clients
app.post("/login", hand(async (req, res) => {
  const { username, password } = req.body;
  
  if((username === "web-client" && webClient) || (username === "car-client" && carClient)) {
    return res.status(403).json({ error: "server work with another client" });
  } 

  if((username === "web-client" && password === "0000") || (username === "car-client" && password === "0000")) {
    // create JWT token
    const token = jwt.sign({clientName: username}, process.env.JWT_SECRET);
    return res.json({ token });
  }
  // If authentication fails
  return res.status(401).json({ error: "Invalid credentials" });
}));

// 404 error
app.use((req, res) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// Create websocket server
const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

wsServer.on("request", function (request) {
  const connection = request.accept(null, request.origin);

  connection.on("message", function (message) {
    if (message.type === "utf8") {
      try {
        const data = JSON.parse(message.utf8Data);
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        // check your auth
        if (data.type === "auth") {
          connection.clientType = decoded.clientName;

          // save client
          if (connection.clientType === "car-client") {
            carClient = connection;

            // send data now
            connection.sendUTF(JSON.stringify({ type: "webConnection", data: { connect: Boolean(webClient) } }));
          } else if (connection.clientType === "web-client") {
            webClient = connection;
            
            // send data now
            connection.sendUTF(JSON.stringify({ type: "statusData", data: statusData }));
            connection.sendUTF(JSON.stringify({ type: "errorsData", data: errorsData }));
            connection.sendUTF(JSON.stringify({ type: "carConnection", data: { connect: Boolean(carClient) } }));
          }

          // send connection status to all clients
          broadcast({ type: `${connection.clientType === "car-client" ? "car" : "web"}Connection`, data: { connect: true } });

        } else if (data.type === "updateStatus" && connection.clientType === "car-client") {
          statusData = data.data;
          broadcast({ type: "statusData", data: statusData });

        } else if (data.type === "logError" && connection.clientType === "car-client") {
          errorsData.push({ errorData: data.data, timeStamp: Date.now() });
          broadcast({ type: "errorsData", data: errorsData });
        }
      } catch (err) {
        console.error("Invalid message or JWT:", err.message);
        connection.sendUTF(JSON.stringify({ type: "error", message: "Unauthorized or bad format" }));
        connection.close();
      }
    }
  });

  connection.on("close", () => {
    if (connection.clientType === "car-client") {
      carClient = null;
      broadcast({ type: "carConnection", data: { connect: false } });
    } else if (connection.clientType === "web-client") {
      webClient = null;
      broadcast({ type: "webConnection", data: { connect: false } });
    }
  });
});

// fun to send broadcast messages
function broadcast(messageObj) {
  [carClient, webClient].forEach(client => {
    if (client && client.connected) {
      client.sendUTF(JSON.stringify(messageObj));
    }
  });
}

// Start the server on port 8080
const port = process.env.PORT || 8080;
server.listen(8080, () => {
  console.log(` ✔ Server running on http://localhost:${port}`);
});
