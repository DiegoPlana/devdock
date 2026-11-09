# DEVDОCK v0.3.1

Centro de productividad para proyectos y repositorios, con icono propio y asistente de preparación del entorno.

## Descargar e instalar

Ve a **Actions → DEVDОCK Build → última ejecución correcta**. En **Artifacts** descarga `DEVDОCK-Windows-v0.3.1` (Windows) o `DEVDОCK-Linux-v0.3.1` (Linux). Descomprime e instala el ejecutable. GitHub Actions genera el .exe y el AppImage; el instalador aún no está firmado.

**El instalador es autónomo:** trae Electron y sus bibliotecas. **No necesitas instalar Node.js ni npm para usar DEVDОCK.** Node.js 22.12+ solo es necesario para desarrollar o compilar el proyecto fuente.

El instalador de Windows intenta crear accesos directos en Inicio y Escritorio. Si borras el acceso directo: en **Ajustes → Crear acceso directo** puedes recuperarlo. También puedes iniciar DEVDОCK desde el menú Inicio.

## Nuevo: asistente y dependencias

Al arrancar la versión 0.3.1 por primera vez, aparece un asistente de bienvenida. Detecta las herramientas instaladas y propone **Git** y **GitHub CLI**; Docker, Node.js, Python, Java y Maven son opcionales.

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
