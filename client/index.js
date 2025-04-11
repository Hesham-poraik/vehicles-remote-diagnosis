const io = require("socket.io-client");

const generateStatus = () => {
  const obj = {};
  for(let i = 1;i <= 20;i++) {
    obj[i] = Math.floor(Math.random() * 1000)
  }
  return obj;
};

const generateError = () => Math.floor(Math.random() * 1000000000);

async function login(username, password) {
  const response = await fetch("http://localhost:8080/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password })
  });
  if (response.ok) {
    const data = await response.json();
    return data.token;
  } else {
    const error = await response.json();
    navigator.reload();
  }
};

// Connect to the Socket.IO server
login("car-client", "0000").then((token) => {
  const socket = io("http://localhost:8080", { auth: { token } });

  // WebSocket connection event
  socket.on("connect", () => {
    console.log(" ✔ Connected to the Socket server");
  
    // Update data and send it to the server
    socket.emit("updateStatus", generateStatus());
    setInterval(() => {
      socket.emit("updateStatus", generateStatus());
    }, 20_000);

    socket.emit("logError", generateError());
    setInterval(() => {
      socket.emit("logError", generateError());
    }, 60_000);
  });

  // web client connection
  socket.on("webConnection", (data) => {
    console.log("web connection state is: " + data.connect);
  });
  
  // WebSocket error event
  socket.on("error", (error) => {
    console.error("Socket Error:", error);
  });
  
  // WebSocket connection close event
  socket.on("disconnect", () => {
    console.log(" ✖ Socket connection closed");
  });
});
