document.getElementById("form").addEventListener("submit", function(e) {
    const nombre = document.querySelector("input[name='nombre']").value.trim();
    const correo = document.querySelector("input[name='correo']").value.trim();
    const telefono = document.querySelector("input[name='telefono']").value.trim();
  
    if (nombre.length < 3) {
      e.preventDefault();
      document.getElementById("msg").textContent = "⚠️ El nombre debe tener al menos 3 caracteres.";
    } else if (!correo.includes("@")) {
      e.preventDefault();
      document.getElementById("msg").textContent = "⚠️ Ingresa un correo válido.";
    } else if (telefono.length < 6 || isNaN(telefono)) {
      e.preventDefault();
      document.getElementById("msg").textContent = "⚠️ Ingresa un teléfono válido.";
    }
  });
  