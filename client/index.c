#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketClient.h>
#include <ArduinoJson.h>

const char* ssid     = "abdelrahman";
const char* password = "eng2512003";

char path[] = "/";
char host[] = "192.168.1.13:8080";

WebSocketClient webSocketClient;
WiFiClient client;

String token = "";

void sendWebSocket(String type, String payload) {
  String fullPayload = String("{\"type\":\"") + type + "\",\"token\":\"" + token + "\"" + payload + "}";
  Serial.println(fullPayload);
  webSocketClient.sendData(fullPayload);
}

void setup() {
  Serial.begin(115200);
  delay(10);

  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  delay(1000);

  // --- Step 1: Send POST to get token ---
  HTTPClient http;

  String url = String("http://") + host + "/login";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String jsonData = "{\"username\":\"car-client\",\"password\":\"0000\"}";
  int httpResponseCode = http.POST(jsonData);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      token = doc["token"].as<String>();
      Serial.println("Token Only: " + token);
    } else {
      Serial.print("JSON parsing error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.println("POST request failed. Code: " + String(httpResponseCode));
  }

  http.end();

  // --- Step 2: Connect to WebSocket server ---
  if (client.connect("192.168.1.13", 8080)) {
    Serial.println("Connected to WebSocket server");
  } else {
    Serial.println("WebSocket connection failed");
    while (1);  // Stop execution
  }

  webSocketClient.path = path;
  webSocketClient.host = host;

  if (webSocketClient.handshake(client)) {
    Serial.println("WebSocket handshake successful");
    sendWebSocket("auth", "");
  } else {
    Serial.println("WebSocket handshake failed");
    while (1);  // Stop execution
  }
}

void loop() {
  if (client.connected()) {
    String updateStatus = "{\"1\":277,\"2\":131,\"3\":317,\"4\":97,\"5\":711}";
    sendWebSocket("updateStatus", ",\"data\":" + updateStatus);

    String logError = "{\"6\":277,\"7\":131,\"8\":317}";
    sendWebSocket("logError", ",\"data\":" + logError);

  } else {
    Serial.println("WebSocket client disconnected.");
    while (1);  // Stop if disconnected
  }

  delay(3000);
}
