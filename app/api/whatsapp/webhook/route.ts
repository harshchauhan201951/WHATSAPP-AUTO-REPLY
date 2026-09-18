import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";

function getReply(message: string): string {
  const text = message.trim().toLowerCase();

  if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("नमस्ते") ||
    text.includes("हेलो")
  ) {
    return `नमस्ते! 👋

आपका स्वागत है।

कृपया बताएं आपको किस जानकारी की आवश्यकता है?

1. फीस
2. एडमिशन
3. क्लास टाइमिंग
4. अन्य जानकारी`;
  }

  if (
    text.includes("fee") ||
    text.includes("fees") ||
    text.includes("फीस")
  ) {
    return `फीस की जानकारी के लिए कृपया विद्यार्थी की Class बताएं।

उदाहरण:
Class 5
Class 8
Class 10`;
  }

  if (
    text.includes("admission") ||
    text.includes("एडमिशन") ||
    text.includes("admission")
  ) {
    return `एडमिशन की जानकारी के लिए कृपया विद्यार्थी की Class बताएं।`;
  }

  if (
    text.includes("time") ||
    text.includes("timing") ||
    text.includes("टाइम") ||
    text.includes("टाइमिंग")
  ) {
    return `कृपया विद्यार्थी की Class बताएं, ताकि आपको सही class timing बताई जा सके।`;
  }

  return `नमस्ते! 👋

आपका संदेश प्राप्त हो गया है।

कृपया बताएं आपको किस जानकारी की आवश्यकता है:

1. फीस
2. एडमिशन
3. क्लास टाइमिंग
4. अन्य जानकारी`;
}

async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<void> {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("WhatsApp environment variables are missing.");
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API error:", result);
    throw new Error("Failed to send WhatsApp message.");
  }

  console.log("WhatsApp message sent:", result);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    VERIFY_TOKEN &&
    token === VERIFY_TOKEN
  ) {
    console.log("WhatsApp webhook verified successfully.");
    return new NextResponse(challenge || "", { status: 200 });
  }

  return NextResponse.json(
    { error: "Webhook verification failed." },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("WhatsApp webhook received:", JSON.stringify(body));

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ success: true });
    }

    const from = message.from;
    const messageType = message.type;

    if (!from) {
      return NextResponse.json({ success: true });
    }

    if (messageType !== "text") {
      await sendWhatsAppMessage(
        from,
        "नमस्ते! फिलहाल कृपया अपना संदेश Text के रूप में भेजें।"
      );

      return NextResponse.json({ success: true });
    }

    const incomingText = message.text?.body || "";

    console.log(`Message from ${from}: ${incomingText}`);

    const reply = getReply(incomingText);

    await sendWhatsAppMessage(from, reply);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}