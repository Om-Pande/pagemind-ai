// popup.js — PageMind AI dashboard logic

let pageContent = null;
let chatHistory = [];
let currentSummaryStyle = "concise";

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) {
    showMain();
    loadPageContent();
  } else {
    showSetup();
  }

  bindEvents();
  loadChatHistory();
});

// ── Screen Management ─────────────────────────────────────────────────────────
function showSetup() {
  document.getElementById("setup-screen").classList.remove("hidden");
  document.getElementById("main-screen").classList.add("hidden");
}

function showMain() {
  document.getElementById("setup-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");
}

// ── Page Content Extraction ───────────────────────────────────────────────────
async function loadPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Show domain
    try {
      const url = new URL(tab.url);
      document.getElementById("page-domain").textContent = url.hostname;
    } catch (_) {}

    const response = await chrome.tabs.sendMessage(tab.id, { action: "getPageContent" });

    if (response?.success) {
      pageContent = response.content;
      const titleEl = document.getElementById("page-title-display");
      titleEl.textContent = pageContent.title || tab.url;
      titleEl.title = pageContent.title || "";
    }
  } catch (e) {
    console.error("Could not get page content:", e.message);
  }
}

// ── API Call ──────────────────────────────────────────────────────────────────
async function callGemini(prompt, useHistory = false) {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) throw new Error("No API key found.");

  const history = useHistory ? chatHistory.map(m => ({ role: m.role, text: m.text })) : [];

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "callGemini", apiKey: apiKey, prompt, history },
      (response) => {
        if (response?.success) resolve(response.result);
        else reject(new Error(response?.error || "Unknown error"));
      }
    );
  });
}

// ── Summary Tab ───────────────────────────────────────────────────────────────
document.getElementById("summarize-btn").addEventListener("click", async () => {
  if (!pageContent) {
    await loadPageContent();
    if (!pageContent) return showError("Couldn't read this page. Try refreshing.");
  }

  const styleMap = {
    concise: "Write a concise 2-3 paragraph summary.",
    detailed: "Write a detailed, comprehensive summary with key points covered.",
    bullets: "Summarize as clear bullet points. Group by topic if needed.",
    eli5: "Explain this page like I'm 5 years old. Simple language, fun analogies."
  };

  const styleInstruction = styleMap[currentSummaryStyle] || styleMap.concise;
  const prompt = `You are summarizing a webpage for a user.

Page Title: ${pageContent.title}
URL: ${pageContent.url}
${pageContent.description ? `Meta Description: ${pageContent.description}` : ""}

Page Content:
${pageContent.body}

Task: ${styleInstruction}
Keep the summary focused and useful. Do not mention that you are an AI.`;

  showLoading("Summarizing...");
  try {
    const result = await callGemini(prompt);
    hideLoading();
    showSummary(result);
  } catch (e) {
    hideLoading();
    showError(e.message);
  }
});

function showSummary(text) {
  const box = document.getElementById("summary-output");
  const el = document.getElementById("summary-text");
  el.innerHTML = formatText(text);
  box.classList.remove("hidden");
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.getElementById("copy-summary").addEventListener("click", () => {
  const text = document.getElementById("summary-text").innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copy-summary");
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 2000);
  });
});

// Chip selection for summary style
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentSummaryStyle = chip.dataset.style;
  });
});

// ── Chat Tab ──────────────────────────────────────────────────────────────────
document.getElementById("chat-send-btn").addEventListener("click", sendChat);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  if (!pageContent) {
    await loadPageContent();
    if (!pageContent) return showError("Couldn't read this page. Try refreshing.");
  }

  input.value = "";
  appendChatMessage("user", text);

  // Build prompt with page context
  const systemContext = `You are a helpful assistant. The user is asking about a webpage.

Page Title: ${pageContent.title}
URL: ${pageContent.url}
Page Content:
${pageContent.body}

Answer the user's questions based on this page content. Be helpful, concise, and accurate.
If the answer isn't in the page, say so honestly.`;

  // First message gets full context injected
  const isFirstMessage = chatHistory.length === 0;
  const fullPrompt = isFirstMessage
    ? `${systemContext}\n\nUser question: ${text}`
    : text;

  chatHistory.push({ role: "user", text: isFirstMessage ? fullPrompt : text });

  showLoading("Thinking...");
  try {
    const reply = await callGemini(fullPrompt, !isFirstMessage);
    hideLoading();
    appendChatMessage("assistant", reply);
    chatHistory.push({ role: "model", text: reply });
    saveChatHistory();
  } catch (e) {
    hideLoading();
    appendChatMessage("assistant", `⚠ Error: ${e.message}`);
  }
}

