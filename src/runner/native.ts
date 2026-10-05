import { WASI, type WASIFS } from '@runno/wasi';
import { Tarball } from '@obsidize/tar-browserify';

const ROOT = '/runtimes/runno/';
const now = () => ({ access: new Date(), change: new Date(), modification: new Date() });
let baseFsPromise: Promise<WASIFS> | undefined;

async function baseFs(): Promise<WASIFS> {
  baseFsPromise ??= (async () => {
    const response = await fetch(new URL(`${ROOT}clang-fs.tar.gz`, self.location.origin));
    if (!response.ok) throw new Error('Runno sysroot is missing. Build or download offline resources first.');
    const downloaded = new Uint8Array(await response.arrayBuffer());
    const bytes = downloaded[0] === 0x1f && downloaded[1] === 0x8b
      ? new Uint8Array(await new Response(new Blob([downloaded]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
      : downloaded;
    const fs: WASIFS = {};
    for (const entry of Tarball.extract(bytes)) {
      if (!entry.isFile() || !entry.content) continue;
      const path = '/' + entry.fileName.replace(/^\/+/, '');
      fs[path] = { path, timestamps: now(), mode: 'binary', content: entry.content };
    }
    return fs;
  })();
  return baseFsPromise;
}

type PhaseResult = { fs: WASIFS; exitCode: number; stdout: string; stderr: string };
async function phase(binary: 'clang.wasm' | 'wasm-ld.wasm' | 'program', args: string[], fs: WASIFS): Promise<PhaseResult> {
  let stdout = '', stderr = '';
  const source = binary === 'program'
    ? new Response((fs['/program.wasm'] as { content: Uint8Array }).content as BodyInit, { headers: { 'Content-Type': 'application/wasm' } })
    : fetch(new URL(`${ROOT}${binary}`, self.location.origin));
  const result = await WASI.start(source, { args, env: {}, fs, stdout: text => { stdout += text; }, stderr: text => { stderr += text; }, stdin: () => null });
  return { ...result, stdout, stderr };
}

export async function compileAndRunNative(source: string, language: 'c' | 'cpp', onStatus: (status: string) => void): Promise<PhaseResult> {
  onStatus('Loading C/C++ sysroot…');
  const base = await baseFs();
  const filename = language === 'c' ? '/main.c' : '/main.cpp';
  const fs: WASIFS = { ...base, [filename]: { path: filename, timestamps: now(), mode: 'string', content: source } };
  onStatus('Compiling…');
  const common = ['-cc1', '-triple', 'wasm32-unknown-wasi', '-isysroot', '/sys', '-internal-isystem', '/sys/include/c++/v1', '-internal-isystem', '/sys/include', '-internal-isystem', '/sys/lib/clang/8.0.1/include', '-ferror-limit', '8', '-fmessage-length', '80', '-O2', '-emit-obj', '-o', '/program.o'];
  const compiled = await phase('clang.wasm', ['clang', ...common, '-x', language === 'c' ? 'c' : 'c++', filename], fs);
  if (compiled.exitCode !== 0) return compiled;
  onStatus('Linking…');
  const linked = await phase('wasm-ld.wasm', ['wasm-ld', '--no-threads', '--export-dynamic', '-z', 'stack-size=1048576', '-L/sys/lib/wasm32-wasi', '/sys/lib/wasm32-wasi/crt1.o', '/program.o', '-lc', ...(language === 'cpp' ? ['-lc++', '-lc++abi'] : []), '-o', '/program.wasm'], compiled.fs);
  if (linked.exitCode !== 0) return linked;
  onStatus('Running tests…');
  return phase('program', ['program'], linked.fs);
}
