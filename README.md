# DEVDОCK v0.3.0

Aplicación personal de escritorio para Windows y Linux. **Proyectos locales + Git + GitHub + comandos + biblioteca + herramientas**. Todos los datos locales se guardan en SQLite y se mantienen entre reinicios.

## Instalación de la versión descargable

Entra en **Actions → DEVDОCK Build → última ejecución correcta → Artifacts**. Descarga `DEVDОCK-Windows-v0.3.0`, extrae el ZIP y ejecuta el instalador `.exe`. En Linux descarga el AppImage. Los instaladores generados automáticamente no están firmados.

> Si Actions aparece en rojo, la compilación ha fallado y no hay un instalador válido: revisa el log y crea un issue.

## Desarrollo en tu ordenador

Requiere **Node.js 22.12+**. Ejecuta:

```bash
npm install
npm run dev
```

Pruebas y compilación:

```bash
npm test
npm run typecheck
npm run build
npm run dist:win
```

## Conectar GitHub

DEVDОCK **no utiliza tu conexión de ChatGPT a GitHub**. Utiliza la sesión local de **GitHub CLI (`gh`)**; tu contraseña/token no se almacena en DEVDОCK.

1. Instala [GitHub CLI](https://cli.github.com/). En Windows: `winget install --id GitHub.cli --exact`.
2. Abre una nueva terminal: `gh auth login --hostname github.com --git-protocol https --web`.
3. Ejecuta `gh auth setup-git` para que Git use las credenciales de GitHub CLI cuando lo necesite.
4. Reinicia DEVDОCK si acabas de instalar GitHub CLI. En **GitHub**, pulsa **Comprobar conexión** y **Cargar repositorios**.
5. Selecciona **Clonar** y elige una carpeta padre vacía. El repositorio aparecerá también en tus proyectos locales.

La lista carga hasta 100 repositorios asociados a tu cuenta. Para acceder a repositorios de organizaciones o más de 100 habrá que ampliar la búsqueda en una versión posterior. Los repositorios privados requieren permisos válidos de GitHub CLI. Si Git no reconoce tus credenciales, comprueba `gh auth status` y `gh auth setup-git`.

## Uso

- **Proyectos:** registra carpetas, clasifica, marca favoritos y abre en tu editor.
- **Git local:** consulta archivos cambiados, commits y ejecuta fetch, pull (--ff-only), push, stage o commit (solo lo que ya está en staging).
- **GitHub:** muestra repositorios remotos (públicos y privados autorizados), permite clonarlos y añadirlos al catálogo.
- **Comandos:** ejecuta comandos frecuentes o personalizados en un proyecto, con argumentos separados y sin shell.
- **Biblioteca:** notas, enlaces y snippets locales.
- **Herramientas:** detección de Git, GitHub CLI, Docker, Node, Python, Java y Maven.
- **Ajustes:** configura editor predeterminado.

## Seguridad

Los comandos se ejecutan sin shell (`execFile`), con límite de tiempo. **Pueden modificar archivos**: las acciones peligrosas solicitan confirmación en la interfaz. Las operaciones Git nunca reescriben el historial mediante comandos automáticos. La aplicación usa IPC con una lista de operaciones autorizadas, `contextIsolation`, sandbox y sin acceso Node desde la interfaz.

La terminal interactiva PTY, automatizaciones complejas, gestores Docker visuales y soporte nativo para OAuth sin GitHub CLI siguen pendientes. Este código necesita pasar la compilación de GitHub Actions antes de considerarlo instalador verificado.

## Estructura

`src/main`: base SQLite, procesos CLI, Git y GitHub.
`src/preload`: API de operaciones autorizadas.
`src/renderer`: interfaz React + CSS.
`src/shared`: contratos TypeScript compartidos.

Licencia: pendiente de elección.
