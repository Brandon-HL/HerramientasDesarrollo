document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) return redirectToHome();

  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const adminUserName = document.getElementById("adminUserName");
  const adminLogout = document.getElementById("adminLogout");
  const cardUsers = document.getElementById("cardUsers");
  const cardIns = document.getElementById("cardIns");
  const cardIngresos = document.getElementById("cardIngresos");

  const tableUsers = document.querySelector("#tableUsers tbody");
  const tableInsAdmin = document.querySelector("#tableInscripcionesAdmin tbody");
  const tableMetricas = document.querySelector("#tableMetricas tbody");

  let chartIns = null;

  adminLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });

  // Verificar /api/me y rol
  (async function init() {
    try {
      const meRes = await fetch("/api/me", { headers });
      const meData = await meRes.json();
      if (!meRes.ok || !meData.user || meData.user.rol !== "admin") return redirectToHome();
      adminUserName.textContent = meData.user.nombre || meData.user.correo || "Admin";

      await loadAll();
    } catch (err) {
      console.error("init admin:", err);
      redirectToHome();
    }
  })();

  function redirectToHome() { window.location.href = "index.html"; }

  async function loadAll() {
    await Promise.all([loadUsers(), loadInscripciones(), loadMetricas(), loadChartData()]);
    await loadIngresos();
  }

  //Users 
  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users", { headers });
      const rows = await res.json();
      cardUsers.textContent = rows.length;
      tableUsers.innerHTML = "";
      rows.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(u.nombre)}</td>
          <td>${escapeHtml(u.correo)}</td>
          <td>${u.rol === 'admin' ? '<span class="badge badge-role-admin">admin</span>' : '<span class="text-muted">usuario</span>'}</td>
          <td class="table-actions">
            ${u.rol !== 'admin' ? `<button class="btn btn-sm btn-outline-success btnPromote" data-id="${u.id}">Promover</button>` : `<button class="btn btn-sm btn-outline-secondary btnDemote" data-id="${u.id}">Demover</button>`}
            <button class="btn btn-sm btn-outline-danger btnDeleteUser" data-id="${u.id}">Eliminar</button>
          </td>
        `;
        tableUsers.appendChild(tr);
      });

      //listeners
      tableUsers.querySelectorAll(".btnPromote").forEach(btn => btn.addEventListener("click", promoteUser));
      tableUsers.querySelectorAll(".btnDemote").forEach(btn => btn.addEventListener("click", demoteUser));
      tableUsers.querySelectorAll(".btnDeleteUser").forEach(btn => btn.addEventListener("click", deleteUser));
    } catch (err) {
      console.error("loadUsers:", err);
    }
  }

  async function promoteUser(e) {
    const id = e.target.dataset.id;
    if (!confirm("Promover a admin?")) return;
    await fetch(`/api/admin/users/${id}/role`, { method: "PUT", headers, body: JSON.stringify({ rol: "admin" }) });
    await loadUsers();
  }
  async function demoteUser(e) {
    const id = e.target.dataset.id;
    if (!confirm("Quitar rol de admin?")) return;
    await fetch(`/api/admin/users/${id}/role`, { method: "PUT", headers, body: JSON.stringify({ rol: "usuario" }) });
    await loadUsers();
  }
  async function deleteUser(e) {
    const id = e.target.dataset.id;
    if (!confirm("Eliminar usuario permanentemente?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers });
    await loadUsers();
  }

  //Inscripciones 
  async function loadInscripciones() {
    try {
      const res = await fetch("/api/admin/inscripciones", { headers });
      const rows = await res.json();
      cardIns.textContent = rows.length;
      tableInsAdmin.innerHTML = "";
      rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(r.nombre)}</td>
          <td>${escapeHtml(r.correo)}</td>
          <td>${escapeHtml(r.telefono || '')}</td>
          <td>${new Date(r.fecha).toLocaleString()}</td>
          <td><button class="btn btn-sm btn-outline-danger btnDelIns" data-id="${r.id}">Eliminar</button></td>
        `;
        tableInsAdmin.appendChild(tr);
      });
      tableInsAdmin.querySelectorAll(".btnDelIns").forEach(b => b.addEventListener("click", deleteIns));
    } catch (err) {
      console.error("loadInscripciones:", err);
    }
  }
  async function deleteIns(e) {
    const id = e.target.dataset.id;
    if (!confirm("Eliminar esta inscripción?")) return;
    await fetch(`/api/admin/inscripciones/${id}`, { method: "DELETE", headers });
    await loadInscripciones();
    await loadChartData();
  }

  // Metricas 
  async function loadMetricas() {
    try {
      const res = await fetch("/api/admin/metricas", { headers });
      const rows = await res.json();
      tableMetricas.innerHTML = "";
      rows.slice(0,100).forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${escapeHtml(m.tipo)}</td><td>${escapeHtml(String(m.valor))}</td><td>${new Date(m.fecha).toLocaleString()}</td>`;
        tableMetricas.appendChild(tr);
      });
    } catch (err) {
      console.error("loadMetricas", err);
    }
  }

  //Ingresos 
  async function loadIngresos() {
    try {
      const res = await fetch("/api/admin/compras", { headers });
      const rows = await res.json();
      const total = rows.reduce((s, r) => s + Number(r.monto || 0), 0);
      cardIngresos.textContent = `S/ ${Number(total).toFixed(2)}`;
    } catch (err) {
      console.error("loadIngresos:", err);
    }
  }

  //Chart: inscripciones últimos 6 meses 
  async function loadChartData() {
    try {
      const res = await fetch("/api/inscripciones/ultimos6meses");
      const data = await res.json();
      const ctx = document.getElementById("adminChartInscripciones").getContext("2d");
      if (chartIns) chartIns.destroy();
      chartIns = new Chart(ctx, {
        type: "line",
        data: { labels: data.labels, datasets: [{ label: "Inscripciones", data: data.counts, fill: true, tension: 0.3 }] },
        options: { responsive: true }
      });
    } catch (err) {
      console.error("loadChartData:", err);
    }
  }

  // small helper
  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
});
