// Executa um arquivo .sql no Supabase (conexão de backend/.env), numa transação. Não apaga nada por conta própria.
//   node scripts/executar-sql.mjs supabase/hoje.sql
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = process.argv[2];
if (!arquivo) { console.error('Uso: node scripts/executar-sql.mjs <arquivo.sql>'); process.exit(1); }
const env = Object.fromEntries(readFileSync(join(raiz, 'backend', '.env'), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const url = new URL(env.SUPABASE_DB_URL.replace(/^jdbc:/, ''));
const c = new pg.Client({ host: url.hostname, port: Number(url.port || 5432), database: url.pathname.slice(1) || 'postgres',
  user: env.SUPABASE_DB_USER, password: env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query('begin');
  await c.query(readFileSync(join(raiz, arquivo), 'utf8'));
  await c.query('commit');
  console.log(`✓ ${arquivo} aplicado`);
} catch (e) {
  await c.query('rollback');
  console.error(`✗ ${arquivo}: ${e.message}`);
  process.exitCode = 1;
} finally { await c.end(); }
