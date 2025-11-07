const cat = document.getElementById("cat");
const catClosed = document.getElementById("catClosed");
const catOpen = document.getElementById("catOpen");
const clickCountEl = document.getElementById("click-count");
const popSound = document.getElementById("pop-sound");
const leaderboardEl = document.getElementById("leaderboard").querySelector("tbody");

let totalGlobalClicks = 0;
let userCountry = "Unknown";
let userCountryCode = "UN";

// 🌍 Detectar país con ipwho.is (más confiable)
async function detectCountry() {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();
    if (data.success) {
      userCountry = data.country || "Unknown";
      userCountryCode = data.country_code || "UN";
    } else {
      userCountry = "Unknown";
      userCountryCode = "UN";
    }
  } catch (err) {
    console.warn("No se pudo detectar país:", err);
    userCountry = "Unknown";
    userCountryCode = "UN";
  }
  console.log(`🌍 País detectado: ${userCountry} (${userCountryCode})`);
}

// 🧮 Obtener el total global desde el backend
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

// 🐱 Clic del gato
cat.addEventListener("click", async () => {
  catClosed.style.opacity = 0;
  catOpen.style.opacity = 1;
  popSound.currentTime = 0;
  popSound.play();
  setTimeout(() => {
    catClosed.style.opacity = 1;
    catOpen.style.opacity = 0;
  }, 100);

  // Enviar clic al backend
  const res = await fetch("/api/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: userCountry }),
  });

  const data = await res.json();

  if (data.success) {
    totalGlobalClicks += 1;
    clickCountEl.textContent = totalGlobalClicks.toLocaleString();
    loadLeaderboard(); // actualiza inmediatamente
  }
});

// 🏆 Leaderboard dinámico
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

        const flagCode = getCountryCode(row.country);
        const flagUrl = `https://flagsapi.com/${flagCode}/flat/32.png`;

        tr.innerHTML = `
          <td class="rank">${medal || index + 1}</td>
          <td>
            <img class="flag" src="${flagUrl}" alt="${row.country} flag">
            ${row.country}
          </td>
          <td>${row.total_clicks.toLocaleString()}</td>
        `;
        leaderboardEl.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error al cargar leaderboard:", err);
  }
}

// 🔠 Obtener código ISO automático (fallback)
function getCountryCode(name) {
  // Si es el país del usuario, devolvemos su código real
  if (name === userCountry) return userCountryCode;

  // Algunos nombres comunes traducidos
  const known = {
    "Estados Unidos": "US",
    "Reino Unido": "GB",
    "Emiratos Árabes Unidos": "AE",
    "Corea del Sur": "KR",
    "Corea del Norte": "KP",
    "República Checa": "CZ",
    "República Dominicana": "DO",
    "Brasil": "BR",
    "España": "ES",
    "México": "MX",
    "Argentina": "AR",
    "Chile": "CL",
    "Perú": "PE",
    "Colombia": "CO",
    "Venezuela": "VE",
    "Uruguay": "UY",
    "Paraguay": "PY",
    "Ecuador": "EC",
    "Bolivia": "BO",
  };
  return known[name] || "UN";
}

// 🔁 Inicialización
(async function init() {
  await detectCountry();
  await loadLeaderboard();
  await loadGlobalClicks();

  // refresca datos en segundo plano
  setInterval(loadLeaderboard, 10000);
  setInterval(loadGlobalClicks, 15000);
})();
