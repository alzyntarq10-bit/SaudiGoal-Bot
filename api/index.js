const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      message: "Saudi Goal Bot is running"
    });
  }

  try {
    const update = req.body;

    if (update && update.message && update.message.chat) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";

      if (text === "/start") {
        await sendMessage(
          chatId,
          "⚽ أهلاً بك في Saudi Goal 🇸🇦\n\nتابع مباريات اليوم، ترتيب الدوري السعودي، وآخر الأخبار.\n\nالأوامر:\n/today - مباريات اليوم\n/standings - ترتيب الدوري\n/news - آخر الأخبار"
        );
      }

      if (text === "/today") {
        await sendMessage(
          chatId,
          "⚽ مباريات اليوم\n\nسيتم عرض مباريات الكرة السعودية هنا."
        );
      }

      if (text === "/standings") {
        await sendMessage(
          chatId,
          "🏆 ترتيب الدوري السعودي\n\nسيتم عرض ترتيب الفرق هنا."
        );
      }

      if (text === "/news") {
        await sendMessage(
          chatId,
          "🔥 آخر أخبار الكرة السعودية\n\nسيتم عرض أحدث الأخبار هنا."
        );
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error(error);
    return res.status(200).json({ ok: false });
  }
};
