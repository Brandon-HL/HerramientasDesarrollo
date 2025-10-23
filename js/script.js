// js/script.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnText = document.getElementById("btnText");
  const btnSpin = document.getElementById("btnSpin");
  const msg = document.getElementById("msg");
  const tableBody = document.querySelector("#tableInscripciones tbody");

  // auth elements (existen en tu HTML)
  const formRegister = document.getElementById("formRegister");
  const formLogin = document.getElementById("formLogin");
  const btnOpenLogin = document.getElementById("btnOpenLogin");
  const btnOpenRegister = document.getElementById("btnOpenRegister");

  // links inside modals
  const openForgot = document.getElementById("openForgot");
  const openRegisterFromLogin = document.getElementById("openRegisterFromLogin");

  // Chart placeholders
  let chartInscripciones = null;
  let chartTopCursos = null;
  let chartSatisfaccion = null;

  // ---------- Helpers ----------
  function setLoading(on) {
    if (on) {
      btnSpin.classList.remove("d-none");
      btnText.textContent = "Enviando...";
    } else {
      btnSpin.classList.add("d-none");
      btnText.textContent = "Enviar solicitud";
    }
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // token helpers
  function getToken() { return localStorage.getItem("token"); }
  function setToken(token) { if (token) localStorage.setItem("token", token); else localStorage.removeItem("token"); }
  function authHeaders() {
    const h = { "Content-Type": "application/json" };
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }

  // ---------- Bootstrap modal helpers (abrir/cerrar) ----------
  function showModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = new bootstrap.Modal(el);
    modal.show();
    return modal;
  }
  function hideModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const inst = bootstrap.Modal.getInstance(el);
    if (inst) inst.hide();
  }

  // ---------- Render user in header ----------
  function renderUserInHeader(user) {
    const headerActions = document.querySelector(".main-header .d-flex.align-items-center.gap-3");
    if (!headerActions) return;

    const existing = document.getElementById("headerUserBox");
    if (existing) existing.remove();

    if (!user) {
      if (btnOpenLogin) btnOpenLogin.classList.remove("d-none");
      if (btnOpenRegister) btnOpenRegister.classList.remove("d-none");
      return;
    }

    if (btnOpenLogin) btnOpenLogin.classList.add("d-none");
    if (btnOpenRegister) btnOpenRegister.classList.add("d-none");

    const div = document.createElement("div");
    div.id = "headerUserBox";
    div.className = "d-flex align-items-center gap-2";
    div.innerHTML = `
      <div class="small text-white-50">Hola, <strong>${escapeHtml(user.nombre)}</strong></div>
      <button id="btnLogout" class="btn btn-outline-light btn-sm">Cerrar sesión</button>
    `;
    headerActions.appendChild(div);

    document.getElementById("btnLogout").addEventListener("click", () => {
      setToken(null);
      renderUserInHeader(null);
    });
  }

  // ---------- Inscripciones & Graficos ----------
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
      console.error("fetchInscripciones:", err);
    }
  }

  async function fetchGraficos() {
    try {
      const [insResp, homeResp] = await Promise.all([
        fetch("/api/inscripciones/ultimos6meses"),
        fetch("/api/metricas/home")
      ]);
      const insData = await insResp.json();
      const home = await homeResp.json();

      // Chart Inscripciones
      const ctx = document.getElementById("chartInscripciones").getContext("2d");
      if (chartInscripciones) chartInscripciones.destroy();
      chartInscripciones = new Chart(ctx, {
        type: "line",
        data: { labels: insData.labels, datasets: [{ label: "Inscripciones", data: insData.counts, tension: 0.3, fill: true }] },
        options: { responsive: true }
      });

      // Top cursos demo
      const ctx2 = document.getElementById("chartTopCursos").getContext("2d");
      if (chartTopCursos) chartTopCursos.destroy();
      chartTopCursos = new Chart(ctx2, {
        type: "bar",
        data: { labels: ["Inteligencia Emocional","Mindfulness","Comunicación","Crecimiento"], datasets: [{ label: "Alumnos", data: [120,90,75,60] }] },
        options: { responsive: true }
      });

      // Satisfacción demo
      const ctx3 = document.getElementById("chartSatisfaccion").getContext("2d");
      if (chartSatisfaccion) chartSatisfaccion.destroy();
      chartSatisfaccion = new Chart(ctx3, {
        type: "doughnut",
        data: { labels: ["Satisfechos","Neutrales/No"], datasets: [{ label: "Satisfacción", data: [98,2] }] },
        options: { responsive: true }
      });

      // actualizar tarjetas
      try {
        const statValues = document.querySelectorAll(".stat-card .stat-value");
        if (statValues.length >= 4) {
          statValues[0].textContent = home.alumnos || 0;
          statValues[1].textContent = home.cursos || 0;
          statValues[2].textContent = home.paises || 0;
          statValues[3].textContent = home.satisfaccion || "98%";
        }
      } catch(e){ /* ignore */ }

    } catch (err) {
      console.error("Error graficos:", err);
    }
  }

  // ---------- Formulario inscripcion ----------
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

  // ---------- AUTH: Register ----------
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = document.getElementById("regName").value.trim();
      const correo = document.getElementById("regEmail").value.trim();
      const telefono = document.getElementById("regPhone").value.trim();
      const contrasena = document.getElementById("regPassword").value;

      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, correo, contrasena, telefono })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al registrar");

        setToken(data.token);
        renderUserInHeader(data.user);

        // cerrar modal robusto
        hideModalById("modalRegister");

        formRegister.reset();
      } catch (err) {
        console.error("register:", err);
        alert(err.message || "Error registro");
      }
    });
  }

  // ---------- AUTH: Login ----------
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = document.getElementById("loginEmail").value.trim();
      const contrasena = document.getElementById("loginPassword").value;

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo, contrasena })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

        setToken(data.token);
        renderUserInHeader(data.user);

        hideModalById("modalLogin");
        formLogin.reset();
      } catch (err) {
        console.error("login:", err);
        alert(err.message || "Error login");
      }
    });
  }

  // ---------- Event listeners para abrir modales (soluciona "no pasa nada" al hacer clic) ----------
  if (btnOpenLogin) {
    btnOpenLogin.addEventListener("click", (e) => {
      e.preventDefault();
      showModalById("modalLogin");
    });
  }
  if (btnOpenRegister) {
    btnOpenRegister.addEventListener("click", (e) => {
      e.preventDefault();
      showModalById("modalRegister");
    });
  }

  // abrir modal "olvidaste" desde login
  if (openForgot) {
    openForgot.addEventListener("click", (e) => {
      e.preventDefault();
      hideModalById("modalLogin");
      showModalById("modalForgot");
    });
  }
  // abrir registro desde login modal
  if (openRegisterFromLogin) {
    openRegisterFromLogin.addEventListener("click", (e) => {
      e.preventDefault();
      hideModalById("modalLogin");
      showModalById("modalRegister");
    });
  }

  // ---------- Restaurar sesión ----------
  async function tryRestoreSession() {
    const token = getToken();
    if (!token) {
      renderUserInHeader(null);
      return;
    }
    try {
      const res = await fetch("/api/me", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No autorizado");
      renderUserInHeader(data.user);
    } catch (err) {
      console.warn("No se pudo restaurar sesión:", err);
      setToken(null);
      renderUserInHeader(null);
    }
  }

  // inicializar
  fetchInscripciones();
  fetchGraficos();
  tryRestoreSession();

  // export para debug
  window.__app = { fetchInscripciones, fetchGraficos, tryRestoreSession };
});
