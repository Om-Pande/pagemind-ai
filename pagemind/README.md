# PageMind AI 🧠

> Summarize any webpage and chat with its content — powered by Groq AI.

![PageMind AI Screenshot](screenshots/dashboard.png)

---

## What is PageMind AI?

PageMind AI is a Chrome extension that lets you instantly summarize any webpage and have a conversation with its content. No more reading through long articles — just open PageMind and get the gist in seconds.

---

## Features

- **⚡ Instant Summaries** — Summarize any webpage in seconds
- **🎨 4 Summary Styles** — Concise, Detailed, Bullet Points, or ELI5
- **💬 Chat with Pages** — Ask questions about any webpage like you're talking to an expert
- **📊 AI Insights** — Get reading time, sentiment, key topics, key facts, and action items
- **🔑 Bring Your Own Key** — Uses your free Groq API key, zero ongoing cost
- **🌙 Beautiful Dark UI** — Clean, minimal dashboard design

---

## Screenshots

| Summary Tab | Chat Tab | Insights Tab |
|---|---|---|
| ![Summary](screenshots/summary.png) | ![Chat](screenshots/chat.png) | ![Insights](screenshots/insights.png) |

---

## Installation

### Option A — Load Unpacked (Developer Mode)

1. Download this repository as a ZIP → click **Code** → **Download ZIP**
2. Unzip the folder
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer Mode** (toggle in top right)
5. Click **Load unpacked** and select the `pagemind` folder
6. Click the PageMind icon in your toolbar and enter your free Groq API key

### Option B — Microsoft Edge Add-ons Store

Coming soon.

---

## Getting Your Free API Key

PageMind uses [Groq](https://console.groq.com) — a free AI API with no credit card required.

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google
3. Click **API Keys** → **Create API Key**
4. Copy the key and paste it into PageMind on first launch

---

## How It Works

1. Navigate to any webpage
2. Click the **PageMind AI** icon in your Chrome toolbar
3. Choose your summary style and hit **Summarize This Page**
4. Switch to **Chat** to ask questions about the content
5. Switch to **Insights** for an AI-powered breakdown of the page

---

## Tech Stack

- **Manifest V3** Chrome Extension
- **Groq API** — LLaMA 3.3 70B model
- **Vanilla JS** — no frameworks, lightweight
- **CSS** — custom dark dashboard UI

---

## Privacy

- PageMind does **not** collect or store any of your data
- Your API key is stored **locally** in Chrome's storage only
- Page content is sent directly to Groq's API and never stored
- Full privacy policy: [privacy-policy.md](PRIVACY.md)

---

## Contributing

Pull requests are welcome! Feel free to open an issue for bugs or feature requests.

---

## License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ using Groq + LLaMA 3.3*
