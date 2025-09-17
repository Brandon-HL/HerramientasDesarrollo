(() => {
  const form = document.getElementById('form');
  if (!form) return;

  const nombre = document.getElementById('nombre');
  const correo = document.getElementById('correo');
  const telefono = document.getElementById('telefono');

  const errNombre = document.getElementById('error-nombre');
  const errCorreo = document.getElementById('error-correo');
  const errTelefono = document.getElementById('error-telefono');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const phoneRegex = /^[0-9\s+()\-]{6,}$/;

  const setError = (input, container, message) => {
    container.textContent = message;
    input.classList.toggle('is-invalid', Boolean(message));
    input.classList.toggle('is-valid', !message);
  };

  const clearAll = () => {
    setError(nombre, errNombre, '');
    setError(correo, errCorreo, '');
    setError(telefono, errTelefono, '');
    document.getElementById('msg').textContent = '';
  };

  const validate = () => {
    let valid = true;
    clearAll();

    const vNombre = nombre.value.trim();
    if (vNombre.length < 3) {
      setError(nombre, errNombre, 'Error');
      valid = false;
    }

    const vCorreo = correo.value.trim();
    if (!emailRegex.test(vCorreo)) {
      setError(correo, errCorreo, 'Ingresa un correo válido.');
      valid = false;
    }

    const vTelefono = telefono.value.trim();
    if (!phoneRegex.test(vTelefono)) {
      setError(telefono, errTelefono, 'Ingresa un teléfono válido.');
      valid = false;
    }

    return valid;
  };

  ['input', 'blur'].forEach(evt => {
    nombre.addEventListener(evt, () => validate());
    correo.addEventListener(evt, () => validate());
    telefono.addEventListener(evt, () => validate());
  });

  form.addEventListener('submit', (e) => {
    if (!validate()) {
      e.preventDefault();
      document.getElementById('msg').textContent = 'Revisa los campos marcados en rojo.';
    }
  });
})();
  