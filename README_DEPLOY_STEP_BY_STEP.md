# Guía para subir a GitHub y desplegar en Netlify

Proyecto detectado: **CRA** (Create React App)

## 1) Requisitos locales
- Node.js 20.x (Netlify usará 20 por defecto)
- Git instalado

## 2) Instala dependencias (si aplica)
```bash
npm install
```

## 3) Archivos agregados por mí
- `.gitignore` (si faltaba)
- `_redirects` (para rutas de SPA)
- `netlify.toml` (build y publish correctos)

## 4) Subir a GitHub
```bash
git init
git branch -M main
git add .
git commit -m "Primera versión lista para Netlify"
# Crea un repo vacío en GitHub y reemplaza la URL:
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## 5) Desplegar en Netlify
**Opción A: Conectar el repo de GitHub**
1. En Netlify → "Add new site" → "Import an existing project".
2. Elige tu repo.
3. *Build command*: `npm run build`
4. *Publish directory*: `build` (para CRA será `build`).
5. Deploy.

**Opción B: Arrastrar carpeta compilada**
1. Ejecuta:
```bash
npm run build
```
2. Sube la carpeta **build/** (o **public/** si es sitio estático) al *deploy* vía "Deploys → Upload a folder" en Netlify.

## 6) Notas importantes
- En tu ZIP venía también `src/package.json`. Es redundante: el `package.json` válido debe estar en la **raíz**. Te recomiendo eliminar `src/package.json` para evitar confusiones.
- Si usas rutas con React Router, `_redirects` evita errores 404 en Netlify.
- Variables de entorno para producción en Netlify: *Site settings → Environment variables*.

¡Listo!
