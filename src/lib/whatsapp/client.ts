export async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("Missing WhatsApp environment variables");
    return;
  }

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send WhatsApp message:", errorData);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}
