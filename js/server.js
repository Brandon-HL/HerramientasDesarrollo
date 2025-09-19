
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");


const app = express();


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "landingpage_db"
});


db.connect(err => {
  if (err) {
    console.error("❌ Error de conexión a MySQL:", err);
    process.exit(1);
  }
  console.log("✅ Conectado a MySQL (landingpage_db)");
});


app.post("/api/inscripcion", (req, res) => {
  const { nombre, correo, telefono, mensaje } = req.body;

  if (!nombre || !correo) {
    return res.status(400).send("⚠ Nombre y correo son obligatorios.");
  }

  const sql = "INSERT INTO inscripciones (nombre, correo, telefono, mensaje) VALUES (?, ?, ?, ?)";
  db.query(sql, [nombre, correo, telefono, mensaje], (err, result) => {
    if (err) {
      console.error("❌ Error al insertar:", err);
      return res.status(500).send("Error al guardar en la base de datos.");
    }
    console.log("📩 Nueva inscripción guardada:", { nombre, correo });
    res.send(" ¡Tu mensaje fue enviado con éxito!");
  });
});


app.get("/api/inscripciones", (req, res) => {
  const sql = "SELECT * FROM inscripciones ORDER BY fecha DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error al consultar:", err);
      return res.status(500).send("Error al obtener inscripciones.");
    }
    res.json(results);
  });
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
