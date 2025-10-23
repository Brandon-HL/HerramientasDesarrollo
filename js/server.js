// server.js (reemplaza tu archivo actual por este)
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helpers JWT
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_this";
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Middleware para rutas protegidas
async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" });
  const token = auth.substring(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });

  // opcional: cargar usuario desde DB
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, rol, fecha_registro FROM usuarios WHERE id = ?", [payload.id]);
    if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
    req.user = rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
}

// ---------- RUTAS DE AUTENTICACIÓN ----------

// Registro -> guarda usuario y devuelve token + user (sin contraseña)
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, contrasena, telefono } = req.body;
    if (!nombre || !correo || !contrasena) return res.status(400).json({ error: "Faltan datos" });

    const hashed = await bcrypt.hash(contrasena, 10);
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)",
      [nombre, correo, hashed]
    );

    const userId = result.insertId;
    const token = signToken({ id: userId, correo });

    // devolver usuario sin contrasena
    const [rows] = await pool.query("SELECT id, nombre, correo, rol, fecha_registro FROM usuarios WHERE id = ?", [userId]);
    const user = rows[0];

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Correo ya registrado" });
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Login -> compara contraseña y devuelve token + user
app.post("/api/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) return res.status(400).json({ error: "Faltan datos" });

    const [rows] = await pool.query("SELECT id, nombre, correo, contrasena, rol FROM usuarios WHERE correo = ?", [correo]);
    if (rows.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });

    const userRow = rows[0];
    const match = await bcrypt.compare(contrasena, userRow.contrasena);
    if (!match) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = signToken({ id: userRow.id, correo: userRow.correo });

    const user = {
      id: userRow.id,
      nombre: userRow.nombre,
      correo: userRow.correo,
      rol: userRow.rol
    };

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Ruta para obtener datos del usuario logueado
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ---------- ENDPOINTS EXISTENTES (inscripciones, métricas, etc) ----------

// Insertar inscripcion (formulario público)
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

// Listar últimas inscripciones
app.get("/api/inscripciones", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, telefono, mensaje, fecha FROM inscripciones ORDER BY fecha DESC LIMIT 100");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar" });
  }
});

// Inscripciones últimos 6 meses
app.get("/api/inscripciones/ultimos6meses", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(fecha, '%Y-%m') AS ym, COUNT(*) AS total
      FROM inscripciones
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY ym
      ORDER BY ym ASC
    `);

    const labels = [];
    const counts = [];
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

// Métricas rápidas para tarjetas del home
app.get("/api/metricas/home", async (req, res) => {
  try {
    const [[alumnos]] = await pool.query("SELECT COUNT(*) AS total FROM inscripciones");
    const [[usuarios]] = await pool.query("SELECT COUNT(*) AS total FROM usuarios");
    const cursos = 12;
    const paises = 5;
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

// ---------- SERVIR ARCHIVOS ESTÁTICOS (FRONT) ----------
app.use(express.static(path.join(__dirname, ".."))); // ajusta según estructura: index.html debe estar una carpeta arriba

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Ruta de prueba
app.get("/api/test", (req, res) => res.send("Servidor funcionando correctamente 🚀"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
