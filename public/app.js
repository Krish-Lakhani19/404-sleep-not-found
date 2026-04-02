const fallbackProjects = [
  {
    name: "Portfolio Engine",
    description: "A personal site that balances performance, personality, and deployability.",
    stars: 0,
    language: "JavaScript",
    url: "https://github.com/Krish-Lakhani19",
    updatedAt: new Date().toISOString(),
  },
  {
    name: "API Playground",
    description: "Experimenting with backend patterns and clean data flows.",
    stars: 0,
    language: "Node.js",
    url: "https://github.com/Krish-Lakhani19",
    updatedAt: new Date().toISOString(),
  },
];

const profileState = {
  email: "krishlakhani46767@gmail.com",
  phone: "+91 8928591979",
  links: {
    github: "https://github.com/Krish-Lakhani19",
    linkedin: "https://www.linkedin.com/in/krishlakhani19/",
  },
};

function el(id) {
  return document.getElementById(id);
}

function initLoader() {
  const loader = el("siteLoader");
  const percent = el("loaderPercent");
  const lineA = el("loaderLineA");
  const lineB = el("loaderLineB");
  const fill = el("loaderFill");
  const messages = [
    "Compiling charisma modules...",
    "Injecting good UI decisions...",
    "Animating confidence layer...",
    "Calibrating humor engine...",
    "Preparing smooth interactions...",
    "Finalizing Krishverse boot sequence...",
  ];
  let value = 0;
  const timer = setInterval(() => {
    value = Math.min(value + Math.floor(Math.random() * 9) + 4, 100);
    percent.textContent = `${value}%`;
    fill.style.width = `${value}%`;
    lineA.textContent = messages[Math.floor(Math.random() * messages.length)];
    lineB.textContent = `Frame sync ${Math.floor(200 + Math.random() * 700)}hz | latency ${Math.floor(
      4 + Math.random() * 18
    )}ms`;
    if (value >= 100) {
      clearInterval(timer);
      lineA.textContent = "Boot complete. Welcome aboard.";
      lineB.textContent = "Entering portfolio experience...";
    }
  }, 110);

  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("done");
      setTimeout(() => loader.remove(), 800);
    }, 420);
  });
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("portfolioTheme", theme);
}

function init3DScene() {
  const scene = el("bgScene3d");
  if (!scene) return;

  window.addEventListener("pointermove", (event) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    const rotateY = x * 30;
    const rotateX = -y * 18;
    scene.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  window.addEventListener("pointerleave", () => {
    scene.style.transform = "rotateX(-8deg) rotateY(14deg)";
  });
}

function initTiltCards() {
  const cards = document.querySelectorAll(".card, .project-card");
  cards.forEach((card) => {
    card.classList.add("tilt-card");
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateX(${y * -5}deg) rotateY(${x * 7}deg) translateY(-3px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function initTheme() {
  const saved = localStorage.getItem("portfolioTheme");
  if (saved) {
    setTheme(saved);
  }

  el("themeToggle").addEventListener("click", () => {
    const next = document.body.dataset.theme === "night" ? "day" : "night";
    setTheme(next);
  });
}

function initMobileMenu() {
  const nav = el("navLinks");
  el("menuToggle").addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

function addListItems(target, items = []) {
  target.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.append(li);
  });
}

function renderSkills(skills = []) {
  const cloud = el("skillsCloud");
  cloud.innerHTML = "";
  skills.forEach((skill) => {
    const span = document.createElement("span");
    span.className = "skill-pill";
    span.textContent = skill;
    cloud.append(span);
  });
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function renderProjects(projects = []) {
  const grid = el("projectGrid");
  grid.innerHTML = "";

  projects.forEach((project) => {
    const article = document.createElement("article");
    article.className = "project-card reveal";

    const heading = document.createElement("h3");
    heading.textContent = project.name || "Untitled Project";

    const desc = document.createElement("p");
    desc.className = "muted";
    desc.textContent = project.description || "No description yet.";

    const metaOne = document.createElement("div");
    metaOne.className = "project-meta";
    const language = document.createElement("span");
    language.textContent = project.language || "Mixed";
    const stars = document.createElement("span");
    stars.textContent = `★ ${project.stars ?? 0}`;
    metaOne.append(language, stars);

    const metaTwo = document.createElement("div");
    metaTwo.className = "project-meta";
    const updated = document.createElement("span");
    updated.textContent = `Updated ${formatDate(project.updatedAt)}`;
    const link = document.createElement("a");
    link.href = project.url || profileState.links.github;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open";
    metaTwo.append(updated, link);

    article.append(heading, desc, metaOne, metaTwo);
    grid.append(article);
  });

  observeReveals();
}

async function loadProfile() {
  try {
    const res = await fetch("/api/profile");
    const profile = await res.json();

    if (!res.ok) {
      throw new Error("Could not load profile.");
    }

    profileState.links = profile.links || profileState.links;
    profileState.email = profile.email || profileState.email;
    profileState.phone = profile.phone || profileState.phone;
    el("heroName").textContent = profile.name || "Krish Lakhani";
    el("heroTagline").textContent =
      profile.tagline || "I build smooth products and reliable systems.";
    el("profileTitle").textContent = profile.title || "Developer";
    el("profileLocation").textContent = profile.location
      ? `Currently based in ${profile.location}`
      : "Available for remote and onsite opportunities.";
    addListItems(el("highlightsList"), profile.highlights || []);
    addListItems(el("funFactsList"), profile.funFacts || []);
    renderSkills(profile.skills || []);

    el("githubBtn").href = profileState.links.github;
    el("linkedinBtn").href = profileState.links.linkedin;
    el("directEmail").textContent = profileState.email;
    el("directEmail").href = `mailto:${profileState.email}`;
    el("directPhone").textContent = profileState.phone;
    el("directPhone").href = `tel:${profileState.phone.replace(/[^\d+]/g, "")}`;
  } catch {
    el("profileTitle").textContent = "Creative builder with backend focus.";
    el("profileLocation").textContent = "Profile API unavailable, showing fallback mode.";
  }
}

async function checkHealth() {
  const status = el("apiStatus");
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (!res.ok || data.status !== "ok") {
      throw new Error("unhealthy");
    }
    status.textContent = "Backend: smooth and caffeinated";
  } catch {
    status.textContent = "Backend: waking up, but still deployable";
  }
}

async function loadProjects() {
  try {
    const res = await fetch("/api/repos");
    const data = await res.json();
    const repos = Array.isArray(data.repos) ? data.repos : [];
    renderProjects(repos.length ? repos : fallbackProjects);
  } catch {
    renderProjects(fallbackProjects);
  }
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal:not(.bound)");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  items.forEach((item) => {
    item.classList.add("bound");
    observer.observe(item);
  });
}

function initContactForm() {
  const form = el("contactForm");
  const result = el("formResult");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    result.textContent = "Sending...";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      result.textContent = data.message || "Message sent.";
      if (res.ok) {
        form.reset();
      }
    } catch {
      result.textContent = "Network hiccup. Please try again in a moment.";
    }
  });
}

