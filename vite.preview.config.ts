// Builds one self-contained HTML file for previewing the app as a claude.ai artifact.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { 'import.meta.env.VITE_PREVIEW': JSON.stringify('1') },
  build: { outDir: 'dist-preview' },
})
