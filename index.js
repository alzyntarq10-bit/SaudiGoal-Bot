const https = require("https");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const LEAGUE = "ksa.1";

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
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
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard`;

  const data = await getJSON(url);

  if (!data.events || data.events.length === 0) {
    return "⚽ لا توجد مباريات ظاهرة حاليًا في الدوري السعودي.";
  }

  let message = "⚽ مباريات الدوري السعودي\n\n";

  data.events.slice(0, 10).forEach((event) => {
    const comp = event.competitions?.[0];

    if (!comp) return;

    const teams = comp.competitors || [];

    const home = teams.find((t) => t.homeAway === "home");
    const away = teams.find((t) => t.homeAway === "away");

    const homeName = home?.team?.displayName || "غير معروف";
    const awayName = away?.team?.displayName || "غير معروف";

    const homeScore = home?.score ?? "-";
    const awayScore = away?.score ?? "-";

    const status =
      comp.status?.type?.shortDetail ||
      event.status?.type?.shortDetail ||
      "";

    message += `${homeName} ${homeScore} - ${awayScore} ${awayName}\n`;
    message += `${status}\n\n`;
  });

  return message;
}

async function getStandings() {
  const url =
    `https://site.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings`;

  const data = await getJSON(url);

  const entries = data.children?.[0]?.standings?.entries;

  if (!entries || entries.length === 0) {
    return "🏆 تعذر جلب ترتيب الدوري السعودي الآن.";
  }

  let message = "🏆 ترتيب الدوري السعودي\n\n";

  entries.slice(0, 18)
    .forEach((entry, index) => {
      const team = entry.team?.displayName || "غير معروف";
      const stats = entry.stats || [];

      const points =
        stats.find((s) => s.name === "points")?.displayValue || "-";

      message += `${index + 1}. ${team} — ${points} نقطة\n`;
    });

  return message;
}

exports.handler = async function (event) {
  try {
    const update = JSON.parse(event.body || "{}");

    if (!update.message || !update.message.chat) {
      return {
        statusCode: 200,
        body: "OK"
      };
    }

    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    if (text === "/start") {
      await sendMessage(
        chatId,
        "⚽ أهلاً بك في Saudi Goal\n\n" +
        "استخدم الأوامر التالية:\n" +
        "/today - مباريات الدوري السعودي\n" +
        "/standings - ترتيب الدوري السعودي"
      );
    }

    else if (text === "/today") {
      const matches = await getMatches();
      await sendMessage(chatId, matches);
    }

    else if (text === "/standings") {
      const standings = await getStandings();
      await sendMessage(chatId, standings);
    }

    return {
      statusCode: 200,
      body: "OK"
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 200,
      body: "OK"
    };
  }
};
