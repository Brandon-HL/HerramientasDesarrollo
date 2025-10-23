// js/script.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnText = document.getElementById("btnText");
  const btnSpin = document.getElementById("btnSpin");
  const msg = document.getElementById("msg");
  const tableBody = document.querySelector("#tableInscripciones tbody");

  // Chart instances placeholders
  let chartInscripciones = null;
  let chartTopCursos = null;
  let chartSatisfaccion = null;

  // Helpers UI
  function setLoading(on) {
    if (on) {
      btnSpin.classList.remove("d-none");
      btnText.textContent = "Enviando...";
    } else {
      btnSpin.classList.add("d-none");
      btnText.textContent = "Enviar solicitud";
    }
  }

  // fetch últimas inscripciones y render tabla
  async function fetchInscripciones() {
    try {
      const res = await fetch("/api/inscripciones");
      const data = await res.json();
      tableBody.innerHTML = "";
      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${escapeHtml(row.nombre)}</td><td>${escapeHtml(row.correo)}</td><td>${escapeHtml(row.telefono || '')}</td><td>${new Date(row.fecha).toLocaleString()}</td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // fetch datos para graficos
  async function fetchGraficos() {
    try {
      const [insResp, homeResp] = await Promise.all([
        fetch("/api/inscripciones/ultimos6meses"),
        fetch("/api/metricas/home")
      ]);
      const insData = await insResp.json();
      const home = await homeResp.json();

      // Chart Inscripciones (line)
      const ctx = document.getElementById("chartInscripciones").getContext("2d");
      if (chartInscripciones) chartInscripciones.destroy();
      chartInscripciones = new Chart(ctx, {
        type: "line",
        data: {
          labels: insData.labels,
          datasets: [{ label: "Inscripciones", data: insData.counts, tension: 0.3, fill: true }]
        },
        options: { responsive: true }
      });

      // Top cursos -> demo: usaremos datos estáticos si no hay endpoint
      const ctx2 = document.getElementById("chartTopCursos").getContext("2d");
      if (chartTopCursos) chartTopCursos.destroy();
      chartTopCursos = new Chart(ctx2, {
        type: "bar",
        data: {
          labels: ["Inteligencia Emocional", "Mindfulness", "Comunicación", "Crecimiento"],
          datasets: [{ label: "Alumnos", data: [120, 90, 75, 60] }]
        },
        options: { responsive: true }
      });

      // Satisfacción demo
      const ctx3 = document.getElementById("chartSatisfaccion").getContext("2d");
      if (chartSatisfaccion) chartSatisfaccion.destroy();
      chartSatisfaccion = new Chart(ctx3, {
        type: "doughnut",
        data: {
          labels: ["Satisfechos", "Neutrales/No"],
          datasets: [{ label: "Satisfacción", data: [98, 2] }]
        },
        options: { responsive: true }
      });

      // actualizar tarjetas del dashboard (si existen)
      try {
        document.querySelector(".stat-card .stat-value").textContent = home.alumnos || 0;
        // es posible que tu HTML tenga varias stat-value, mejor seleccionar por posición:
        const statValues = document.querySelectorAll(".stat-card .stat-value");
        if (statValues.length >= 4) {
          statValues[0].textContent = home.alumnos || 0; // alumnos
          statValues[1].textContent = home.cursos || 0;  // cursos
          statValues[2].textContent = home.paises || 0;  // paises
          statValues[3].textContent = home.satisfaccion || "98%"; // satisfaccion
        }
      } catch(e){/* ignore if structure changes */}


    } catch (err) {
      console.error("Error graficos:", err);
    }
  }

  // enviar formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setLoading(true);
    msg.textContent = "";
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const mensaje = document.getElementById("mensaje").value.trim();

    try {
      const res = await fetch("/api/inscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, telefono, mensaje })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      msg.className = "mt-3 text-center fw-semibold text-success";
      msg.textContent = "¡Solicitud enviada! Nos pondremos en contacto.";
      form.reset();
      await fetchInscripciones();
      await fetchGraficos();
    } catch (err) {
      console.error(err);
      msg.className = "mt-3 text-center fw-semibold text-danger";
      msg.textContent = "Error al enviar. Intenta nuevamente.";
    } finally {
      setLoading(false);
      setTimeout(()=> msg.textContent = "", 5000);
    }
  });

  // escape simple para inyección en tabla
  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // init
  fetchInscripciones();
  fetchGraficos();
});
