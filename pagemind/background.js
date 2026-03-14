// background.js - Service worker for PageMind AI

chrome.runtime.onInstalled.addListener(() => {
  console.log("PageMind AI installed.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callGemini") {
    callGroqAPI(request.apiKey, request.prompt, request.history)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function callGroqAPI(apiKey, prompt, history = []) {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const messages = [];

  // Add history
  for (const turn of history) {
    messages.push({
      role: turn.role === "model" ? "assistant" : turn.role,
      content: turn.text
    });
  }

  // Add current prompt
  messages.push({ role: "user", content: prompt });

  const body = {
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.7,
    max_tokens: 1024
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}
