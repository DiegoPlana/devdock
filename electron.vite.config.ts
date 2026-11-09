import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { outDir: 'out/main' } },
  preload: { build: { outDir: 'out/preload', rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs', inlineDynamicImports: true } } } },
  renderer: { root: 'src/renderer', plugins: [react()], build: { outDir: '../../out/renderer' } }
})
