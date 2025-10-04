# Nutri-Track 🥗

Sistema de seguimiento nutricional integral construido con SvelteKit y Supabase.

## 🌟 Características

- **Autenticación completa**: Sistema de registro e inicio de sesión con Supabase Auth
- **Dashboard interactivo**: Visualización en tiempo real de la ingesta nutricional diaria
- **Perfiles de usuario**: Gestión de múltiples perfiles con cálculo personalizado de RDA (Recommended Daily Allowance)
- **Base de datos de alimentos**: 50+ alimentos precargados con información nutricional completa (macronutrientes + 24 micronutrientes)
- **Alimentos personalizados**: Los usuarios pueden crear y gestionar sus propios alimentos
- **Búsqueda inteligente**: Búsqueda de alimentos insensible a acentos y mayúsculas
- **Gráficos nutricionales**: Visualización de progreso y distribución de nutrientes
- **Registro de consumo**: Sistema de logging de alimentos con cantidades personalizadas
- **Modo oscuro**: Interfaz adaptable con soporte para temas claro y oscuro

## 🛠️ Stack Tecnológico

### Frontend
- **SvelteKit** (Svelte 5 con Runes)
- **TailwindCSS** para estilos
- **TypeScript** para type safety
- **Vite** como bundler

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Supabase CLI** para migraciones

### Características técnicas
- Server-Side Rendering (SSR)
- Progressive Web App (PWA) ready
- Responsive design
- Búsqueda optimizada con índices funcionales
- Normalización de texto para búsquedas sin acentos

## 📦 Estructura del Proyecto

```
nutri-track/
├── apps/
│   ├── client/          # Cliente React antiguo (deprecado)
│   └── web-svelte/      # Aplicación SvelteKit principal
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/    # Componentes Svelte reutilizables
│       │   │   ├── stores/        # Stores de Svelte
│       │   │   └── supabaseClient.ts
│       │   └── routes/
│       │       ├── api/           # API endpoints
│       │       ├── dashboard/     # Dashboard principal
│       │       ├── login/         # Autenticación
│       │       ├── profile/       # Perfil de usuario
│       │       └── profiles/      # Gestión de perfiles
│       └── static/
├── supabase/
│   ├── migrations/      # Migraciones de base de datos
│   ├── functions/       # Edge Functions
│   ├── remote_sql/      # Scripts SQL para aplicar remotamente
│   └── seed/           # Datos de seed (RDA)
└── package.json
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- pnpm (recomendado) o npm
- Cuenta de Supabase
- Supabase CLI instalado

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/juan-altamira/nutri-track.git
   cd nutri-track
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env` en `apps/web-svelte/`:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

4. **Aplicar migraciones de base de datos**
   ```bash
   # Vincular con tu proyecto Supabase
   supabase link --project-ref tu_project_ref
   
   # Aplicar migraciones
   supabase db push
   ```

5. **Ejecutar en desarrollo**
   ```bash
   cd apps/web-svelte
   pnpm dev
   ```

   La aplicación estará disponible en `http://localhost:5173`

## 📊 Base de Datos

### Tablas principales

- **User**: Usuarios del sistema (Supabase Auth)
- **UserProfile**: Perfiles de usuario con datos antropométricos
- **RecommendedDailyAllowance**: Valores RDA por edad, sexo y condición
- **Food**: Alimentos globales (precargados)
- **UserFood**: Alimentos creados por usuarios
- **FoodNutrient**: Nutrientes de alimentos globales
- **UserFoodNutrient**: Nutrientes de alimentos de usuario
- **FoodLog**: Registro de consumo de alimentos

### Nutrientes soportados

**Macronutrientes**:
- Proteína, Carbohidratos, Grasa, Fibra

**Vitaminas**:
- A, C, D, E, K
- B1 (Tiamina), B2 (Riboflavina), B3 (Niacina), B5 (Ácido Pantoténico)
- B6, B7 (Biotina), B9 (Folato), B12
- Colina

**Minerales**:
- Calcio, Hierro, Magnesio, Zinc
- Potasio, Sodio, Fósforo, Selenio
- Cobre, Manganeso, Yodo, Cloruro

## 🔧 Desarrollo

### Scripts disponibles

```bash
# Desarrollo
pnpm dev

# Build de producción
pnpm build

# Preview de producción
pnpm preview

# Linting
pnpm lint

# Formateo
pnpm format
```

### Migraciones de base de datos

```bash
# Crear nueva migración
supabase migration new nombre_migracion

# Aplicar migraciones locales
supabase db reset

# Aplicar migraciones remotas
supabase db push
```

## 🎨 Características de UI

- **Componentes reutilizables**: 
  - `FoodSearch`: Buscador de alimentos con autocompletado
  - `NutrientSummary`: Resumen visual de nutrientes consumidos
  - `ProfileSelector`: Selector de perfiles de usuario
  - `UserFoodForm`: Formulario para crear/editar alimentos personalizados
  - `ToastHost`: Sistema de notificaciones toast

- **Temas**: Modo claro/oscuro con persistencia en localStorage
- **Responsive**: Diseño adaptable para móviles, tablets y desktop
- **Accesibilidad**: Labels ARIA, navegación por teclado

## 📈 Roadmap

- [ ] Gráficos de tendencia semanal/mensual
- [ ] Exportación de datos (CSV, PDF)
- [ ] Integración con APIs de alimentos (USDA, Open Food Facts)
- [ ] Planificación de comidas
- [ ] Recetas con cálculo nutricional
- [ ] PWA con sincronización offline
- [ ] Comparativa entre perfiles
- [ ] Recomendaciones basadas en déficits nutricionales

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT.

## 👨‍💻 Autor

**Juan Altamira**
- GitHub: [@juan-altamira](https://github.com/juan-altamira)

## 🙏 Agradecimientos

- Datos nutricionales de USDA, FRIDA, Fineli, Matvaretabellen
- Iconos por [Lucide](https://lucide.dev)
- UI inspirada en principios de diseño moderno

---

**Nota**: Este proyecto migró de una arquitectura NestJS + Prisma a SvelteKit + Supabase para mayor simplicidad y mejor experiencia de desarrollo.
