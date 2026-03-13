# Phase 6: Update Config & Cleanup

## Priority: Medium | Status: Complete

## Overview

Update Tauri config, clean up old files, update gitignore and README.

## Steps

1. **Update `tauri.conf.json`**
   - Add `build.devUrl`, `build.beforeDevCommand`, `build.beforeBuildCommand`
   - Change `build.frontendDist` to `"../dist"`
   - Remove `withGlobalTauri: true`
   - Update CSP for Vite dev server if needed

2. **Update `.gitignore`**
   - Add `dist/` (Vite build output)

3. **Remove old frontend**
   - Delete `src-vanilla/` (backup from phase 1)
   - Verify no references to old files

4. **Update `package.json`**
   - Clean up unused deps (prettier — keep if desired)
   - Ensure all new deps are listed

5. **Update `README.md`**
   - Tech stack section: add React, TypeScript, Tailwind CSS, shadcn/ui, Soniox React SDK
   - Build instructions remain same (`npm install && npm run tauri build`)

## Success Criteria

- [ ] `npm run tauri dev` works
- [ ] `npm run tauri build` produces working `.app` bundle
- [ ] No leftover old files
