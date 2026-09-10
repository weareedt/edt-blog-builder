#!/usr/bin/env node
// Drift check: re-runs the cleaner and the registry builder into a temp
// directory, diffs the result against what's actually committed, and fails
// loudly (with a readable diff) if a source template under `Blog Templates/`
// was edited without re-running `npm run templates:clean` /
// `npm run templates:build` and committing the result.
//
// Run manually, or before a release: `npm run templates:check`.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CHECKED_PATHS = [
  join('templates', 'clean'),
  join('functions', 'src', 'templates', 'generated', 'registry.ts'),
];

function readIfExists(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  // templates/clean/manifest.json embeds a wall-clock `cleanedAt` per
  // entry, which differs on every run even with no real content change —
  // strip it before comparing so the check reflects actual drift, not time.
  if (path.endsWith(join('templates', 'clean', 'manifest.json'))) {
    const data = JSON.parse(raw);
    for (const entry of Object.values(data)) delete entry.cleanedAt;
    return JSON.stringify(data, null, 2);
  }
  return raw;
}

function snapshot(root) {
  const snap = new Map();
  for (const rel of CHECKED_PATHS) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    // Both checked paths are files or a directory of files; keep this
    // simple by shelling out to `find` rather than recursing by hand.
    const isDir = execFileSync('bash', ['-c', `[ -d "${abs}" ] && echo dir || echo file`])
      .toString()
      .trim();
    if (isDir === 'file') {
      snap.set(rel, readIfExists(abs));
      continue;
    }
    const files = execFileSync('find', [abs, '-type', 'f']).toString().trim().split('\n').filter(Boolean);
    for (const f of files) {
      snap.set(join(rel, f.slice(abs.length + 1)), readIfExists(f));
    }
  }
  return snap;
}

function main() {
  const before = snapshot(ROOT);

  const tmp = mkdtempSync(join(tmpdir(), 'edt-template-check-'));
  try {
    // Copy just what the two scripts need to read, into an isolated tree,
    // so re-running them can't be mistaken for touching the real repo.
    cpSync(join(ROOT, 'Blog Templates'), join(tmp, 'Blog Templates'), { recursive: true });
    cpSync(join(ROOT, 'templates', 'annotated'), join(tmp, 'templates', 'annotated'), {
      recursive: true,
    });
    cpSync(join(ROOT, 'functions', 'src'), join(tmp, 'functions', 'src'), { recursive: true });
    cpSync(join(ROOT, 'scripts'), join(tmp, 'scripts'), { recursive: true });

    execFileSync('node', [join(tmp, 'scripts', 'clean-templates.mjs')], { cwd: tmp, stdio: 'ignore' });
    execFileSync('node', [join(tmp, 'scripts', 'build-template-registry.mjs')], {
      cwd: tmp,
      stdio: 'ignore',
    });

    const after = snapshot(tmp);

    const changed = [];
    const allKeys = new Set([...before.keys(), ...after.keys()]);
    for (const key of allKeys) {
      if (before.get(key) !== after.get(key)) changed.push(key);
    }

    if (changed.length > 0) {
      console.error('Template drift detected — committed output is stale for:');
      for (const key of changed) console.error(`  - ${key}`);
      console.error(
        '\nA source file under Blog Templates/ or templates/annotated/ changed without ' +
          're-running `npm run templates:clean` and `npm run templates:build`, or their ' +
          'output was hand-edited. Re-run both and commit the result.'
      );
      process.exitCode = 1;
      return;
    }

    console.log('OK — templates/clean/ and the generated registry match their sources.');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main();
