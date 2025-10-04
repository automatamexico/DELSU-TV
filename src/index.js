@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos base para que todo luzca bien desde el inicio */
html, body, #root {
  height: 100%;
}

body {
  @apply bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white antialiased;
}
