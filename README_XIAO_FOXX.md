# Xiao🦊Foxx AI assistant setup

The GitHub Pages frontend already includes the Clippy character, Vietnamese chat UI, browser speech synthesis, and optional microphone input.

## 1. Deploy the private AI endpoint

The endpoint is a Cloudflare Worker. It keeps the OpenAI API key on the server and calls the OpenAI Responses API. Never put an OpenAI key in `index.html`, JavaScript, or any public repository file.

Requirements: Node.js and a Cloudflare account.

From the repository root, run:

```bash
npm install -g wrangler
npx wrangler login
npx wrangler deploy
npx wrangler secret put OPENAI_API_KEY
```

When prompted for `OPENAI_API_KEY`, paste the API key. The key is stored as a Worker secret, not in this repository.

The Worker uses model `gpt-5.5` by default. To choose another model supported by your API project, set the Worker variable `OPENAI_MODEL` in Cloudflare.

## 2. Connect the website to the Worker

After deployment, Cloudflare prints a URL similar to:

`https://xiao-foxx-api.<your-account>.workers.dev`

The chat endpoint is that URL plus `/chat`.

Open `index.html` and find this line near the Xiao assistant module:

```js
const API_URL = window.XIAO_FOXX_API || "";
```

Immediately before the assistant's `<script type="module">`, add:

```html
<script>
  window.XIAO_FOXX_API = "https://xiao-foxx-api.<your-account>.workers.dev/chat";
</script>
```

Replace the example hostname with the exact URL Cloudflare gave you, then commit and push the change. GitHub Pages will publish the update.

## 3. Test

- Open https://juntw1928.github.io/
- Press **🦊 Trò chuyện với Xiao**.
- Ask a question in Vietnamese.
- Use **🎙️ Nói** for microphone input (browser permission and HTTPS required).
- Use **🔊 Đọc** to enable or mute spoken answers.

## Notes

- Before the Worker is connected, Xiao runs in basic local FAQ mode. It can answer a few questions about the current blog but is not a full AI chatbot.
- Browser speech uses the voices installed by the visitor's operating system/browser. A Vietnamese voice is selected when available.
- Microphone recognition depends on browser support. Chrome and Edge generally support the Web Speech API; some browsers do not.
- The Worker only accepts requests from `https://juntw1928.github.io` by default. If you use a custom domain, change `ALLOWED_ORIGIN` in `wrangler.toml` and redeploy.
- Add rate limiting or Cloudflare Turnstile before promoting the endpoint widely. The OpenAI API may incur usage charges.
