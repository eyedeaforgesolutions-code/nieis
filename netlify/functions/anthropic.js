const https = require("https");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { prompt, maxTokens } = JSON.parse(event.body);
    const key = process.env.ANTHROPIC_KEY;
    if (!key) return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
    const payload = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens || 800,
      messages: [{ role: "user", content: prompt }],
    });
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload),
        },
      }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
    return {
      statusCode: result.statusCode,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: result.body,
    };
  } catch (err) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: err.message }) };
  }
};
