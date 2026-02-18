#!/usr/bin/env node
// scripts/psql.js — Wrapper para psql com credenciais do Supabase
// Uso: node scripts/psql.js "SELECT count(*) FROM clinics;"
// Ou:  node scripts/psql.js  (modo interactivo)

const { spawn } = require('child_process');
const fs = require('fs');

// Ler .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const projectRef = SUPABASE_URL?.replace('https://', '').split('.')[0];

// Credenciais fixas (não dependem de URL encoding)
const HOST = 'aws-1-eu-west-2.pooler.supabase.com';
const PORT = '5432';
const USER = `postgres.${projectRef}`;
const DB = 'postgres';
const PASSWORD = 'FabioDias123?!';

const sql = process.argv[2];

const psqlArgs = [
    '--no-psqlrc',
    '-P', 'pager=off',
    '-h', HOST,
    '-p', PORT,
    '-U', USER,
    '-d', DB,
];

if (sql) {
    psqlArgs.push('-c', sql);
}

const PSQL_PATH = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';

console.log(`🔌 Conectando a ${HOST}:${PORT} como ${USER}...`);

const psql = spawn(PSQL_PATH, psqlArgs, {
    env: { ...process.env, PGPASSWORD: PASSWORD, PGSSLMODE: 'require', PAGER: '' },
    stdio: 'inherit',
    shell: false,
});

psql.on('close', (code) => {
    process.exit(code);
});
