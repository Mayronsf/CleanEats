// Aplica migrations + seeds no Supabase (usa a conexão de backend/.env).
//   npm run banco            → migrations + seed.sql + seeds/frente-*.sql
//   npm run banco:resetar    → APAGA o schema public e os usuários @cleaneats.test e recria tudo
//   npm run seed:sql         → só gera supabase/seed-completo.sql (para colar no SQL Editor)
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirSupabase = join(raiz, 'supabase');
const args = new Set(process.argv.slice(2));

const migrations = readdirSync(join(dirSupabase, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ nome: `migrations/${f}`, sql: readFileSync(join(dirSupabase, 'migrations', f), 'utf8') }));
const seeds = ['seed.sql', ...readdirSync(join(dirSupabase, 'seeds')).filter((f) => f.endsWith('.sql')).sort().map((f) => `seeds/${f}`)]
  .map((nome) => ({ nome, sql: readFileSync(join(dirSupabase, nome), 'utf8') }));

// Seeds rodam numa sessão só (a função pg_temp.criar_usuario_demo do seed.sql é usada pelas frentes)
const seedCompleto = seeds.map((s) => `-- ===== ${s.nome} =====\n${s.sql}`).join('\n\n');
writeFileSync(join(dirSupabase, 'seed-completo.sql'), seedCompleto);
console.log('✓ supabase/seed-completo.sql gerado');
if (args.has('--so-gerar')) process.exit(0);

function lerEnv() {
  const arquivo = join(raiz, 'backend', '.env');
  if (!existsSync(arquivo)) throw new Error('Falta backend/.env');
  return Object.fromEntries(readFileSync(arquivo, 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
}

const env = lerEnv();
const jdbc = (env.SUPABASE_DB_URL || '').replace(/^jdbc:/, '');
if (!jdbc.startsWith('postgresql://')) throw new Error('SUPABASE_DB_URL inválida em backend/.env');
const url = new URL(jdbc);
const { default: pg } = await import('pg');
const cliente = new pg.Client({
  host: url.hostname, port: Number(url.port || 5432), database: url.pathname.slice(1) || 'postgres',
  user: env.SUPABASE_DB_USER, password: env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
});
await cliente.connect();
console.log(`✓ conectado em ${url.hostname}`);

if (args.has('--resetar')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const resp = await rl.question('Isto APAGA todos os dados do schema public e os usuários @cleaneats.test. Digite "resetar" para continuar: ');
  rl.close();
  if (resp.trim() !== 'resetar') { console.log('Cancelado.'); process.exit(0); }
  await cliente.query(`
    drop schema public cascade;
    create schema public;
    grant usage on schema public to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
    delete from auth.users where email like '%@cleaneats.test';
  `);
  console.log('✓ banco limpo');
}

for (const m of migrations) {
  await cliente.query(m.sql).catch((e) => { throw new Error(`${m.nome}: ${e.message}`); });
  console.log(`✓ ${m.nome}`);
}
await cliente.query(seedCompleto).catch((e) => { throw new Error(`seeds: ${e.message}`); });
console.log('✓ seeds aplicados');
await cliente.end();
console.log('\nPronto. Usuários de demo: cliente@ / nutri@ / restaurante@ / admin@cleaneats.test — senha CleanEats@2026');
