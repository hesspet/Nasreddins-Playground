import * as esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'wwwroot', 'js');
const watch = process.argv.includes('--watch');

async function build() {
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }

    const ctx = await esbuild.context({
        entryPoints: [join(__dirname, 'voiceService.js')],
        bundle: true,
        outfile: join(outDir, 'app.js'),
        format: 'iife',
        globalName: 'VoiceServiceApp',
        sourcemap: true,
        minify: false,
        target: ['es2020'],
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
