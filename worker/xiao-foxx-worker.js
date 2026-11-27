const SITE_ORIGIN = "https://juntw1928.github.io";

function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGIN || SITE_ORIGIN;
  const permitted = origin === allowed ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": permitted,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);
    const allowedOrigin = env.ALLOWED_ORIGIN || SITE_ORIGIN;

    if (origin && origin !== allowedOrigin) {
      return json({ error: "Origin is not allowed." }, 403, headers);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (new URL(request.url).pathname !== "/chat" || request.method !== "POST") {
      return json({ error: "Not found." }, 404, headers);
    }
    if (!env.OPENAI_API_KEY) {
      return json({ error: "Server is missing OPENAI_API_KEY." }, 503, headers);
    }

    try {
      const body = await request.json();
      const message = typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";
      if (!message) return json({ error: "Message is required." }, 400, headers);

      const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
      const input = history
        .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .map(item => ({
          role: item.role,
          content: item.content.slice(0, 1800)
        }));
      input.push({ role: "user", content: message });

      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-5.5",
          instructions: [
            "Bạn là Xiao🦊Foxx, trợ lý thân thiện của website blog cá nhân Foxxx.",
            "Luôn trả lời bằng tiếng Việt tự nhiên, ngắn gọn, lịch sự và hữu ích.",
            "Bạn hỗ trợ khách hiểu cấu trúc website, tìm mục Bài viết mới, mục Giới thiệu và liên hệ.",
            "Website hiện có các chủ đề Khởi đầu, Ghi chép, Cảm hứng. Không bịa ra bài viết, thông tin liên hệ hoặc tính năng không có trên website.",
            "Nếu không biết câu trả lời, hãy nói rõ và hướng dẫn khách dùng các liên kết đang có trên trang.",
            "Không yêu cầu khách cung cấp mật khẩu, mã OTP, thông tin thanh toán hoặc dữ liệu nhạy cảm."
          ].join("\n"),
          input,
          max_output_tokens: 500
        })
      });

      const result = await upstream.json();
      if (!upstream.ok) {
        return json({ error: "AI service error.", detail: result.error?.message || "Upstream request failed." }, 502, headers);
      }
      const reply = result.output
        ?.filter(item => item.type === "message")
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n")
        .trim();

      if (!reply) return json({ error: "AI returned an empty response." }, 502, headers);
      return json({ reply }, 200, headers);
    } catch (error) {
      return json({ error: "Unable to process this request.", detail: error.message }, 500, headers);
    }
  }
};
