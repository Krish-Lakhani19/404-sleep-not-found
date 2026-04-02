const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, ".env");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadDotEnv(ENV_PATH);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const MESSAGES_PATH = path.join(DATA_DIR, "messages.json");
const RESUME_PROFILE_PATH = path.join(DATA_DIR, "resume_profile.json");
const RESUME_TEXT_PATH = path.join(DATA_DIR, "resume_merged.txt");
const LINKEDIN_PROFILE_PATH = path.join(DATA_DIR, "linkedin_profile.json");
const GITHUB_PROFILE_PATH = path.join(DATA_DIR, "github_profile.json");
const GITHUB_REPOS_PATH = path.join(DATA_DIR, "github_repos.json");
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "Portfolio Contact <onboarding@resend.dev>";
const MAIL_TO = process.env.MAIL_TO || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const requestLog = new Map();

function redactSensitive(value) {
  let output = String(value || "");
  output = output.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
  output = output.replace(/re_[A-Za-z0-9]+/g, "re_[REDACTED]");
  if (RESEND_API_KEY) {
    output = output.split(RESEND_API_KEY).join("[REDACTED]");
  }
  return output;
}

function logServerError(context, error) {
  const safeContext = redactSensitive(context);
  const safeMessage = redactSensitive(error?.message || String(error || "Unknown error"));
  console.error(`[${new Date().toISOString()}] ${safeContext}: ${safeMessage}`);
}

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readTextFile(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(content);
  });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function rateLimitByIp(ip, intervalMs, limit) {
  const now = Date.now();
  const item = requestLog.get(ip) || { start: now, count: 0 };

  if (now - item.start > intervalMs) {
    item.start = now;
    item.count = 0;
  }

  item.count += 1;
  requestLog.set(ip, item);
  return item.count <= limit;
}

