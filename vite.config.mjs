import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // CRITICAL for Electron production builds.
  // By default Vite outputs absolute asset paths like /assets/index.js.
  // When Electron loads the built app via file:// (not http://), absolute paths
  // resolve to the filesystem root and break — you get a blank white screen.
  // base: './' makes all paths relative so file:// loading works correctly.
  base: './',
})
