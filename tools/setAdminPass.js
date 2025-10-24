// tools/setAdminPass.js
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "landingpage_db",
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  const newPass = process.env.ADMIN_PASS;

  if (!adminEmail || !newPass) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASS en .env antes de ejecutar este script.");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPass, 10);
  // Actualiza la contraseña y forzar rol = admin
  const [result] = await pool.query("UPDATE usuarios SET contrasena = ?, rol = 'admin' WHERE correo = ?", [hashed, adminEmail]);

  if (result.affectedRows === 0) {
    // si no existe el usuario, lo creamos
    const nombre = "Administrador";
    const [ins] = await pool.query("INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?, ?, ?, 'admin')", [nombre, adminEmail, hashed]);
    console.log("Usuario admin creado:", adminEmail, "id:", ins.insertId);
  } else {
    console.log("Contraseña y rol actualizados para:", adminEmail);
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