function appendChatMessage(role, text) {
  const container = document.getElementById("chat-messages");

  // Remove welcome message on first real message
  const welcome = container.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  const msg = document.createElement("div");
  msg.className = `chat-msg ${role}`;
  msg.innerHTML = `<div class="msg-bubble">${formatText(text)}</div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function saveChatHistory() {
  chrome.storage.local.set({ chatHistory: JSON.stringify(chatHistory) });
}

async function loadChatHistory() {
  const { chatHistory: stored } = await chrome.storage.local.get("chatHistory");
  if (stored) {
    try {
      chatHistory = JSON.parse(stored);
      if (chatHistory.length > 0) {
        const container = document.getElementById("chat-messages");
        const welcome = container.querySelector(".chat-welcome");
        if (welcome) welcome.remove();
        // Only render visible messages (not system prompts)
        chatHistory.forEach(m => {
          if (m.role === "user" || m.role === "model") {
            const displayRole = m.role === "model" ? "assistant" : "user";
            appendChatMessage(displayRole, m.text.length > 1000 ? m.text.substring(0, 1000) + "..." : m.text);
          }
        });
      }
    } catch (_) {}
  }
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
document.getElementById("insights-btn").addEventListener("click", async () => {
  if (!pageContent) {
    await loadPageContent();
    if (!pageContent) return showError("Couldn't read this page.");
  }

  const prompt = `Analyze this webpage and provide structured insights.

Page Title: ${pageContent.title}
URL: ${pageContent.url}
Content: ${pageContent.body}

Respond ONLY with valid JSON in this exact format:
{
  "reading_time": "X min read",
  "content_type": "Article/Blog/News/Product/Documentation/Other",
  "sentiment": "Positive/Neutral/Negative/Mixed",
  "key_topics": ["topic1", "topic2", "topic3"],
  "key_facts": ["fact1", "fact2", "fact3"],
  "credibility_signals": ["signal1", "signal2"],
  "action_items": ["action1", "action2"]
}
Only return the JSON object, no extra text.`;

  showLoading("Analyzing...");
  try {
    const result = await callGemini(prompt);
    hideLoading();
    renderInsights(result);
  } catch (e) {
    hideLoading();
    showError(e.message);
  }
});

function renderInsights(raw) {
  const output = document.getElementById("insights-output");
  const cards = document.getElementById("insight-cards");
  cards.innerHTML = "";

  let data;
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    data = JSON.parse(clean);
  } catch (_) {
    cards.innerHTML = `<div class="insight-card full"><p>${formatText(raw)}</p></div>`;
    output.classList.remove("hidden");
    return;
  }

  const statsHtml = `
    <div class="insight-card stat-row">
      <div class="stat"><span class="stat-label">Reading Time</span><span class="stat-val">${data.reading_time || "—"}</span></div>
      <div class="stat"><span class="stat-label">Content Type</span><span class="stat-val">${data.content_type || "—"}</span></div>
      <div class="stat"><span class="stat-label">Sentiment</span><span class="stat-val sentiment-${(data.sentiment || "").toLowerCase()}">${data.sentiment || "—"}</span></div>
    </div>`;

  const topicsHtml = data.key_topics?.length ? `
    <div class="insight-card">
      <div class="card-label">Key Topics</div>
      <div class="tag-list">${data.key_topics.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </div>` : "";

  const factsHtml = data.key_facts?.length ? `
    <div class="insight-card">
      <div class="card-label">Key Facts</div>
      <ul class="insight-list">${data.key_facts.map(f => `<li>${f}</li>`).join("")}</ul>
    </div>` : "";

  const actionsHtml = data.action_items?.length ? `
    <div class="insight-card">
      <div class="card-label">Action Items</div>
      <ul class="insight-list actions">${data.action_items.map(a => `<li>→ ${a}</li>`).join("")}</ul>
    </div>` : "";

  const credHtml = data.credibility_signals?.length ? `
    <div class="insight-card">
      <div class="card-label">Credibility Signals</div>
      <ul class="insight-list">${data.credibility_signals.map(c => `<li>✓ ${c}</li>`).join("")}</ul>
    </div>` : "";

  cards.innerHTML = statsHtml + topicsHtml + factsHtml + actionsHtml + credHtml;
  output.classList.remove("hidden");
  output.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Tab Navigation ────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
document.getElementById("settings-btn").addEventListener("click", async () => {
  const panel = document.getElementById("settings-panel");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) {
    const { apiKey } = await chrome.storage.local.get("apiKey");
    if (apiKey) document.getElementById("settings-api-key").value = apiKey;
  }
});
document.getElementById("close-settings").addEventListener("click", () => {
  document.getElementById("settings-panel").classList.add("hidden");
});
document.getElementById("update-key-btn").addEventListener("click", async () => {
  const key = document.getElementById("settings-api-key").value.trim();
  if (!key) return;
  await chrome.storage.local.set({ apiKey: key });
  const msg = document.getElementById("settings-msg");
  msg.classList.remove("hidden");
  setTimeout(() => msg.classList.add("hidden"), 2500);
});
document.getElementById("clear-chat-btn").addEventListener("click", async () => {
  chatHistory = [];
  await chrome.storage.local.remove("chatHistory");
  document.getElementById("chat-messages").innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">◈</div>
      <p>Chat cleared. Ask anything about this page.</p>
    </div>`;
});
document.getElementById("reset-btn").addEventListener("click", async () => {
  if (confirm("Reset PageMind? This will remove your API key and all history.")) {
    await chrome.storage.local.clear();
    location.reload();
  }
});

// ── Setup Screen ──────────────────────────────────────────────────────────────
document.getElementById("save-key-btn").addEventListener("click", async () => {
  const key = document.getElementById("api-key-input").value.trim();
  const errorEl = document.getElementById("setup-error");
  errorEl.classList.add("hidden");

  if (!key || key.length < 10) {
    errorEl.textContent = "Please enter a valid API key.";
    errorEl.classList.remove("hidden");
    return;
  }

  await chrome.storage.local.set({ apiKey: key });
  showMain();
  loadPageContent();
});

// ── Loading ───────────────────────────────────────────────────────────────────
function showLoading(text = "Thinking...") {
  document.getElementById("loading-text").textContent = text;
  document.getElementById("loading-overlay").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loading-overlay").classList.add("hidden");
}
function showError(msg) {
  alert(`PageMind Error: ${msg}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^#{1,3}\s+(.*)$/gm, "<strong>$1</strong>")
    .replace(/^[•\-]\s+(.*)$/gm, "<span class='bullet-item'>$1</span>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(.+)$/, "<p>$1</p>");
}
