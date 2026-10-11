import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({plugins:[react()],build:{ssr:'tests/ui-entry.tsx',outDir:'.ui-tests',emptyOutDir:true,minify:false}})
