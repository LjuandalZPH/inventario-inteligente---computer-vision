# SmartInventory 📦🤖

SmartInventory es una plataforma web inteligente de monitoreo y auditoría visual de inventarios diseñada para entornos logísticos y almacenes de alta densidad. La aplicación integra interfaces de alta fidelidad con simulación de análisis en tiempo real usando visión computacional (**Ultralytics YOLOv8**).

## 🌟 Características Principales

- **Panel de Monitoreo Dinámico**: Visualización en tiempo real del total de existencias ("Stock Activo"), auditorías realizadas ("Scans Completed") y alertas de seguridad ("Active Alerts") para estanterías con sobrecarga.
- **Simulador Ultralytics YOLOv8**: Un flujo interactivo de 3 fases que permite cargar imágenes de almacenes, simular la detección e identificación automática de mercancías (como cajas, botellas, herramientas y laptops) y generar reportes con bounding boxes interactivos.
- **Flujo de Stock Comprometido (Committed)**: Diferenciación entre inventario "Pendiente" y "Comprometido". Al confirmar un reporte, se consolida la información al stock maestro y se actualizan los indicadores globales.
- **Diseño Geometric Balance**: Estética premium de alto contraste industrial, utilizando texturas de glassmorphism, resplandores en tonos turquesa/cian y tipografía sofisticada adaptada para tablets de almacén.

---

## 🛠️ Arquitectura Técnica

El proyecto está estructurado como una **Single Page Application (SPA)** moderna construida con:
- **Frontend**: React 19 + TypeScript (Modo Estricto).
- **Herramientas de Compilación & Servidor**: Vite 6.
- **Estilos**: Tailwind CSS 4 con fuentes personalizadas (*Playfair Display*, *Inter* y *JetBrains Mono*).
- **Animaciones**: `motion` (`motion/react`) para transiciones fluidas de paneles y estados del modal.
- **Iconografía**: `lucide-react` para indicadores vectoriales de alta precisión.

Actualmente, toda la lógica de detección de IA y actualización de stock se procesa del lado del **cliente (Local State Mapping)** de forma reactiva y offline-ready, ideal para ser conectada directamente con un API real de Python / Ultralytics YOLO en fases de producción futuras.

---

## 🚀 Cómo Iniciar el Proyecto

Siga estos pasos para ejecutar la aplicación en su entorno local:

### 1. Requisitos Previos
Asegúrese de tener instalado:
- **Node.js** (Versión 18 o superior recomendada)
- **npm** (Viene integrado con Node.js)

### 2. Instalación de Dependencias
Abra su terminal en la raíz del proyecto y ejecute:
```bash
npm install
```

### 3. Iniciar el Servidor de Desarrollo
Para arrancar el proyecto de manera local con recarga rápida, ejecute:
```bash
npm run dev
```
Esto levantará el servidor en [http://localhost:3000](http://localhost:3000) (o el puerto configurado).

### 4. Compilación para Producción
Para generar los archivos optimizados de producción listos para su distribución o despliegue estático, ejecute:
```bash
npm run build
```
Los archivos compilados se guardarán en la carpeta `/dist`.

---

## 🔍 ¿Qué es el Estado "Comprometido" (Committed)?

En la gestión de inventarios moderna, las auditorías visuales pasan por un proceso de verificación humana antes de afectar el registro real de existencias. 
- **Estado Pendiente (Pending)**: El modelo YOLOv8 ha finalizado el conteo automático de la foto, pero un operador del almacén debe validar que las cajas, botellas o laptops coincidan con el estado físico real.
- **Estado Comprometido (Committed)**: Al presionar **"Confirmar y Comprometer Stock"**, la auditoría se consolida oficialmente. Las unidades contadas se suman al **Stock Activo** global del panel y se asienta el registro como definitivo en la bitácora histórica.