function appendChatRow(kind, text) {
  const log = el("chatLog");
  const row = document.createElement("div");
  row.className = `chat-row ${kind}`;
  const bubble = document.createElement("p");
  bubble.textContent = text;
  row.append(bubble);
  log.append(row);
  log.scrollTop = log.scrollHeight;
}

function initChatbot() {
  const form = el("chatForm");
  const input = el("chatInput");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendChatRow("user", message);
    input.value = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        appendChatRow("bot", data.message || "I had a small brain lag. Try again.");
        return;
      }
      const sourceLine =
        Array.isArray(data.sources) && data.sources.length
          ? `\n\nSources: ${data.sources.join(", ")}`
          : "";
      appendChatRow("bot", `${data.answer}${sourceLine}`);
    } catch {
      appendChatRow("bot", "Network hiccup. I am still here, just briefly speechless.");
    }
  });
}

function initConstellation() {
  const canvas = el("constellation");
  const ctx = canvas.getContext("2d");
  const dots = [];
  const count = 60;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createDots() {
    dots.length = 0;
    for (let i = 0; i < count; i += 1) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 159, 69, 0.6)";

    dots.forEach((dot, i) => {
      dot.x += dot.vx;
      dot.y += dot.vy;

      if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
      if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 1.6, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < dots.length; j += 1) {
        const other = dots[j];
        const dx = dot.x - other.x;
        const dy = dot.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 110) {
          ctx.strokeStyle = `rgba(0, 127, 124, ${1 - distance / 110})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }

  resize();
  createDots();
  draw();

  window.addEventListener("resize", () => {
    resize();
    createDots();
  });
}

function initKonami() {
  const code = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  const buffer = [];

  window.addEventListener("keydown", (event) => {
    buffer.push(event.key);
    if (buffer.length > code.length) {
      buffer.shift();
    }

    if (code.every((key, i) => key === buffer[i])) {
      document.body.classList.add("party-mode");
      alert("Party mode unlocked. You are now 12% more legendary.");
      buffer.length = 0;
    }
  });
}

function init() {
  initLoader();
  initTheme();
  initMobileMenu();
  observeReveals();
  initConstellation();
  init3DScene();
  initTiltCards();
  initContactForm();
  initChatbot();
  initKonami();

  loadProfile();
  checkHealth();
  loadProjects();
}

init();