function fetchGitHubRepos(username) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.github.com",
      path: `/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=8`,
      method: "GET",
      headers: {
        "User-Agent": "krish-portfolio-site",
        Accept: "application/vnd.github+json",
      },
    };

    const req = https.request(options, (resp) => {
      let body = "";
      resp.on("data", (chunk) => {
        body += chunk;
      });
      resp.on("end", () => {
        if (resp.statusCode !== 200) {
          resolve([]);
          return;
        }

        try {
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            resolve([]);
            return;
          }

          const repos = parsed
            .filter((repo) => !repo.fork)
            .slice(0, 6)
            .map((repo) => ({
              name: repo.name,
              description:
                repo.description || "No description yet. Mystery makes it cooler.",
              stars: repo.stargazers_count,
              language: repo.language || "Mixed",
              url: repo.html_url,
              updatedAt: repo.updated_at,
            }));

          resolve(repos);
        } catch {
          resolve([]);
        }
      });
    });

    req.on("error", () => resolve([]));
    req.end();
  });
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendResendEmail(payload) {
  return new Promise((resolve, reject) => {
    if (!RESEND_API_KEY) {
      reject(new Error("RESEND_API_KEY is not configured."));
      return;
    }

    const body = JSON.stringify(payload);
    const options = {
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (resp) => {
      let raw = "";
      resp.on("data", (chunk) => {
        raw += chunk;
      });
      resp.on("end", () => {
        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          resolve(raw ? JSON.parse(raw) : {});
          return;
        }
        const serverError = new Error("Email provider request failed.");
        serverError.statusCode = resp.statusCode || 500;
        serverError.responseBody = raw || "";
        reject(serverError);
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function sendContactNotification(record) {
  const profile = readJsonFile(PROFILE_PATH, {});
  const recipient = MAIL_TO || profile.email;
  if (!recipient) {
    throw new Error("No notification recipient configured. Set MAIL_TO or profile.email.");
  }

  const safeName = escapeHtml(record.name);
  const safeEmail = escapeHtml(record.email);
  const safeMessage = escapeHtml(record.message);
  const createdAt = new Date(record.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return sendResendEmail({
    from: MAIL_FROM,
    to: [recipient],
    subject: `New Portfolio Contact Message from ${record.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #17212b;">
        <h2 style="margin-bottom: 8px;">New Contact Form Submission</h2>
        <p style="margin-top: 0; color: #4a5a69;">You received a new message on your portfolio website.</p>
        <hr style="border:none; border-top:1px solid #d7e0e8; margin: 16px 0;" />
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Time:</strong> ${createdAt}</p>
        <p><strong>IP:</strong> ${escapeHtml(record.ip)}</p>
        <p><strong>Message:</strong></p>
        <div style="background:#f6f8fa; padding:12px; border-radius:8px; white-space:pre-wrap;">${safeMessage}</div>
      </div>
    `,
  });
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "is",
    "are",
    "about",
    "me",
    "you",
    "your",
    "my",
    "krish",
    "lakhani",
    "tell",
    "what",
    "who",
    "how",
    "why",
    "when",
  ]);
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stop.has(token));
}

function toSentence(value, maxLen = 260) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 3)}...`;
}

function buildKnowledgeBase() {
  const profile = readJsonFile(PROFILE_PATH, {});
  const resumeProfile = readJsonFile(RESUME_PROFILE_PATH, {});
  const linkedin = readJsonFile(LINKEDIN_PROFILE_PATH, {});
  const githubProfile = readJsonFile(GITHUB_PROFILE_PATH, {});
  const githubRepos = readJsonFile(GITHUB_REPOS_PATH, []);
  const resumeText = readTextFile(RESUME_TEXT_PATH, "");

  const chunks = [];
  const pushChunk = (source, text, meta = {}) => {
    const clean = toSentence(text, 320);
    if (!clean) return;
    chunks.push({ source, text: clean, meta });
  };

  pushChunk(
    "profile",
    `${profile.name || "Krish Lakhani"} - ${profile.title || ""}. ${profile.tagline || ""}`
  );
  pushChunk("profile", `Location: ${profile.location || "Not specified"}.`);
  pushChunk(
    "profile",
    `Contact: email ${profile.email || "unavailable"}, phone ${profile.phone || "unavailable"}.`
  );
  (profile.highlights || []).forEach((item) => pushChunk("profile", item));
  (profile.funFacts || []).forEach((item) => pushChunk("profile", item));
  (profile.skills || []).forEach((item) => pushChunk("profile", `Skill: ${item}`));

  pushChunk(
    "resume",
    `${resumeProfile.name || ""} - ${resumeProfile.title || ""}. ${resumeProfile.about || ""}`
  );
  (resumeProfile.education || []).forEach((edu) => {
    pushChunk(
      "resume",
      `Education: ${edu.degree || ""} at ${edu.institution || ""}, ${edu.duration || ""}, GPA ${
        edu.gpa || "N/A"
      }.`
    );
  });
  (resumeProfile.internships || []).forEach((intern) => {
    pushChunk(
      "resume",
      `Internship: ${intern.role || ""} at ${intern.company || ""} (${intern.duration || ""}).`
    );
    (intern.highlights || []).forEach((h) => pushChunk("resume", h));
  });

  (resumeProfile.certifications || []).forEach((cert) => {
    pushChunk(
      "resume",
      `Certification: ${cert.name || ""} from ${cert.issuer || ""} (${cert.date || ""}).`
    );
  });

  Object.entries(resumeProfile.skills || {}).forEach(([group, values]) => {
    if (Array.isArray(values) && values.length) {
      pushChunk("resume", `${group} skills: ${values.join(", ")}.`);
    }
  });

  (resumeProfile.selected_projects || []).forEach((p) =>
    pushChunk("resume", `Featured project: ${p}.`)
  );

  pushChunk(
    "linkedin",
    `${linkedin.name || "Krish Lakhani"} on LinkedIn: ${linkedin.headline || ""}.`
  );
  pushChunk("linkedin", `LinkedIn URL: ${linkedin.url || "Unavailable"}.`);
  (linkedin.focus_areas || []).forEach((area) => pushChunk("linkedin", `LinkedIn focus: ${area}.`));
  (linkedin.notes || []).forEach((note) => pushChunk("linkedin", note));

  pushChunk(
    "github",
    `GitHub profile ${githubProfile.html_url || "https://github.com/Krish-Lakhani19"} with ${
      githubProfile.public_repos ?? "multiple"
    } public repositories, ${githubProfile.followers ?? "0"} followers, ${
      githubProfile.following ?? "0"
    } following.`
  );
  pushChunk(
    "github",
    `GitHub username: ${githubProfile.login || "Krish-Lakhani19"}; last updated ${
      githubProfile.updated_at || "recently"
    }.`
  );

  (Array.isArray(githubRepos) ? githubRepos : [])
    .filter((repo) => !repo.fork)
    .slice(0, 40)
    .forEach((repo) => {
      pushChunk(
        "github",
        `Repository ${repo.name}: ${
          repo.description || "No description provided."
        } Tech: ${repo.language || "Mixed"}. Updated ${repo.updated_at || "recently"}.`,
        { repo: repo.name }
      );
    });

  const resumeSentences = resumeText
    .replace(/\s+/g, " ")
    .split(/(?<=[.])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35)
    .slice(0, 120);
  resumeSentences.forEach((line) => pushChunk("resume", line));

  return chunks;
}

function scoreChunk(questionTokens, chunk) {
  if (!questionTokens.length) return 0;
  const hayTokens = new Set(tokenize(chunk.text));
  let overlap = 0;
  questionTokens.forEach((token) => {
    if (hayTokens.has(token)) overlap += 1;
  });

  const phraseBoost = normalizeText(chunk.text).includes(questionTokens.join(" ")) ? 2 : 0;
  const sourceBoost = chunk.source === "resume" ? 0.25 : chunk.source === "github" ? 0.2 : 0.1;
  return overlap + phraseBoost + sourceBoost;
}

function answerFromKnowledge(question) {
  const lower = normalizeText(question);
  const questionTokens = tokenize(question);
  const chunks = buildKnowledgeBase();

  if (!chunks.length) {
    return {
      answer:
        "I could not load Krish's knowledge sources right now. Please try again in a moment.",
      sources: [],
    };
  }

  const contactSignals = ["email", "phone", "contact", "reach", "call", "number"];
  if (contactSignals.some((signal) => lower.includes(signal))) {
    const profile = readJsonFile(PROFILE_PATH, {});
    return {
      answer: `You can reach Krish at ${profile.email || "email unavailable"} and ${
        profile.phone || "phone unavailable"
      }. LinkedIn: ${profile.links?.linkedin || "N/A"}, GitHub: ${profile.links?.github || "N/A"}.`,
      sources: ["profile", "linkedin", "github"],
    };
  }

  const ranked = chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(questionTokens, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!ranked.length) {
    return {
      answer:
        "I can answer detailed questions about Krish's resume, GitHub work, LinkedIn profile, skills, projects, education, internships, and contact details. Try asking about a specific area.",
      sources: ["resume", "github", "linkedin", "profile"],
    };
  }

  const uniqueSources = [...new Set(ranked.map((chunk) => chunk.source))];
  const evidence = ranked.map((chunk) => chunk.text);
  const deduped = [...new Set(evidence)].slice(0, 4);

  return {
    answer: `Here is what I found: ${deduped.join(" ")}`,
    sources: uniqueSources,
  };
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      message: "Backend is smooth and caffeinated.",
      time: new Date().toISOString(),
    });
    return;
  }

  if (pathname === "/api/profile" && req.method === "GET") {
    const profile = readJsonFile(PROFILE_PATH, {});
    sendJson(res, 200, profile);
    return;
  }

  if (pathname === "/api/resume" && req.method === "GET") {
    const resume = readJsonFile(RESUME_PROFILE_PATH, {});
    sendJson(res, 200, resume);
    return;
  }

  if (pathname === "/api/repos" && req.method === "GET") {
    const repos = await fetchGitHubRepos("Krish-Lakhani19");
    sendJson(res, 200, {
      repos,
      fallback: repos.length === 0,
      note:
        repos.length === 0
          ? "Could not fetch GitHub in this environment, but UI still works."
          : null,
    });
    return;
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    try {
      const body = await collectBody(req);
      const question = String(body.message || "").trim();

      if (!question) {
        sendJson(res, 400, {
          ok: false,
          message: "Please ask something about Krish.",
        });
        return;
      }

      const result = answerFromKnowledge(question);

      sendJson(res, 200, {
        ok: true,
        answer: result.answer,
        sources: result.sources,
      });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message || "Invalid request." });
    }
    return;
  }

  if (pathname === "/api/contact" && req.method === "POST") {
    const ip = getClientIp(req);
    if (!rateLimitByIp(ip, 60_000, 4)) {
      sendJson(res, 429, {
        ok: false,
        message: "Too many messages in a minute. Even my inbox needs boundaries.",
      });
      return;
    }

    try {
      const body = await collectBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const message = String(body.message || "").trim();

      if (!name || !email || !message) {
        sendJson(res, 400, {
          ok: false,
          message: "Name, email, and message are required.",
        });
        return;
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        sendJson(res, 400, {
          ok: false,
          message: "Please enter a valid email address.",
        });
        return;
      }

      if (message.length < 10) {
        sendJson(res, 400, {
          ok: false,
          message: "Message is too short. Give me at least 10 characters of brilliance.",
        });
        return;
      }

      const record = {
        id: Math.random().toString(36).slice(2, 10),
        name,
        email,
        message,
        createdAt: new Date().toISOString(),
        ip,
      };

      const existing = readJsonFile(MESSAGES_PATH, []);
      existing.unshift(record);
      writeJsonFile(MESSAGES_PATH, existing.slice(0, 200));

      let notifyError = null;
      try {
        await sendContactNotification(record);
      } catch (error) {
        logServerError("contact_notification_failed", error);
        notifyError = "Notification service is temporarily unavailable.";
      }

      sendJson(res, 201, {
        ok: true,
        message: notifyError
          ? `Message received, but email notification failed: ${notifyError}`
          : `Thanks ${name.split(" ")[0]}! Message received and notification sent.`,
        notificationSent: !notifyError,
      });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message || "Invalid request." });
    }
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
}

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
  let filePath = path.join(PUBLIC_DIR, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }

  sendFile(res, filePath);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname);
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Portfolio running on http://localhost:${PORT}`);
});
