# SmartInventory — Inventario inteligente con visión por computador

SmartInventory es un MVP universitario que permite cargar una imagen, analizarla con **YOLO11n**, visualizar los objetos detectados, revisar el conteo generado por inteligencia artificial y confirmar un inventario final.

El proyecto utiliza:

- **React + Vite** para la interfaz.
- **Express + TypeScript** para la API.
- **Python + Ultralytics YOLO11n** para la detección de objetos.
- **jsPDF** para descargar reportes en PDF.

---

## Funcionalidades actuales

- Carga de imágenes JPG, JPEG y PNG.
- Validación de formato y tamaño máximo de 8 MB.
- Previsualización de la imagen.
- Detección local con YOLO11n.
- Visualización de cajas delimitadoras.
- Visualización de categoría y confianza.
- Conteo de objetos por categoría.
- Corrección manual del conteo.
- Confirmación del inventario.
- Consulta de información técnica del análisis.
- Descarga del reporte en PDF.

---

## Requisitos

Antes de ejecutar el proyecto debes tener instalado:

- [Node.js](https://nodejs.org/) versión 18 o superior.
- npm.
- Python 3.10 o superior.
- Git, únicamente si vas a clonar o subir el proyecto.

Puedes verificar las instalaciones con:

```powershell
node --version
npm --version
py --version
git --version
```

---

## Estructura principal

```text
inventario-inteligente---computer-vision/
├── src/
│   ├── App.tsx
│   └── components/
│       └── inventory/
│           ├── report-detail.tsx
│           ├── scanner-dashboard.tsx
│           └── upload-modal.tsx
├── scripts/
│   └── inference_worker.py
├── types/
│   ├── inventory.ts
│   └── yolo.ts
├── server.ts
├── vite.config.ts
├── package.json
├── requirements.txt
├── .env
└── README.md
```

---

# Instalación

## 1. Obtener el proyecto

Si el repositorio ya está descargado, abre una terminal en su carpeta.

Para clonarlo desde Git:

```powershell
git clone URL_DEL_REPOSITORIO
cd inventario-inteligente---computer-vision
```

---

## 2. Instalar dependencias de Node.js

Desde la raíz del proyecto ejecuta:

```powershell
npm install
```

Esto instala las dependencias del frontend y del backend, incluyendo React, Express, Vite, TypeScript y jsPDF.

---

## 3. Crear el entorno virtual de Python

En Windows:

```powershell
py -m venv .venv
```

Actívalo con:

```powershell
.\.venv\Scripts\Activate.ps1
```

Cuando esté activo, la terminal mostrará algo similar a:

```text
(.venv) PS C:\ruta\del\proyecto>
```

Si PowerShell bloquea la activación, ejecuta una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Después vuelve a activar el entorno.

---

## 4. Instalar dependencias de Python

Con el entorno virtual activo:

```powershell
python -m pip install --upgrade pip
python -m pip install ultralytics pillow
```

Si existe un archivo `requirements.txt`, también puedes usar:

```powershell
python -m pip install -r requirements.txt
```

Para generar o actualizar ese archivo:

```powershell
python -m pip freeze > requirements.txt
```

---

## 5. Configurar variables de entorno

Crea un archivo llamado `.env` en la raíz del proyecto:

```env
API_PORT=3001
PYTHON_COMMAND=.venv/Scripts/python.exe

YOLO_MODEL=yolo11n.pt
YOLO_CONFIDENCE=0.35
YOLO_DEVICE=cpu
```

### Significado de las variables

| Variable | Descripción |
|---|---|
| `API_PORT` | Puerto donde se ejecuta Express. |
| `PYTHON_COMMAND` | Ruta al Python del entorno virtual. |
| `YOLO_MODEL` | Modelo utilizado para la inferencia. |
| `YOLO_CONFIDENCE` | Confianza mínima aceptada, entre 0 y 1. |
| `YOLO_DEVICE` | Dispositivo utilizado. `cpu` funciona en la mayoría de equipos. |

No es necesaria una API key de Ultralytics porque el modelo se ejecuta localmente.

---

# Cómo ejecutar el proyecto

Se necesitan dos terminales abiertas en la raíz del proyecto.

## Terminal 1 — Backend

Activa el entorno virtual:

```powershell
.\.venv\Scripts\Activate.ps1
```

Ejecuta la API:

```powershell
npm run api
```

La terminal debería mostrar:

```text
SmartInventory API ejecutándose en http://localhost:3001
Inferencia local configurada con yolo11n.pt
Estado del servidor: http://localhost:3001/api/health
```

Puedes comprobar el backend en:

```text
http://localhost:3001/api/health
```

La respuesta esperada es similar a:

```json
{
  "status": "ok",
  "service": "SmartInventory API",
  "mode": "local",
  "model": "yolo11n.pt",
  "configured": true
}
```

---

## Terminal 2 — Frontend

Ejecuta:

```powershell
npm run dev
```

Luego abre en el navegador:

```text
http://localhost:3000
```

---

# Uso de la aplicación

1. Abre `http://localhost:3000`.
2. Presiona **Nuevo escaneo**.
3. Selecciona una imagen JPG, JPEG o PNG.
4. Verifica la previsualización.
5. Presiona el botón para iniciar el análisis.
6. Espera a que YOLO11n procese la imagen.
7. Revisa los cuadros delimitadores y los porcentajes de confianza.
8. Corrige las cantidades mediante los botones `+` y `−`.
9. Confirma el inventario.
10. Descarga el reporte en PDF cuando sea necesario.

La primera ejecución puede tardar más porque Ultralytics descargará automáticamente:

```text
yolo11n.pt
```

---

# Categorías reconocidas

YOLO11n está preentrenado con el conjunto de datos COCO. Para este MVP se utiliza la siguiente equivalencia:

| Clase original de YOLO | Categoría mostrada |
|---|---|
| `bottle` | Botellas |
| `laptop` | Laptops |
| `scissors` | Herramientas |
| `backpack` | Cajas |
| `handbag` | Cajas |
| `suitcase` | Cajas |

## Limitación importante

La categoría **cajas** es una aproximación utilizada para validar el MVP. YOLO11n preentrenado no incluye una clase específica para cajas de cartón.

La categoría **herramientas** también está limitada, ya que actualmente se basa principalmente en la detección de tijeras.

Para reconocer cajas de cartón, martillos, destornilladores u otras herramientas sería necesario entrenar un modelo personalizado.

---

# Comandos disponibles

| Comando | Función |
|---|---|
| `npm run dev` | Ejecuta el frontend con Vite. |
| `npm run api` | Ejecuta el backend Express. |
| `npm run build` | Genera la versión de producción. |
| `npm run preview` | Previsualiza la compilación. |
| `npm run lint` | Verifica los tipos de TypeScript. |

Antes de realizar un commit se recomienda ejecutar:

```powershell
npm run lint
npm run build
```

---

# Pruebas recomendadas

## Imagen válida

Prueba imágenes con:

- Una botella.
- Varias botellas.
- Una laptop.
- Botellas y laptops en la misma imagen.
- Tijeras.
- Mochilas, bolsos o maletas.

## Validaciones

Prueba también:

- Archivo que no sea una imagen.
- Imagen superior a 8 MB.
- Imagen sin categorías reconocibles.
- Imagen vertical.
- Imagen horizontal.
- Corrección manual del conteo.
- Confirmación del inventario.
- Descarga del PDF.

---

# Solución de problemas

## El backend indica que no encuentra Python

Verifica el archivo `.env`:

```env
PYTHON_COMMAND=.venv/Scripts/python.exe
```

Comprueba que la ruta exista:

```powershell
Test-Path .\.venv\Scripts\python.exe
```

Debe devolver:

```text
True
```

---

## Error `No module named ultralytics`

Activa el entorno virtual e instala Ultralytics:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install ultralytics pillow
```

---

## El modelo tarda en responder

Es normal durante la primera ejecución. El archivo `yolo11n.pt` debe descargarse y el modelo debe cargarse en memoria.

En equipos sin GPU, la inferencia se ejecuta con CPU y puede tardar algunos segundos.

---

## El análisis termina sin detecciones

El sistema funcionó, pero YOLO11n no encontró ninguna de las categorías habilitadas.

Prueba una imagen clara con una botella o una laptop y buena iluminación.

También puedes reducir temporalmente el umbral:

```env
YOLO_CONFIDENCE=0.25
```

Después reinicia el backend.

---

## Los cuadros no aparecen

Realiza un escaneo nuevo. Los reportes antiguos pueden no contener la propiedad `predicciones`.

También comprueba que `server.ts` incluya las predicciones individuales en la respuesta de `/api/scan`.

---

## El PDF no se descarga

Verifica que jsPDF esté instalado:

```powershell
npm install jspdf
```

Reinicia el frontend:

```powershell
npm run dev
```

---

## El puerto ya está en uso

Puedes cerrar el proceso anterior con `Ctrl + C`.

También puedes cambiar el puerto de la API en `.env`:

```env
API_PORT=3002
```

En ese caso debes actualizar el proxy correspondiente en `vite.config.ts`.

---

# Archivos que no deben subirse a Git

Verifica que `.gitignore` incluya:

```gitignore
node_modules/
.venv/
.env
*.pt
dist/
__pycache__/
*.pyc
```

No se deben subir:

- `node_modules`.
- El entorno virtual `.venv`.
- El archivo `.env`.
- El modelo `yolo11n.pt`.
- Archivos temporales de Python.
- La carpeta de compilación `dist`.

---

# Flujo técnico

```text
Usuario
   ↓
React y Vite
   ↓
POST /api/scan
   ↓
Express y Multer
   ↓
inference_worker.py
   ↓
Ultralytics YOLO11n
   ↓
Predicciones y coordenadas
   ↓
Conteo, revisión y confirmación
   ↓
Reporte visual y PDF
```

---

# Estado del MVP

## Sprint 1

- Pantalla principal.
- Carga de imágenes.
- Validación y previsualización.
- Configuración de YOLO11n.
- Procesamiento de imágenes.

## Sprint 2

- Cuadros delimitadores.
- Confianza por detección.
- Conteo por categoría.
- Corrección manual.
- Confirmación del inventario.

## Sprint 3

- Consulta de la información del análisis.
- Descarga de reporte en PDF.
- Descarga de reporte en Excel.
- Uso desde navegador y adaptación móvil: pendientes según el alcance definido.

---

## Autoría

Proyecto académico desarrollado como MVP de inventario inteligente mediante visión por computador.