document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const msg = document.getElementById("msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

   
    const data = {
      nombre: document.getElementById("nombre").value.trim(),
      correo: document.getElementById("correo").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      mensaje: document.getElementById("mensaje").value.trim(),
    };


    if (!data.nombre || !data.correo) {
      msg.textContent = "⚠ Por favor completa los campos obligatorios.";
      msg.style.color = "red";
      return;
    }

    try {
      
      const response = await fetch("http://localhost:3000/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.text();

      if (response.ok) {
        msg.textContent = result;
        msg.style.color = "green";
        form.reset();
      } else {
        msg.textContent = "❌ Error: " + result;
        msg.style.color = "red";
      }
    } catch (error) {
      console.error("Error:", error);
      msg.textContent = "❌ No se pudo conectar al servidor.";
      msg.style.color = "red";
    }
  });
});


