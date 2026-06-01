require("dotenv").config();

const mqtt = require("mqtt");
const deviceService = require("./deviceService");

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

const MQTT_SENSOR_TOPIC = process.env.MQTT_SENSOR_TOPIC || "mushroom/+/sensor";
const MQTT_STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC || "mushroom/+/status";
const MQTT_COMMAND_BASE_TOPIC = process.env.MQTT_COMMAND_BASE_TOPIC || "mushroom";

const mqttClient = mqtt.connect(MQTT_HOST, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  rejectUnauthorized: false,
});

mqttClient.on("connect", () => {
  console.log("MQTT connected");

  mqttClient.subscribe(MQTT_SENSOR_TOPIC, (err) => {
    if (err) {
      console.log("Subscribe sensor topic failed:", err.message);
    } else {
      console.log("Subscribed sensor topic:", MQTT_SENSOR_TOPIC);
    }
  });

  mqttClient.subscribe(MQTT_STATUS_TOPIC, (err) => {
    if (err) {
      console.log("Subscribe status topic failed:", err.message);
    } else {
      console.log("Subscribed status topic:", MQTT_STATUS_TOPIC);
    }
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    const topicParts = topic.split("/");
    const deviceNameFromTopic = topicParts[1];

    payload.deviceId = payload.deviceId || deviceNameFromTopic;

    console.log("MQTT message:", topic, payload);

    if (topic.endsWith("/sensor")) {
      await deviceService.saveMqttSensorData(payload);
    }

    if (topic.endsWith("/status")) {
      await deviceService.saveMqttStatusData(payload);
    }
  } catch (error) {
    console.log("MQTT message error:", error.message);
  }
});

mqttClient.on("error", (err) => {
  console.log("MQTT error:", err.message);
});

const publishCommand = async ({ deviceName, device, action }) => {
  return new Promise((resolve, reject) => {
    const commandTopic = `${MQTT_COMMAND_BASE_TOPIC}/${deviceName}/command`;

    const payload = {
      device,
      action,
    };

    mqttClient.publish(
      commandTopic,
      JSON.stringify(payload),
      { qos: 1 },
      (err) => {
        if (err) {
          return reject(err);
        }

        console.log("Command published:", commandTopic, payload);

        resolve({
          topic: commandTopic,
          payload,
        });
      }
    );
  });
};

module.exports = {
  mqttClient,
  publishCommand,
};