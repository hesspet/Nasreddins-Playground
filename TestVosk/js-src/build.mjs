import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'wwwroot', 'js');
const voskDist = join(__dirname, 'node_modules', 'vosk-browser', 'dist');

const watch = process.argv.includes('--watch');

async function copyVoskAssets() {
    const targetDir = join(outDir, 'vosk-browser');
    if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
    }

    for (const file of readdirSync(voskDist)) {
        if (file.endsWith('.wasm')) {
            copyFileSync(join(voskDist, file), join(targetDir, file));
        }
    }
}

async function build() {
    await copyVoskAssets();

    const ctx = await esbuild.context({
        entryPoints: [join(__dirname, 'voiceService.js')],
        bundle: true,
        outfile: join(outDir, 'app.js'),
        format: 'iife',
        globalName: 'VoiceServiceApp',
        sourcemap: true,
        minify: false,
        target: ['es2020'],
        loader: {
            '.wasm': 'copy',
        },
    });

    if (watch) {
        console.log('Watching for changes...');
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log('Built successfully:', join(outDir, 'app.js'));
    }
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
