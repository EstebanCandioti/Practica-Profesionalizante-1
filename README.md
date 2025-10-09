Sistema de Gestión de Pedidos

Este proyecto es una aplicación web desarrollada para simular la gestión de pedidos diarios en un comedor o empresa, permitiendo que los usuarios seleccionen sus días de asistencia y realicen pedidos de comida según el menú disponible.
Incluye funcionalidades diferenciadas para usuarios y administradores.

Tecnologías utilizadas

-HTML5 para la estructura de las vistas
-CSS3 con diseño modular (un CSS por componente)
-JavaScript (ES Modules) para la lógica y comunicación entre pantallas
-JSON como fuente de datos simulada (usuarios, platos, pedidos, configuración)
-Bootstrap 5 y W3CSS para algunos componentes visuales

Roles del sistema
-Usuario
--Selecciona sus días de asistencia
--Realiza pedidos según el menú disponible
--Puede ver su último pedido en el Home

-Administrador
--Gestiona usuarios (asigna o quita rol de admin)
--Configura el horario límite de pedidos
--Administra los platos disponibles y sus días
--Define feriados

Datos simulados
Los datos se manejan localmente mediante archivos .json en la carpeta /data.
El archivo servicio.js actúa como un servicio común para importar los datos y compartirlos entre las páginas sin backend real.

Instrucciones para ejecutar
-Clonar el repositorio
-Abrir el proyecto con Live Server (Visual Studio Code) o cualquier servidor local.
-Iniciar sesión con uno de los usuarios del archivo usuarios.json.
-Usuario
Usuario: maria@ejemplo.com
Password: 123456
-Administrador
Usuario: juan@ejemplo.com
Password: 1234567

