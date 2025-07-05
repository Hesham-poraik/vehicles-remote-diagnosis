const generateTable = (data) => {
  let rows = "";
  for (let key in data) {
    rows += `<tr>
        <td>${key}</td>
        <td>${JSON.stringify(data[key])}</td>
      </tr>`;
  }
  return rows;
};

const generateErrors = (errors) => {
  let rows = "";
  for (let error of errors) {
    rows += `<tr>
        <td>${error.errorData}</td>
        <td>${new Date(error.timeStamp).toLocaleString()}</td>
      </tr>`;
  }
  return rows;
};

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
    const err = await response.json();
    alert(err.error || "Login failed");
    location.reload();
  }
}

const password = prompt("sign in to access this page", "0000");

if (password != null && password !== "") {
  login("web-client", password).then((token) => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("✔ Connected to WebSocket server");
      socket.send(JSON.stringify({ type: "auth", token }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "statusData") {
          console.log("📦 statusData:", msg.data);
          document.getElementById("status-body").innerHTML = generateTable(
            msg.data
          );
        }

        if (msg.type === "errorsData") {
          console.log("📦 errorsData:", msg.data);
          document.getElementById("errors-body").innerHTML = generateErrors(
            msg.data
          );
        }

        if (msg.type === "carConnection") {
          const statusEl = document.getElementById("connection-status");
          statusEl.style.backgroundColor = msg.data.connect ? "green" : "red";
        }

        if (msg.type === "error") {
          console.error("⚠ Server error:", msg.message);
        }
      } catch (e) {
        console.error("❌ Invalid JSON:", event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket Error:", err);
    };

    socket.onclose = () => {
      console.log("✖ WebSocket connection closed");
    };
  });
}
