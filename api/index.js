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
    "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4668&s=2026-2027";

  const data = await getJSON(url);
  const events = data.events || [];

  if (events.length === 0) {
    return "🏆 تعذر جلب ترتيب الدوري السعودي الآن.";
  }

  const teams = {};

  function addTeam(name) {
    if (!name) return;

    if (!teams[name]) {
      teams[name] = {
        name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0
      };
    }
  }

  events.forEach((event) => {
    const home = event.strHomeTeam;
    const away = event.strAwayTeam;

    addTeam(home);
    addTeam(away);

    const homeScore = Number(event.intHomeScore);
    const awayScore = Number(event.intAwayScore);

    if (
      event.intHomeScore === null ||
      event.intAwayScore === null ||
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore)
    ) {
      return;
    }

    teams[home].played++;
    teams[away].played++;

    teams[home].gf += homeScore;
    teams[home].ga += awayScore;

    teams[away].gf += awayScore;
    teams[away].ga += homeScore;

    if (homeScore > awayScore) {
      teams[home].won++;
      teams[home].points += 3;
      teams[away].lost++;
    } else if (awayScore > homeScore) {
      teams[away].won++;
      teams[away].points += 3;
      teams[home].lost++;
    } else {
      teams[home].drawn++;
      teams[away].drawn++;
      teams[home].points++;
      teams[away].points++;
    }
  });

  const standings = Object.values(teams);

  standings.forEach((team) => {
    team.gd = team.gf - team.ga;
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  let message = "🏆 ترتيب الدوري السعودي\n\n";
message += "لعب | فوز | تعادل | خسارة | فارق | نقاط\n\n";

standings.forEach((team, index) => {
  message += `${index + 1}. ${team.name}\n`;
  message += `لعب ${team.played} | فوز ${team.won} | تعادل ${team.drawn} | خسارة ${team.lost}\n`;
  message += `فارق ${team.gd} | نقاط ${team.points}\n\n`;
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
