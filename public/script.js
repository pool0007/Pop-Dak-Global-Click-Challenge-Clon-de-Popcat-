const counter = document.getElementById("counter");
const leaderboard = document.getElementById("leaderboard");
const cat = document.getElementById("cat");
const pop = document.getElementById("pop");

let count = 0;
let country = "Unknown";

// Detectar país automáticamente
fetch("https://ipapi.co/json/")
  .then(r => r.json())
  .then(data => {
    country = data.country_name || "Unknown";
  })
  .catch(() => { country = "Unknown"; });

// Al hacer clic
cat.addEventListener("click", async () => {
  count++;
  counter.textContent = count;
  pop.currentTime = 0;
  pop.play();

  // Cada 10 clics enviamos al servidor
  if (count % 10 === 0) {
    try {
      await fetch("/api/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, clicks: 10 })
      });
      updateLeaderboard();
    } catch (err) {
      console.error("❌ Error enviando clics:", err);
    }
  }
});

async function updateLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    leaderboard.innerHTML = "";
    data.forEach((row, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${row.country}: ${row.clicks.toLocaleString()}`;
      leaderboard.appendChild(li);
    });
  } catch (err) {
    console.error("❌ Error cargando leaderboard:", err);
  }
}

updateLeaderboard();
setInterval(updateLeaderboard, 15000); // Actualiza cada 15 segundos
