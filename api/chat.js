export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed",
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages must be an array",
      });
    }

    // Read API key from .env / Vercel Environment Variables
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("GROQ_API_KEY is missing");

      return res.status(500).json({
        error: "GROQ_API_KEY is not configured",
      });
    }

    console.log("Groq API request received");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          // Current supported production model
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",

              content: `
You are Nalam Super AI Bot, the medical information assistant for Nalam Clinic.

Your job is to help users understand their symptoms and provide general medical guidance.

IMPORTANT RULES:

1. If the user simply says hello, hi, hey, good morning, etc., respond naturally and warmly.
   Example:
   "Hello! 👋 I'm Nalam Super AI Bot. How can I help you today?"

2. Do NOT assume the user is sick just because they opened the chatbot.

3. Do NOT immediately give medical advice when the user only greets you.

4. Never claim to provide a definite diagnosis.

5. Ask useful follow-up questions about symptoms.

6. If symptoms may be an emergency, clearly tell the user to seek emergency medical care.

7. Do not provide prescription medication dosages.

8. Keep responses clear and easy to understand.

9. Respond naturally to normal conversation.

10. For medical symptoms, provide general information and encourage professional medical evaluation when appropriate.
`,
            },

            ...messages,
          ],

          temperature: 0.3,

          max_completion_tokens: 600,
        }),
      },
    );

    const data = await groqResponse.json();

    console.log("Groq status:", groqResponse.status);

    if (!groqResponse.ok) {
      console.error("Groq error:", data);

      return res.status(groqResponse.status).json({
        error: data?.error?.message || "Groq API request failed",

        details: data,
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({
        error: "Groq returned an empty response",
      });
    }

    return res.status(200).json({
      success: true,

      response: answer,
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
