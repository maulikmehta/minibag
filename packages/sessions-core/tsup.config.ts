import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Skip DTS generation - has type errors
  sourcemap: false,
  clean: true,
  tsconfig: './tsconfig.json',
});
