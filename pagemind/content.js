// content.js - Extracts page content and sends to popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    try {
      const content = extractPageContent();
      sendResponse({ success: true, content });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }
  return true;
});

function extractPageContent() {
  // Remove unwanted elements
  const unwanted = document.querySelectorAll(
    'script, style, noscript, iframe, nav, footer, header, aside, .ads, .advertisement, [aria-hidden="true"]'
  );
  
  // Clone body to avoid mutating DOM
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, iframe, nav, footer, header, aside').forEach(el => el.remove());

  // Extract meaningful text
  const title = document.title || "";
  const metaDesc = document.querySelector('meta[name="description"]')?.content || "";
  
  // Get main content area if available
  const main = clone.querySelector('main, article, [role="main"], .main-content, #content, #main') || clone;
  
  let text = main.innerText || main.textContent || "";
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limit to ~15000 chars to stay within token limits
  if (text.length > 15000) {
    text = text.substring(0, 15000) + "... [content truncated]";
  }

  return {
    title,
    url: window.location.href,
    description: metaDesc,
    body: text
  };
}
