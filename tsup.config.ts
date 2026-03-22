import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  external: [
    'ink', 'react', 'inquirer', 'cli-cursor', 'terminal-size', 'chokidar', 'react-devtools-core'
  ]
});
