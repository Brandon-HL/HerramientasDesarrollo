<?php
include("db.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nombre   = $conn->real_escape_string($_POST["nombre"]);
    $correo   = $conn->real_escape_string($_POST["correo"]);
    $telefono = $conn->real_escape_string($_POST["telefono"]);
    $mensaje  = $conn->real_escape_string($_POST["mensaje"]);

    $sql = "INSERT INTO inscritos (nombre, correo, telefono, mensaje) 
            VALUES ('$nombre', '$correo', '$telefono', '$mensaje')";

    if ($conn->query($sql) === TRUE) {
        echo "✅ ¡Gracias $nombre! Te has inscrito correctamente al Curso de Inteligencia Emocional.";
    } else {
        echo "❌ Error: " . $conn->error;
    }
}
$conn->close();
?>
