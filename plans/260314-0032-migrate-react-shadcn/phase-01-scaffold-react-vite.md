# Phase 1: Scaffold React + Vite + Tailwind + shadcn/ui

## Priority: High | Status: Complete

## Overview

Replace the vanilla `src/` directory with a Vite-powered React TypeScript project. Install Tailwind CSS and shadcn/ui.

## Steps

1. **Backup current frontend**
   - Move `src/` → `src-vanilla/` (temporary reference during migration)

2. **Scaffold Vite + React TS**
   ```bash
   npm create vite@latest src-new -- --template react-ts
   ```
   - Move contents of `src-new/` → `src/`
   - Remove `src-new/`

3. **Install dependencies**
   ```bash
   npm install react react-dom @tauri-apps/api @tauri-apps/plugin-opener
   npm install -D @types/react @types/react-dom typescript @vitejs/plugin-react
   npm install -D tailwindcss @tailwindcss/vite
   npm install -D @soniox/react
   ```

4. **Setup Tailwind CSS**
   - Add `@tailwindcss/vite` plugin to `vite.config.ts`
   - Create `src/styles/globals.css` with `@import "tailwindcss"` and custom CSS variables (port from current `:root` vars)

5. **Setup shadcn/ui**
   ```bash
   npx shadcn@latest init
   ```
   - Select: New York style, Zinc base color, CSS variables = yes
   - Install needed components:
   ```bash
   npx shadcn@latest add button input label select radio-group switch slider scroll-area dropdown-menu sheet tabs
   ```

6. **Configure Vite for Tauri**
   - `vite.config.ts`:
     - `server.strictPort: true`
     - `server.port: 5173`
     - `envPrefix: ['VITE_', 'TAURI_']`
     - `build.target: ['es2021', 'chrome100', 'safari15']`
     - `build.outDir: 'dist'`

7. **Update `tauri.conf.json`**
   - `build.frontendDist` → `"../dist"`
   - `build.devUrl` → `"http://localhost:5173"`
   - `build.beforeDevCommand` → `"npm run dev"`
   - `build.beforeBuildCommand` → `"npm run build"`
   - Remove `withGlobalTauri: true` (use `@tauri-apps/api` imports instead)

8. **Update `package.json` scripts**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "tsc -b && vite build",
       "preview": "vite preview",
       "tauri": "tauri"
     }
   }
   ```

9. **Verify**: `npm run tauri dev` launches with blank React app

## Success Criteria

- [x] `npm run tauri dev` opens Tauri window with React app
- [x] Tailwind CSS classes apply correctly
- [x] shadcn/ui components render properly
- [x] No TypeScript compilation errors

## Related Files

- `package.json` — update scripts + dependencies
- `src-tauri/tauri.conf.json` — update build config
- `src/vite.config.ts` — new
- `src/tailwind.config.ts` — new
- `src/styles/globals.css` — new
