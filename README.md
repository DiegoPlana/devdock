# DEVDОCK v0.4.1

Centro de productividad para proyectos y repositorios, con icono propio y asistente de preparación del entorno.

## Descargar e instalar

Ve a **Actions → DEVDОCK Build → última ejecución correcta**. En **Artifacts** descarga `devdock-windows` (Windows) o `devdock-linux` (Linux). Descomprime e instala el ejecutable. GitHub Actions genera el .exe y el AppImage; el instalador aún no está firmado.

**El instalador es autónomo:** trae Electron y sus bibliotecas. **No necesitas instalar Node.js ni npm para usar DEVDОCK.** Node.js 22.12+ solo es necesario para desarrollar o compilar el proyecto fuente.

El instalador de Windows intenta crear accesos directos en Inicio y Escritorio. Si borras el acceso directo: en **Ajustes → Crear acceso directo** puedes recuperarlo. También puedes iniciar DEVDОCK desde el menú Inicio.

## Nuevo: asistente y dependencias

Al arrancar la versión 0.4.0 por primera vez, aparece un asistente de bienvenida. Detecta las herramientas instaladas y propone **Git** y **GitHub CLI**; Docker, Node.js, Python, Java y Maven son opcionales.

- Selecciona lo que quieras instalar y pulsa **Instalar seleccionadas**.
- DEVDОCK vuelve a preguntarte antes de cada instalación; puedes cancelarla.
- En Windows usa **winget** con identificadores permitidos y acepta el control UAC si el sistema lo solicita.
- En Linux con `apt-get` y `pkexec` disponibles ofrece instalación mediante el gestor del sistema; en otras distribuciones muestra instrucciones.
- Si falla la instalación, se muestra un error y la app sigue funcionando.
- Puedes repetir las comprobaciones cuando quieras en **Dependencias**.
- La instalación se hace solo tras interacción expresa y no existe instalación silenciosa al iniciarse.

**Importante:** GitHub CLI necesita autenticación: usa `gh auth login --hostname github.com --git-protocol https --web` y `gh auth setup-git`. Si instalas herramientas estando DEVDОCK abierto, puede hacer falta reiniciar la aplicación para actualizar el PATH. Docker Desktop puede requerir WSL2 y/o reiniciar Windows.

## Qué hay dentro

- Dashboard, gestor de proyectos, Git local, GitHub (a través de `gh`), comandos, biblioteca y gestor de herramientas.
- Base SQLite guardada en los datos de usuario del sistema.
- Autenticación GitHub delegada a GitHub CLI. DEVDОCK no guarda contraseñas ni tokens.
- Los comandos de Git o del centro de comandos pueden modificar repositorios: requieren confirmación en la interfaz cuando corresponde.

## Desarrollo

```bash
npm install
npm test
npm run typecheck
npm run dev
npm run dist:win
```

`scripts/generate-icons.mjs` genera automáticamente `assets/icon.png` y `assets/icon.ico` a partir de `assets/logo.svg` durante `npm run dev` y `npm run build`. Los iconos del .exe y de la aplicación instalada usan esos archivos. No ejecutes el generador antes de instalar dependencias.

## Pendiente

- Terminal PTY interactiva.
- Configuración automática de WSL2/Docker y otros requisitos de cada herramienta (no deben ejecutarse sin explicar los cambios).
- Compatibilidad con más gestores de paquetes Linux.
- Firma digital de instaladores.
- Instalador integrado para actualizaciones de DEVDОCK.

Para reportar errores utiliza **Issues** en GitHub.

## Novedades 0.4.0

- **Abrir proyecto:** analiza la estructura (Java, Fabric, web, Python o Rust), sugiere un IDE instalado y ofrece elegir un ejecutable manualmente. Al marcar «Recordar», guarda una elección distinta para cada proyecto.
- **GitHub CLI en Linux:** detecta también herramientas instaladas en `~/.local/bin`, sin `sudo`, incluso al abrir la AppImage desde el menú gráfico.
- **Actualizaciones:** en Ajustes → Actualizaciones puedes buscar versiones en GitHub Releases. Con GitHub CLI autenticado, comprueba las publicaciones del repositorio privado. Solo instala una versión posterior con un recurso y digest SHA-256 válidos; exige confirmación.
- En Linux una AppImage ubicada en tu carpeta personal se reemplaza al cerrar y se vuelve a abrir. Se conserva una copia `.previous`. En Windows se descarga y abre el asistente NSIS para completar la actualización.
- La base de datos SQLite existente se reutiliza y el nuevo ajuste por proyecto se guarda en una tabla adicional sin modificar las anteriores.

Las actualizaciones **no se ejecutan silenciosamente**. En una ubicación de solo lectura o una instalación protegida se requiere mover el ejecutable a una carpeta escribible o solicitar permisos al administrador.

## Publicación
Cada cambio en `main` compila Windows y Linux en Actions; si el número de versión todavía no se ha publicado, el workflow crea una publicación `vX.Y.Z` en Releases con ambos archivos verificados por GitHub. El botón de actualización usa esas publicaciones, no artefactos temporales de Actions.


## Novedad 0.4.1: Windows ARM64

- Nueva compilación nativa para equipos con **Windows 11 ARM64** (Snapdragon, Surface ARM y similares).
- En GitHub Releases encontrarás `DEVD.CK-0.4.1-win-arm64.exe`. No es el instalador Linux ARM.
- Continúan disponibles `DEVD.CK-0.4.1-win-x64.exe` y `DEVD.CK-0.4.1-linux-x86_64.AppImage`.
- El actualizador integrado ahora selecciona automáticamente el instalador Windows ARM64 si la app corre en Electron ARM64.
- Para compilar desde el repositorio: `npm run dist:win:arm64`. GitHub Actions lo genera en una ejecución Windows, sin necesitar un PC Windows ARM64 local.
- No se modifican las bases SQLite ni las preferencias del usuario.
