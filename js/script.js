// js/script.js
// - Formularios profesionales (validación básica + spinner)
// - Header: botones Iniciar sesión / Crear cuenta claramente visibles y funcionales
// - Mobile menu toggle
// - Login/Register/Reset (demo localStorage)
// - Dashboard: charts mock y carga tabla de inscripciones (fetch o mock)

// Notas: El formulario POST a /api/inscripcion y la tabla GET /api/inscripciones.
// Ajusta URLs si tu servidor está en otro host/puerto.

document.addEventListener("DOMContentLoaded", () => {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

  // Elements
  const form = $("#formulario");
  const msg = $("#msg");
  const btnSpin = $("#btnSpin");
  const btnText = $("#btnText");

  // Mobile menu
  const mobileBtn = $("#mobileMenuBtn");
  const mobileNav = $("#mobileNav");
  mobileBtn?.addEventListener("click", () => {
    if (!mobileNav) return;
    mobileNav.classList.toggle("d-none");
    mobileNav.classList.toggle("show");
  });

  // Modals
  const modalLogin = new bootstrap.Modal($("#modalLogin"));
  const modalRegister = new bootstrap.Modal($("#modalRegister"));
  const modalForgot = new bootstrap.Modal($("#modalForgot"));

  // Header buttons
  $("#btnOpenLogin")?.addEventListener("click", () => modalLogin.show());
  $("#btnOpenRegister")?.addEventListener("click", () => modalRegister.show());

  // In-modal links
  $("#openRegisterFromLogin")?.addEventListener("click", (e) => { e.preventDefault(); modalLogin.hide(); modalRegister.show(); });
  $("#openForgot")?.addEventListener("click", (e) => { e.preventDefault(); modalLogin.hide(); modalForgot.show(); });

  // Helper status
  function setStatus(text, color = "") {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = color;
  }

  // FORM submit
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", "");
      const nombre = $("#nombre").value.trim();
      const correo = $("#correo").value.trim();
      const telefono = $("#telefono").value.trim();
      const mensaje = $("#mensaje").value.trim();

      if (!nombre || !correo) { setStatus("⚠ Completa los campos obligatorios.", "red"); return; }
      if (!emailRegex.test(correo)) { setStatus("⚠ Ingresa un correo válido.", "red"); return; }
      if (telefono && !phoneRegex.test(telefono)) { setStatus("⚠ Ingresa un teléfono válido.", "red"); return; }

      // spinner
      btnSpin.classList.remove("d-none");
      btnText.textContent = "Enviando...";

      try {
        const res = await fetch("/api/inscripcion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, correo, telefono, mensaje })
        });

        let respText = "";
        try { respText = (await res.json()).message || ""; } catch { respText = await res.text(); }

        if (res.ok) {
          setStatus(respText || "¡Tu solicitud fue enviada! Te contactaremos pronto.", "green");
          form.reset();
          loadInscripciones();
        } else {
          setStatus("❌ Error: " + (respText || "Error del servidor"), "red");
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ No se pudo conectar al servidor.", "red");
      } finally {
        btnSpin.classList.add("d-none");
        btnText.textContent = "Enviar solicitud";
      }
    });
  }

  /* ---------- AUTH (demo con localStorage) ---------- */
  function getUsers(){ try { return JSON.parse(localStorage.getItem("ms_users")||"[]"); } catch { return []; } }
  function saveUser(u){ const arr = getUsers(); arr.push(u); localStorage.setItem("ms_users", JSON.stringify(arr)); }
  function findUser(email){ return getUsers().find(x => x.email === email); }

  $("#formRegister")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#regName").value.trim();
    const email = $("#regEmail").value.trim();
    const phone = $("#regPhone").value.trim();
    const pass = $("#regPassword").value;
    if (!name || !email || !pass) { alert("Completa los campos requeridos."); return; }
    if (!emailRegex.test(email)) { alert("Correo inválido."); return; }
    if (findUser(email)) { alert("El correo ya está registrado."); return; }
    saveUser({ name, email, phone, password: pass });
    alert("Cuenta creada. Inicia sesión.");
    modalRegister.hide();
    $("#regName").value = $("#regEmail").value = $("#regPhone").value = $("#regPassword").value = "";
    modalLogin.show();
  });

  $("#formLogin")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#loginEmail").value.trim();
    const pass = $("#loginPassword").value;
    const u = findUser(email);
    if (!u || u.password !== pass) { alert("Credenciales incorrectas."); return; }
    localStorage.setItem("ms_current", JSON.stringify({ name: u.name, email: u.email }));
    modalLogin.hide();
    $("#loginEmail").value = $("#loginPassword").value = "";
    onLogin();
  });

  $("#btnSendReset")?.addEventListener("click", () => {
    const email = $("#forgotEmail").value.trim();
    if (!emailRegex.test(email)) { alert("Ingresa un correo válido."); return; }
    const u = findUser(email);
    if (!u) { alert("Si el correo está registrado recibirás instrucciones (demo)."); return; }
    $("#forgotStep1").classList.add("d-none");
    $("#forgotStep2").classList.remove("d-none");
  });

  $("#btnResetConfirm")?.addEventListener("click", () => {
    const newPass = $("#resetPassword").value;
    const email = $("#forgotEmail").value.trim();
    if (!newPass) { alert("Ingresa la nueva contraseña."); return; }
    const users = getUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) { alert("Usuario no encontrado."); return; }
    users[idx].password = newPass;
    localStorage.setItem("ms_users", JSON.stringify(users));
    alert("Contraseña actualizada (demo). Inicia sesión.");
    $("#resetPassword").value = ""; $("#forgotEmail").value = "";
    $("#forgotStep2").classList.add("d-none"); $("#forgotStep1").classList.remove("d-none");
    modalForgot.hide(); modalLogin.show();
  });

  function onLogin(){
    const cur = JSON.parse(localStorage.getItem("ms_current") || "null");
    if (cur) {
      location.hash = "#dashboard";
    }
  }
  onLogin();

  /* ---------- Charts (mock) ---------- */
  const ctxIns = document.getElementById("chartInscripciones");
  const ctxTop = document.getElementById("chartTopCursos");
  const ctxSat = document.getElementById("chartSatisfaccion");
  let chartIns, chartTop, chartSat;

  function renderCharts(){
    const labels = ["Abr","May","Jun","Jul","Ago","Sep"];
    const dataIns = [24,32,18,40,28,35];

    if (ctxIns) {
      if (chartIns) chartIns.destroy();
      chartIns = new Chart(ctxIns, {
        type: "line",
        data: { labels, datasets:[{ label:"Inscripciones", data: dataIns, fill:true, backgroundColor:"rgba(111,108,217,0.12)", borderColor:"rgba(111,108,217,1)", tension:0.35, pointRadius:4 }] },
        options: { responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
      });
    }

    if (ctxTop) {
      if (chartTop) chartTop.destroy();
      chartTop = new Chart(ctxTop, {
        type: "doughnut",
        data: { labels:["IE","Mindfulness","Asertividad","Crecimiento"], datasets:[{ data:[120,90,60,45], backgroundColor:["#6f6cd9","#4D96FF","#FFD93D","#DDA0DD"] }] },
        options: { responsive:true, plugins:{ legend:{ position:"bottom" } } }
      });
    }

    if (ctxSat) {
      if (chartSat) chartSat.destroy();
      chartSat = new Chart(ctxSat, {
        type: "doughnut",
        data: { labels:["Satisfacción","Resto"], datasets:[{ data:[4.6,0.4], backgroundColor:["rgba(111,108,217,1)","rgba(0,0,0,0.06)"] }] },
        options: { responsive:true, cutout: "70%", plugins:{ legend:{ display:false } } }
      });
    }
  }
  renderCharts();

  /* ---------- Tabla inscripciones (fetch o mock) ---------- */
  async function loadInscripciones(){
    const tbody = $("#tableInscripciones tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    try {
      const res = await fetch("/api/inscripciones");
      if (!res.ok) throw new Error("no api");
      const arr = await res.json();
      if (!Array.isArray(arr) || arr.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>No hay inscripciones.</td></tr>";
        return;
      }
      arr.slice(0,10).forEach(row => {
        let correo = row.correo || "";
        if (correo.includes("@")) correo = correo.split("@")[0] + "@gmail.com";
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.nombre||""}</td><td>${correo}</td><td>${row.telefono||""}</td><td>${row.fecha||""}</td>`;
        tbody.appendChild(tr);
      });
    } catch (err) {
      // fallback demo data
      const mock = [
        { nombre:"María P.", correo:"maria@gmail.com", telefono:"987654321", fecha:"2025-09-01" },
        { nombre:"Carlos R.", correo:"carlos@gmail.com", telefono:"999888777", fecha:"2025-09-03" },
        { nombre:"Laura G.", correo:"laura@gmail.com", telefono:"987123456", fecha:"2025-09-05" }
      ];
      mock.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${r.nombre}</td><td>${r.correo}</td><td>${r.telefono}</td><td>${r.fecha}</td>`;
        tbody.appendChild(tr);
      });
    }
  }
  loadInscripciones();

  // re-render charts when opening dashboard
  window.addEventListener("hashchange", () => {
    if (location.hash === "#dashboard") {
      renderCharts(); loadInscripciones();
    }
  });
});
