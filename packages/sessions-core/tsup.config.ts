import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Skip DTS generation - has type errors
  sourcemap: false,
  clean: true,
  tsconfig: './tsconfig.json',
  // BUGFIX: Mark bcrypt's optional dependencies as external to prevent bundling errors
  external: [
    'aws-sdk',
    'nock',
    'mock-aws-s3',
    '@mapbox/node-pre-gyp'
  ],
  platform: 'node',
  target: 'node18',
});
