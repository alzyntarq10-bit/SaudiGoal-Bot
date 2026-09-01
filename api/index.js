const https = require("https");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const LEAGUE = "ksa.1";


function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`)
            );
          }

          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(
              new Error(`Invalid JSON response: ${data.slice(0, 200)}`)
            );
          }
        });
      }
    ).on("error", reject);
  });
}

function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
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

    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", resolve);
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function getMatches() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const url =
    `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${today}&s=Soccer`;

  const data = await getJSON(url);

  const matches = (data.events || []).filter(
    (event) => event.idLeague === "4668"
  );

  if (matches.length === 0) {
    return "⚽ لا توجد مباريات اليوم في الدوري السعودي للمحترفين.";
  }

  let message = "⚽ مباريات الدوري السعودي اليوم\n\n";

  matches.forEach((event) => {
    const home = event.strHomeTeam || "غير معروف";
    const away = event.strAwayTeam || "غير معروف";
    const time = event.strTime
      ? event.strTime.substring(0, 5)
      : "الوقت غير محدد";

    message += `🏟️ ${home} × ${away}\n`;
    message += `🕒 ${time}\n\n`;
  });

  return message;
}

async function getStandings() {
  const url =
    "https://www.thesportsdb.com/api/v1/json/123/lookuptable.php?l=4668&s=2026-2027";

  const data = await getJSON(url);
  const table = data.table || [];

  if (table.length === 0) {
    return "🏆 تعذر جلب ترتيب الدوري السعودي الآن.";
  }

  let message = "🏆 ترتيب الدوري السعودي\n\n";

  table.slice(0, 18).forEach((team, index) => {
    const name = team.strTeam || "غير معروف";
    const points = team.intPoints ?? "-";

    message += `${index + 1}. ${name} - ${points} نقطة\n`;
  });

  return message;
}

module.exports = async (req, res) => {
if (req.method === "GET" && req.query.setup === "webhook") {
  const webhookUrl = "https://saudi-goal-bot.vercel.app/api";

  const result = await getJSON(
    `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
  );

  return res.status(200).json(result);
}  
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      message: "Saudi Goal Bot is running"
    });
  }

  try {
    const update = req.body || {};

    if (!update.message || !update.message.chat) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    if (text === "/start") {
      await sendMessage(
        chatId,
        "⚽ أهلاً بك في Saudi Goal 🇸🇦\n\n" +
        "استخدم الأوامر التالية:\n" +
        "/today - مباريات الدوري السعودي\n" +
        "/standings - ترتيب الدوري السعودي"
      );
    } else if (text === "/today") {
      const matches = await getMatches();
      await sendMessage(chatId, matches);
    } else if (text === "/standings") {
      const standings = await getStandings();
      await sendMessage(chatId, standings);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ ok: true });
  }
};
