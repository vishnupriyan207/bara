const NALAM_SYSTEM_PROMPT = `You are Nalam Super AI Bot, the medical information assistant for Nalam Clinic.
Your job is to help users understand their symptoms and provide general medical guidance.
IMPORTANT RULES:
If the user simply says hello, hi, hey, good morning, etc., respond naturally and warmly.
Do NOT assume the user is sick just because they opened the chatbot.
Do NOT immediately give medical advice when the user only greets you.
Never claim to provide a definite diagnosis.
Ask useful follow-up questions about symptoms.
If symptoms may be an emergency, clearly tell the user to seek emergency medical care.
Do not provide prescription medication dosages.
Keep responses clear and easy to understand.
Respond naturally to normal conversation.
For medical symptoms, provide general information and encourage professional medical evaluation when appropriate.`;

/**
 * Sends conversation messages to Groq API and returns assistant's response.
 * @param {Array<{role: string, content: string}>} conversationMessages
 * @returns {Promise<string>}
 */
const getGroqChatCompletion = async (conversationMessages) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[GroqService] ERROR: GROQ_API_KEY is not configured in backend .env');
    const err = new Error('AI service configuration missing on server');
    err.isGroqError = true;
    throw err;
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  // Build the message array with Nalam system prompt first
  const messages = [
    { role: 'system', content: NALAM_SYSTEM_PROMPT },
    ...conversationMessages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }))
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_completion_tokens: 600
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GroqService] API Error:', response.status, errorData);
      const err = new Error('Groq AI API returned an error');
      err.isGroqError = true;
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;

    if (!answer || answer.trim() === '') {
      console.error('[GroqService] Received empty content from Groq');
      const err = new Error('Groq returned an empty response');
      err.isGroqError = true;
      throw err;
    }

    return {
      content: answer.trim(),
      model
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[GroqService] Request timed out after 30 seconds');
    } else {
      console.error('[GroqService] Execution failure:', error.message);
    }
    const safeError = new Error('The AI service is temporarily unavailable. Please try again.');
    safeError.isGroqError = true;
    throw safeError;
  }
};

module.exports = {
  getGroqChatCompletion,
  NALAM_SYSTEM_PROMPT
};
