const cat = document.getElementById("cat");
const catClosed = document.getElementById("catClosed");
const catOpen = document.getElementById("catOpen");
const clickCountEl = document.getElementById("click-count");
const popSound = document.getElementById("pop-sound");
const leaderboardEl = document.getElementById("leaderboard").querySelector("tbody");

let totalGlobalClicks = 0;

// 🗺️ Detecta país por IP
async function getCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.country_name || "Unknown";
  } catch {
    return "Unknown";
  }
}

// 🧮 Obtiene el total global de clics desde la DB
async function loadGlobalClicks() {
  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();

    if (data.success) {
      const sum = data.leaderboard.reduce((acc, row) => acc + (row.total_clicks || 0), 0);
      totalGlobalClicks = sum;
      clickCountEl.textContent = totalGlobalClicks.toLocaleString();
    }
  } catch (err) {
    console.error("Error al cargar clicks globales:", err);
  }
}

// 🐱 Manejo del clic en el gato
cat.addEventListener("click", async () => {
  // Animación y sonido
  catClosed.style.opacity = 0;
  catOpen.style.opacity = 1;
  popSound.currentTime = 0;
  popSound.play();
  setTimeout(() => {
    catClosed.style.opacity = 1;
    catOpen.style.opacity = 0;
  }, 100);

  // Envía clic al backend
  const country = await getCountry();
  const res = await fetch("/api/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country }),
  });

  const data = await res.json();

  if (data.success) {
    // Actualiza contador global en tiempo real
    totalGlobalClicks += 1;
    clickCountEl.textContent = totalGlobalClicks.toLocaleString();

    // Actualiza leaderboard inmediatamente
    loadLeaderboard();
  }
});

// 🏆 Carga y muestra el leaderboard
async function loadLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();

    if (data.success) {
      leaderboardEl.innerHTML = "";

      data.leaderboard.forEach((row, index) => {
        const tr = document.createElement("tr");
        const medal =
          index === 0 ? "🥇" :
          index === 1 ? "🥈" :
          index === 2 ? "🥉" : "";

        const flagUrl = `https://flagsapi.com/${getFlagCode(row.country)}/flat/32.png`;

        tr.innerHTML = `
          <td class="rank">${medal || index + 1}</td>
          <td><img class="flag" src="${flagUrl}" alt="${row.country} flag">${row.country}</td>
          <td>${row.total_clicks.toLocaleString()}</td>
        `;
        leaderboardEl.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    leaderboardEl.innerHTML = `<tr><td colspan="3">Error loading leaderboard</td></tr>`;
  }
}

// 🌍 Mapa de nombres de país → código ISO
function getFlagCode(name) {
  const map = {
    Argentina: "AR",
    Chile: "CL",
    México: "MX",
    España: "ES",
    "Estados Unidos": "US",
    "United States": "US",
    Brazil: "BR",
  };
  return map[name] || "UN";
}

// 🔁 Inicializa todo
loadLeaderboard();
loadGlobalClicks();
setInterval(loadLeaderboard, 10000);
setInterval(loadGlobalClicks, 15000);
