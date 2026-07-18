#!/usr/bin/env node
// Ingest the .md knowledge files in this folder into Athena's RAG (Qdrant via /rag/ingest).
//
// Usage:
//   API_URL=https://athena-api.onrender.com ATHENA_TOKEN=<jwt> node scripts/knowledge/ingest.mjs
//
// ATHENA_TOKEN: log in via the app (or POST /api/v1/auth/login) and copy the accessToken.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TOKEN = process.env.ATHENA_TOKEN;

if (!TOKEN) {
  console.error('Missing ATHENA_TOKEN. Log in and export the JWT access token first.');
  process.exit(1);
}

function parseDoc(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing frontmatter (expected --- source/category --- block)');
  const meta = Object.fromEntries(
    match[1].split('\n').filter(Boolean).map((line) => {
      const idx = line.indexOf(':');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
  );
  return { source: meta.source, category: meta.category, text: match[2].trim() };
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

for (const file of files) {
  const { source, category, text } = parseDoc(readFileSync(join(DIR, file), 'utf8'));
  process.stdout.write(`Ingesting "${source}" (${category})... `);
  const res = await fetch(`${API_URL}/api/v1/rag/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ text, source, category }),
  });
  if (!res.ok) {
    console.log(`FAILED (${res.status}): ${await res.text()}`);
    continue;
  }
  console.log('OK', await res.json());
}
