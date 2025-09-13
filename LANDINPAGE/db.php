<?php
$host = "localhost";
$user = "root";     // cambia si usas otro usuario
$pass = "";         // pon tu contraseña si tienes
$db   = "curso_emocional";

// Crear conexión
$conn = new mysqli($host, $user, $pass, $db);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}
?>
