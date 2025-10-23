// server.js
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "landingpage_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- Registro de usuario ---
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, contrasena, telefono } = req.body;
    if (!nombre || !correo || !contrasena) return res.status(400).json({ error: "Faltan datos" });

    const hashed = await bcrypt.hash(contrasena, 10);
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)",
      [nombre, correo, hashed]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Correo ya registrado" });
    res.status(500).json({ error: "Error del servidor" });
  }
});

// --- Login simple (demo) ---
app.post("/api/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) return res.status(400).json({ error: "Faltan datos" });

    const [rows] = await pool.query("SELECT id, nombre, correo, contrasena, rol FROM usuarios WHERE correo = ?", [correo]);
    if (rows.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });

    const user = rows[0];
    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) return res.status(401).json({ error: "Credenciales inválidas" });

    // Demo -> devolvemos info básica (en producción usar JWT)
    delete user.contrasena;
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// --- Insertar inscripcion (formulario de la landing) ---
app.post("/api/inscripciones", async (req, res) => {
  try {
    const { nombre, correo, telefono, mensaje } = req.body;
    if (!nombre || !correo) return res.status(400).json({ error: "Nombre y correo obligatorios" });

    const [result] = await pool.query(
      "INSERT INTO inscripciones (nombre, correo, telefono, mensaje) VALUES (?, ?, ?, ?)",
      [nombre, correo, telefono || null, mensaje || null]
    );

    // opcional: insertar métrica
    await pool.query("INSERT INTO metricas (tipo, valor) VALUES (?, ?)", ["inscripcion", 1]);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar" });
  }
});

// --- Listar últimas inscripciones ---
app.get("/api/inscripciones", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, telefono, mensaje, fecha FROM inscripciones ORDER BY fecha DESC LIMIT 100");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar" });
  }
});

// --- Datos para inscripciones últimos 6 meses (para Chart.js) ---
app.get("/api/inscripciones/ultimos6meses", async (req, res) => {
  try {
    // MySQL: agrupa por año+mes, trae últimos 6 meses
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(fecha, '%Y-%m') AS ym, COUNT(*) AS total
      FROM inscripciones
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY ym
      ORDER BY ym ASC
    `);

    // Queremos 6 puntos (incluso si algunos meses 0)
    const labels = [];
    const counts = [];
    // construir lista de últimos 6 meses
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, "0");
      months.push(`${y}-${m}`);
    }
    const map = {};
    rows.forEach(r => map[r.ym] = r.total);
    months.forEach(m => {
      labels.push(m);
      counts.push(map[m] ? Number(map[m]) : 0);
    });

    res.json({ labels, counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar datos" });
  }
});

// --- Métricas rápidas para tarjetas (alumnos, cursos, paises, satisfacción) ---
// Not all values exist in DB; aquí calculamos algunos basicos desde tablas que sí tienes
app.get("/api/metricas/home", async (req, res) => {
  try {
    // alumnos = total inscripciones (o usuarios según prefieras)
    const [[alumnos]] = await pool.query("SELECT COUNT(*) AS total FROM inscripciones");
    const [[usuarios]] = await pool.query("SELECT COUNT(*) AS total FROM usuarios");
    // cursos y paises no están en BD -> devolvemos valores demo o 0
    const cursos = 12; // si no está en BD, deja un valor estático o crea tabla cursos
    const paises = 5;
    // satisfacción: calculo demo desde metricas tipo 'satisfaccion' si existiera
    const [[satRow]] = await pool.query("SELECT AVG(valor) AS avgSat FROM metricas WHERE tipo = 'satisfaccion'");
    const satisfaccion = satRow && satRow.avgSat ? Math.round(satRow.avgSat) + "%" : "98%";

    res.json({
      alumnos: alumnos.total,
      usuarios: usuarios.total,
      cursos,
      paises,
      satisfaccion
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener métricas" });
  }
});

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde la carpeta raíz del proyecto
app.use(express.static(path.join(__dirname, "../"))); // <-- ajusta la ruta según dónde está tu index.html

// Si alguien entra a "/", devuelve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
