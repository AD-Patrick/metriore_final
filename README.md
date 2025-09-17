# Metriore

🎥 **Metriore** es una plataforma web diseñada para creadores de contenido en YouTube que gestionan varios canales e idiomas.  
El objetivo es sencillo: unificar en un solo lugar todo el flujo de trabajo, desde la idea inicial hasta el análisis de métricas después de publicar.

👉 Proyecto desarrollado como **Trabajo de Fin de Grado en Ingeniería Informática (UNIR, 2025)**.

- 📚 Documento completo: [TFG - Patrick Albó Sureda](./TFG_Final_Patrick_Albo_Sureda.pdf)  
- 🌐 Sitio web: [metriore.com](https://metriore.com)  
- 💻 Repositorio: [GitHub - AD-Patrick/metriore_final](https://github.com/AD-Patrick/metriore_final)
- 🎬 Demo: [YouTube](https://youtu.be/xyG6ZvKocNo)

---

## 🚩 Problema que resuelve
Los creadores suelen tener su trabajo repartido entre múltiples herramientas:
- Guiones en Google Docs  
- Miniaturas en carpetas locales  
- Métricas en YouTube Studio  
- Ideas en hojas de Excel  

Esto hace difícil comparar resultados y planificar nuevas publicaciones.  
**Metriore** ofrece una solución integral: un único espacio donde gestionar el pipeline de producción y analizar métricas multicanal.

---

## ✨ Features
- 🔑 **Google OAuth** para login seguro e integración con YouTube.  
- 🌍 **Gestión multi-idioma**: pensado para canales bilingües (ej. inglés/español).  
- 📝 **Gestión de pipeline de producción**: guiones, miniaturas, estado de cada vídeo.  
- 📊 **Analítica integrada**: vistas, likes, comentarios y comparaciones entre idiomas y formatos.  
- 📅 **Video scheduling**: planificación automática mediante algoritmo de programación.  
- 🖼️ **Thumbnail management**.  
- 🏷️ **Topic management** para categorizar contenido.  
- 📤 **Exportación de métricas** en diferentes formatos.  
- 👥 **Gestión de equipo** con roles diferenciados (guionistas, editores, diseñadores).  

---

## 🛠️ Tech Stack
Este proyecto está construido con:

- **Frontend**: React + TypeScript + Vite  
- **UI**: shadcn-ui + Tailwind CSS  
- **Backend**: Supabase (Database, Auth, Storage)   
- **Forms**: React Hook Form + Zod validation  
- **Routing**: React Router DOM  
- **Deploy**: Vercel  

---

## 📂 Project Structure
```plaintext
src/
├── components/         # Reusable UI components
│   ├── integrations/   # Integration-specific components
│   ├── posts/          # Post management components
│   ├── scheduling/     # Content scheduling components
│   ├── ui/             # Base UI components (shadcn-ui)
│   └── youtube/        # YouTube-specific components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility libraries
├── pages/              # Main application pages
└── utils/              # Helper utilities
```
---

## 🚀 Getting Started

### Prerequisites
- Tener instalado **Node.js** y **npm** → [instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating)  
- Una cuenta en **Supabase** para base de datos y almacenamiento  

### Installation

```sh
# Clonar el repositorio
git clone https://github.com/AD-Patrick/metriore_final.git

# Entrar en el directorio
cd metriore_final

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### Development


```sh
# Iniciar servidor en desarrollo
npm run dev

# Construir para producción
npm run build

# Previsualizar build de producción
npm run preview

# Lint de código
npm run lint
```


## 📌 Estado del proyecto

Actualmente, Metriore está en fase MVP funcional:
	•	✅ Login con Google OAuth
	•	✅ Integración con API de YouTube
	•	✅ Módulos de contenido, métricas y scheduling

Próximos pasos:
	•	Integrar más redes sociales (Instagram, TikTok, Rumble)
	•	Añadir analítica avanzada con IA
	•	Dashboards personalizados

---

## 👤 Autor

Trabajo Fin de Grado presentado por Patrick Albó Sureda
Directora: Claudia Blanca González Calleros
Universidad Internacional de La Rioja – 2025

---

## 📜 Licencia

Este proyecto se publica con fines educativos bajo licencia Creative Commons Atribución-NoComercial-SinDerivadas 4.0 Internacional (CC BY-NC-ND 4.0). No se autoriza su copia, distribución ni uso comercial sin el consentimiento expreso del autor.
