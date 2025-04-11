// login fun
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
let password = prompt("sign in to access this page", "0000")

if(password != null && password != "") {
  login("web-client", password).then((token) => {
    // Connect to the Socket.IO server
    const socket = io("http://localhost:8080", {auth: {token}});

    // WebSocket connection event
    socket.on("connect", () => {
      console.log(" ✔ Connected to the Socket server");
    });

    // On receiving message from the server
    socket.on("statusData", (data) => {
      console.table(data);
      const dataContainer = document.getElementById("status-body");

      // Dynamically update the table rows with the data from the server
      dataContainer.innerHTML = (() => {
        let accDomElement = "";
        for (let key in data) {
          accDomElement += `<tr>
            <td>${key}</td>
            <td>${JSON.stringify(data[key])}</td>
            </tr>`;
        }
        return accDomElement;
      })();
    });
    socket.on("errorsData", (data) => {
      console.table(data);
      const dataContainer = document.getElementById("errors-body");

      // Dynamically update the table rows with the data from the server
      dataContainer.innerHTML = (() => {
        let accDomElement = "";
        for (let error of data) {
          accDomElement += `<tr>
            <td>${error.errorData}</td>
            <td>${(new Date(error.timeStamp)).toLocaleString()}</td>
            </tr>`;
        }
        return accDomElement;
      })();
    });
    socket.on("carConnection", (data) => {
      const statusElement = document.getElementById("connection-status");
      statusElement.style.backgroundColor = data.connect ? "green" : "red";
    });

    // WebSocket error event
    socket.on("error", (error) => {
      console.error("Socket Error:", error);
    });

    // WebSocket connection close event
    socket.on("disconnect", () => {
      console.log(" ✖ Socket connection closed");
    });
  })
}
