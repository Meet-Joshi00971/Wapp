import express from "express";
import axios from "axios";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

// ✅ Deduplication set to avoid repeated replies
const processedMessages = new Set();

app.post("/webhook", async (req, res) => {
  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const phone_number_id =
    body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  if (message?.type === "text") {
    const from = message.from;
    const msgBody = message.text?.body?.toLowerCase();
    const messageId = message.id;

    // ✅ Prevent duplicate processing
    if (processedMessages.has(messageId)) {
      return res.sendStatus(200);
    }
    processedMessages.add(messageId);
    setTimeout(() => processedMessages.delete(messageId), 5 * 60 * 1000); // Auto-remove after 5 mins

    if (msgBody && (msgBody.includes("hello") || msgBody.includes("hi"))) {
      // ✅ Send sticker
      await axiios.post(
        `https://graph.facebook.com/v18.0/${phone_number_id}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: template,
          template:{
            name: welcome_custom,
            language:{
              code: en
            },
          },
          context: {
            message_id: messageId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
          },
        }
      );
    } else {
      // ✅ Echo back message
      await axios.post(
        `https://graph.facebook.com/v18.0/${phone_number_id}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: {
            body: "Echo: " + msgBody + "\nIs this what you said?",
          },
          context: {
            message_id: messageId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
          },
        }
      );
    }

    // ✅ Mark as read
    await axios.post(
      `https://graph.facebook.com/v18.0/${phone_number_id}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
      }
    );
  }

  res.sendStatus(200); // Always acknowledge
});

// ✅ Sticker sending function
async function sendSticker(phone_number_id, to) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "sticker",
        sticker: { id: "702277402674796" }, // Replace with your uploaded sticker's media ID
      }),
    }
  );

  const result = await response.json();
  console.log("Sticker send result:", result);
}

// ✅ Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.\nCheckout README.md to start.</pre>`);
});

app.listen(PORT || 3000, () => {
  console.log(`Server is listening on port: ${PORT || 3000}`);
});
