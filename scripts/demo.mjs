// PLANO B da apresentação: sobe backend + frontend com um comando só.
//   npm run demo
// Pré-requisitos: backend/.env e frontend/.env.local preenchidos (o Supabase continua na nuvem).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const windows = process.platform === 'win32';
const cor = { api: '\x1b[33m', web: '\x1b[36m', ok: '\x1b[32m', erro: '\x1b[31m', fim: '\x1b[0m' };

function falhar(msg) { console.error(`${cor.erro}✗ ${msg}${cor.fim}`); process.exit(1); }

if (!existsSync(join(raiz, 'backend', '.env'))) falhar('Falta backend/.env (copie de backend/.env.example).');
if (!existsSync(join(raiz, 'frontend', '.env.local'))) falhar('Falta frontend/.env.local (copie de frontend/.env.example).');
if (!existsSync(join(raiz, 'frontend', 'node_modules'))) {
  console.log('Instalando dependências do frontend…');
  const r = spawnSync('npm', ['install'], { cwd: join(raiz, 'frontend'), stdio: 'inherit', shell: windows });
  if (r.status !== 0) falhar('npm install falhou.');
}

const processos = [];
function iniciar(nome, comando, args, cwd) {
  const p = spawn(comando, args, { cwd, shell: windows, env: process.env });
  const prefixo = `${cor[nome]}[${nome}]${cor.fim} `;
  const imprimir = (dados) => String(dados).split(/\r?\n/).filter(Boolean).forEach((l) => console.log(prefixo + l));
  p.stdout.on('data', imprimir);
  p.stderr.on('data', imprimir);
  p.on('exit', (codigo) => { console.log(`${prefixo}encerrou (código ${codigo})`); encerrar(); });
  processos.push(p);
}

function encerrar() {
  for (const p of processos) {
    if (p.exitCode !== null) continue;
    if (windows) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F']); else p.kill('SIGTERM');
  }
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

console.log(`${cor.ok}CleanEats — subindo API (http://localhost:8080/api/saude) e web (http://localhost:5173)${cor.fim}`);
console.log('Ctrl+C encerra os dois.\n');
iniciar('api', windows ? 'mvnw.cmd' : './mvnw', ['-q', 'spring-boot:run'], join(raiz, 'backend'));
iniciar('web', 'npm', ['run', 'dev', '--', '--host'], join(raiz, 'frontend'));
