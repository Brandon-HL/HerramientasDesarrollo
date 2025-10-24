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


async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" });
  const token = auth.substring(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });

  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, rol, fecha_registro FROM usuarios WHERE id = ?", [payload.id]);
    if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
    req.user = rows[0];
    next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
}


async function ensureAdminFromEnv() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASS;
  if (!adminEmail || !adminPass) {
    console.log("ADMIN_EMAIL o ADMIN_PASS no configurados; no se creará admin automáticamente.");
    return;
  }

  try {
    const [rows] = await pool.query("SELECT id, correo, rol FROM usuarios WHERE correo = ?", [adminEmail]);
    if (rows.length === 0) {
      const hashed = await bcrypt.hash(adminPass, 10);
      const nombre = "Administrador";
      const [result] = await pool.query(
        "INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?, ?, ?, 'admin')",
        [nombre, adminEmail, hashed]
      );
      console.log(`Admin creado: ${adminEmail} (id: ${result.insertId}). Usa la contraseña de ADMIN_PASS en .env para iniciar sesión.`);
    } else {
      // existe: asegurar rol admin
      const user = rows[0];
      if (user.rol !== "admin") {
        await pool.query("UPDATE usuarios SET rol = 'admin' WHERE id = ?", [user.id]);
        console.log(`Usuario existente ${adminEmail} actualizado a rol 'admin'.`);
      } else {
        console.log(`Admin ya existe: ${adminEmail}`);
      }
      console.log("Si quieres cambiar la contraseña del admin, actualiza ADMIN_PASS y usa la herramienta recomendada (ver instrucciones).");
    }
  } catch (err) {
    console.error("Error al asegurar admin desde .env:", err);
  }
}


ensureAdminFromEnv().catch(err => console.error(err));


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

    const [rows] = await pool.query("SELECT id, nombre, correo, rol, fecha_registro FROM usuarios WHERE id = ?", [userId]);
    const user = rows[0];

    res.json({ success: true, token, user });
  } catch (err) {
    console.error("register error:", err);
    if (err && err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Correo ya registrado" });
    res.status(500).json({ error: "Error del servidor" });
  }
});


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
    console.error("login error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});


app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});




app.post("/api/inscripciones", async (req, res) => {
  try {
    const { nombre, correo, telefono, mensaje } = req.body;
    if (!nombre || !correo) return res.status(400).json({ error: "Nombre y correo obligatorios" });

    const [result] = await pool.query(
      "INSERT INTO inscripciones (nombre, correo, telefono, mensaje) VALUES (?, ?, ?, ?)",
      [nombre, correo, telefono || null, mensaje || null]
    );

  
    await pool.query("INSERT INTO metricas (tipo, valor) VALUES (?, ?)", ["inscripcion", 1]);

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("inscripciones POST error:", err);
    res.status(500).json({ error: "Error al guardar" });
  }
});


app.get("/api/inscripciones", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, telefono, mensaje, fecha FROM inscripciones ORDER BY fecha DESC LIMIT 100");
    res.json(rows);
  } catch (err) {
    console.error("inscripciones GET error:", err);
    res.status(500).json({ error: "Error al listar" });
  }
});


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
    console.error("inscripciones ultimos6meses error:", err);
    res.status(500).json({ error: "Error al generar datos" });
  }
});


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
    console.error("metricas/home error:", err);
    res.status(500).json({ error: "Error al obtener métricas" });
  }
});



async function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No autorizado" });
  if (req.user.rol !== "admin") return res.status(403).json({ error: "Acceso restringido - admin only" });
  next();
}


app.get("/api/admin/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC");
    res.json(rows);
  } catch (err) {
    console.error("admin/users error:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});


app.put("/api/admin/users/:id/role", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;
    if (!["usuario","admin"].includes(rol)) return res.status(400).json({ error: "Rol inválido" });
    await pool.query("UPDATE usuarios SET rol = ? WHERE id = ?", [rol, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("admin/users/:id/role error:", err);
    res.status(500).json({ error: "Error actualizando rol" });
  }
});


app.delete("/api/admin/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("admin delete user error:", err);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});


app.get("/api/admin/inscripciones", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo, telefono, mensaje, fecha FROM inscripciones ORDER BY fecha DESC");
    res.json(rows);
  } catch (err) {
    console.error("admin/inscripciones error:", err);
    res.status(500).json({ error: "Error al obtener inscripciones" });
  }
});


app.delete("/api/admin/inscripciones/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM inscripciones WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("admin delete inscripcion error:", err);
    res.status(500).json({ error: "Error eliminando inscripcion" });
  }
});


app.get("/api/admin/compras", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.usuario_id, u.nombre as usuario_nombre, u.correo as usuario_correo, c.plan, c.monto, c.fecha_compra
      FROM compras c
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      ORDER BY c.fecha_compra DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("admin/compras error:", err);
    res.status(500).json({ error: "Error al obtener compras" });
  }
});


app.get("/api/admin/metricas", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, tipo, valor, fecha FROM metricas ORDER BY fecha DESC LIMIT 500");
    res.json(rows);
  } catch (err) {
    console.error("admin/metricas error:", err);
    res.status(500).json({ error: "Error al obtener metricas" });
  }
});



app.use(express.static(path.join(__dirname, ".."))); 

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});


app.get("/api/test", (req, res) => res.send("Servidor funcionando correctamente 🚀"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
