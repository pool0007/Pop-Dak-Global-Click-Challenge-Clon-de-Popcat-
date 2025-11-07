let userCountry = null;
let totalClicks = 0;
const cat = document.getElementById("cat");
const counter = document.getElementById("counter");

async function detectCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    userCountry = data.country_name || "Desconocido";
    document.getElementById("status").textContent = `Tu país: ${userCountry}`;
  } catch {
    userCountry = "Desconocido";
    document.getElementById("status").textContent = "No se pudo detectar país";
  }
}

async function sendClick() {
  if (!userCountry || userCountry === "Desconocido") return;

  cat.classList.add("active");
  counter.classList.add("pop");

  setTimeout(() => {
    cat.classList.remove("active");
    counter.classList.remove("pop");
  }, 150);

  totalClicks++;
  counter.textContent = totalClicks;

  try {
    const res = await fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: userCountry }),
    });
    const data = await res.json();
    if (data.success) renderLeaderboard(data.leaderboard);
  } catch (err) {
    console.error("Error al enviar click:", err);
  }
}

async function fetchLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    if (data.success) renderLeaderboard(data.leaderboard);
  } catch (err) {
    console.error("Error al obtener leaderboard:", err);
  }
}

function renderLeaderboard(leaderboard) {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = "";
  leaderboard.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}. ${row.country}</td><td>${row.total_clicks}</td>`;
    tbody.appendChild(tr);
  });
}

cat.addEventListener("click", sendClick);

detectCountry().then(() => {
  fetchLeaderboard();
  setInterval(fetchLeaderboard, 5000);
});
