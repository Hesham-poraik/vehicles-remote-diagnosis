const WebSocket = require("websocket").w3cwebsocket;
const fetch = require("node-fetch");

const generateStatus = () => {
  const obj = {};
  for (let i = 1; i <= 20; i++) {
    obj[i] = Math.floor(Math.random() * 1000);
  }
  return obj;
};

const generateError = () => Math.floor(Math.random() * 1000000000);

async function login(username, password) {
  const response = await fetch("http://localhost:8080/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (response.ok) {
    const data = await response.json();
    return data.token;
  } else {
    const error = await response.json();
    console.error("Login failed:", error);
    process.exit(1);
  }
}

login("car-client", "0000").then(async (token) => {
  const ws = new WebSocket("ws://localhost:8080");

  const sendIfConnected = (payload) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({...payload, token}));
    } else {
      console.warn("⚠ WebSocket not ready, skipping send");
    }
  };

  ws.onopen = () => {
    console.log("✔ Connected to WebSocket server");

    sendIfConnected({ type: "auth" });
    // after Auth
    sendIfConnected({ type: "updateStatus", data: generateStatus() });
    sendIfConnected({ type: "logError", data: generateError() });

    setInterval(() => {
      sendIfConnected({ type: "updateStatus", data: generateStatus() });
    }, 2000);

    setInterval(() => {
      sendIfConnected({ type: "logError", data: generateError() });
    }, 6000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("✖ WebSocket connection closed");
  };
});
