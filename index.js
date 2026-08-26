const https = require("https");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function sendMessage(chatId, text) {
  const data = JSON.stringify({
    chat_id: chatId,
    text: text
  });

  const options = {
    hostname: "api.telegram.org",
    path: `/bot${TOKEN}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };

  const req = https.request(options);
  req.write(data);
  req.end();
}

exports.handler = async function(event) {
  try {
    const update = JSON.parse(event.body || "{}");

    if (update.message && update.message.chat) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";

      if (text === "/start") {
        sendMessage(
          chatId,
          "⚽ أهلاً بك في Saudi Goal 🇸🇦\n\nتابع مباريات اليوم والنتائج وترتيب الدوري السعودي.\n\nاستخدم:\n/today مباريات اليوم\n/standings ترتيب الدوري\n/news آخر الأخبار"
        );
      }

      if (text === "/today") {
        sendMessage(
          chatId,
          "⚽ مباريات اليوم\n\nسيتم عرض أحدث مباريات الكرة السعودية هنا."
        );
      }

      if (text === "/standings") {
        sendMessage(
          chatId,
          "🏆 ترتيب الدوري السعودي\n\nسيتم تحديث ترتيب الفرق هنا."
        );
      }

      if (text === "/news") {
        sendMessage(
          chatId,
          "🔥 آخر أخبار الكرة السعودية\n\nسيتم عرض أحدث الأخبار هنا."
        );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok:
