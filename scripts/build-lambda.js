const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  const outdir = path.resolve(__dirname, '../dist-lambda');
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  console.log('Bundling JalSentry AWS Lambda handler with esbuild...');
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/server/lambda.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(outdir, 'index.js'),
    minify: true,
    sourcemap: true,
    external: [
      // AWS SDK v3 is available in node20.x runtime, but bundling it ensures zero version skew
    ],
  });

  console.log('Lambda bundle built successfully at dist-lambda/index.js');
}

build().catch((err) => {
  console.error('Lambda bundle build failed:', err);
  process.exit(1);
});
