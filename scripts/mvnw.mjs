// Chama o Maven Wrapper certo para o sistema (mvnw.cmd no Windows, ./mvnw nos demais).
// Uso: node ../scripts/mvnw.mjs <argumentos>   (rodar de dentro de backend/)
import { spawn } from 'node:child_process';

const windows = process.platform === 'win32';
const filho = spawn(windows ? 'mvnw.cmd' : './mvnw', process.argv.slice(2), { stdio: 'inherit', shell: windows });
filho.on('exit', (codigo) => process.exit(codigo ?? 1));
