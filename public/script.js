const cat = document.getElementById("cat");
const catClosed = document.getElementById("catClosed");
const catOpen = document.getElementById("catOpen");
const clickCountEl = document.getElementById("click-count");
const popSound = document.getElementById("pop-sound");
const leaderboardEl = document.getElementById("leaderboard").querySelector("tbody");

let totalClicks = 0;

// Detecta país por IP
async function getCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.country_name || "Unknown";
  } catch {
    return "Unknown";
  }
}

// Click del gato
cat.addEventListener("click", async () => {
  catClosed.style.opacity = 0;
  catOpen.style.opacity = 1;
  popSound.currentTime = 0;
  popSound.play();
  setTimeout(() => {
    catClosed.style.opacity = 1;
    catOpen.style.opacity = 0;
  }, 100);

  totalClicks++;
  clickCountEl.textContent = totalClicks;

  const country = await getCountry();
  await fetch("/api/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country }),
  });
});

// Cargar leaderboard
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
    leaderboardEl.innerHTML = `<tr><td colspan="3">Error loading leaderboard</td></tr>`;
  }
}

// Convierte nombre de país → código ISO (para banderas)
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

// Refrescar leaderboard cada 10s
setInterval(loadLeaderboard, 10000);
loadLeaderboard();
