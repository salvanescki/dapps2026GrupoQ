#!/usr/bin/env node
/**
 * Script auxiliar para consultar issues abiertos de SonarQube Cloud (Región EU)
 * y generar resúmenes o insumos estructurados para Speckit (speckit-specify / speckit-plan).
 *
 * Lee credenciales opcionales desde .env.local / .env (nunca hardcodeadas).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const cleaned = line.replace(/^export\s+/, '');
    const eqIdx = cleaned.indexOf('=');
    if (eqIdx === -1) continue;
    const key = cleaned.slice(0, eqIdx).trim();
    let val = cleaned.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && val !== '') {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(os.homedir(), '.gemini', 'config', 'sonarqube.env'));
loadEnvFile(path.join(REPO_ROOT, '.env'));
loadEnvFile(path.join(REPO_ROOT, '.env.local'));

const SONAR_URL = (process.env.SONARQUBE_URL || 'https://sonarcloud.io').replace(/\/+$/, '');
const SONAR_ORG = process.env.SONARQUBE_ORG || 'salvanescki';
const PROJECT_KEY = process.env.SONARQUBE_PROJECT_KEY || 'salvanescki_dapps2026GrupoQ';
const TOKEN = process.env.SONARQUBE_TOKEN || process.env.SONAR_TOKEN || '';

function parseArgs(argv) {
  const opts = {
    summary: false,
    speckitBrief: false,
    syncJson: false,
    modules: [],
    severities: [],
    rules: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--summary') opts.summary = true;
    else if (arg === '--speckit-brief') opts.speckitBrief = true;
    else if (arg === '--sync-json') opts.syncJson = true;
    else if (arg === '--module' && argv[i + 1]) {
      opts.modules = argv[++i].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    } else if (arg === '--severity' && argv[i + 1]) {
      opts.severities = argv[++i].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (arg === '--rule' && argv[i + 1]) {
      opts.rules = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!opts.summary && !opts.speckitBrief && !opts.syncJson) {
    opts.summary = true;
  }
  return opts;
}

async function fetchAllOpenIssues() {
  const headers = { Accept: 'application/json' };
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  let pageIndex = 1;
  const pageSize = 500;
  let allIssues = [];
  let rawFirstPage = null;

  while (true) {
    const url = new URL(`${SONAR_URL}/api/issues/search`);
    url.searchParams.set('componentKeys', PROJECT_KEY);
    url.searchParams.set('organization', SONAR_ORG);
    url.searchParams.set('resolved', 'false');
    url.searchParams.set('ps', String(pageSize));
    url.searchParams.set('p', String(pageIndex));

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SonarQube Cloud API error (${res.status}): ${body}`);
    }
    const data = await res.json();
    if (!rawFirstPage) rawFirstPage = data;
    const issues = data.issues || [];
    allIssues = allIssues.concat(issues);

    const total = data.paging?.total ?? data.total ?? allIssues.length;
    if (allIssues.length >= total || issues.length === 0) {
      break;
    }
    pageIndex += 1;
  }

  return { issues: allIssues, rawFirstPage };
}

function enrichIssue(issue) {
  const filePath = (issue.component || '').replace(`${PROJECT_KEY}:`, '');
  let moduleName = 'other';
  if (filePath.startsWith('backend/')) moduleName = 'backend';
  else if (filePath.startsWith('frontend/')) moduleName = 'frontend';

  return {
    key: issue.key,
    rule: issue.rule,
    severity: issue.severity || 'MAJOR',
    type: issue.type || 'CODE_SMELL',
    status: issue.issueStatus || issue.status || 'OPEN',
    file: filePath,
    line: issue.line || issue.textRange?.startLine || 1,
    endLine: issue.textRange?.endLine || issue.line || 1,
    message: issue.message || '',
    effort: issue.effort || issue.debt || '5min',
    module: moduleName,
    impacts: issue.impacts || [],
  };
}

function filterIssues(issues, opts) {
  return issues.filter((item) => {
    if (opts.modules.length > 0 && !opts.modules.includes(item.module)) {
      return false;
    }
    if (opts.severities.length > 0 && !opts.severities.includes(item.severity)) {
      return false;
    }
    if (opts.rules.length > 0 && !opts.rules.includes(item.rule)) {
      return false;
    }
    return true;
  });
}

function renderSummary(issues, rawFirstPage) {
  const bySeverity = {};
  const byModule = {};
  const byRule = {};

  for (const item of issues) {
    bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
    byModule[item.module] = (byModule[item.module] || 0) + 1;
    if (!byRule[item.rule]) {
      byRule[item.rule] = {
        count: 0,
        severity: item.severity,
        type: item.type,
        sampleMessage: item.message,
        modules: new Set(),
      };
    }
    byRule[item.rule].count += 1;
    byRule[item.rule].modules.add(item.module);
  }

  const lines = [];
  lines.push(`# Resumen de Issues Abiertos en SonarQube Cloud (EU)`);
  lines.push(`- **Organización**: \`${SONAR_ORG}\``);
  lines.push(`- **Proyecto**: \`${PROJECT_KEY}\``);
  lines.push(`- **Total de issues filtrados**: **${issues.length}** (Deuda técnica total proyecto: ${rawFirstPage?.debtTotal ?? 0} min)`);
  lines.push('');

  lines.push(`## 1. Distribución por Módulo`);
  lines.push(`| Módulo | Cantidad de Issues |`);
  lines.push(`| --- | --- |`);
  for (const [mod, count] of Object.entries(byModule).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${mod}\` | ${count} |`);
  }
  lines.push('');

  lines.push(`## 2. Distribución por Severidad`);
  lines.push(`| Severidad | Cantidad de Issues |`);
  lines.push(`| --- | --- |`);
  const sevOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
  for (const sev of sevOrder) {
    if (bySeverity[sev]) {
      lines.push(`| \`${sev}\` | ${bySeverity[sev]} |`);
    }
  }
  lines.push('');

  lines.push(`## 3. Agrupación por Regla de SonarQube`);
  lines.push(`| Regla | Severidad | Tipo | Módulos | Cantidad | Ejemplo de Mensaje |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  const sortedRules = Object.entries(byRule).sort((a, b) => b[1].count - a[1].count);
  for (const [rule, info] of sortedRules) {
    const mods = Array.from(info.modules).join(', ');
    const msg = info.sampleMessage.replace(/\|/g, '\\|');
    lines.push(`| \`${rule}\` | \`${info.severity}\` | \`${info.type}\` | \`${mods}\` | ${info.count} | ${msg} |`);
  }

  return lines.join('\n');
}

function renderSpeckitBrief(issues) {
  const byRule = {};
  for (const item of issues) {
    if (!byRule[item.rule]) {
      byRule[item.rule] = {
        severity: item.severity,
        type: item.type,
        items: [],
      };
    }
    byRule[item.rule].items.push(item);
  }

  const lines = [];
  lines.push(`# Insumo de Remediación SonarQube Cloud para Speckit`);
  lines.push(`- **Proyecto**: \`${PROJECT_KEY}\` (Organización \`${SONAR_ORG}\`, Región EU)`);
  lines.push(`- **Issues incluidos en el alcance**: ${issues.length}`);
  lines.push('');

  for (const [rule, group] of Object.entries(byRule).sort((a, b) => b[1].items.length - a[1].items.length)) {
    lines.push(`## Regla \`${rule}\` (${group.severity} - ${group.type}) — ${group.items.length} ocurrencia(s)`);
    lines.push(`**Descripción patrón**: ${group.items[0].message}`);
    lines.push('');
    lines.push(`| Archivo | Línea(s) | Mensaje específico | Esfuerzo |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const it of group.items) {
      const range = it.endLine !== it.line ? `${it.line}-${it.endLine}` : `${it.line}`;
      const msg = it.message.replace(/\|/g, '\\|');
      lines.push(`| \`${it.file}\` | ${range} | ${msg} | ${it.effort} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { issues: rawIssues, rawFirstPage } = await fetchAllOpenIssues();

  if (opts.syncJson && rawFirstPage) {
    const targetPath = path.join(REPO_ROOT, 'sonar-issues.json');
    rawFirstPage.issues = rawIssues;
    fs.writeFileSync(targetPath, JSON.stringify(rawFirstPage), 'utf8');
    console.error(`[sonarcloud-issues] Archivo actualizado: ${targetPath} (${rawIssues.length} issues)`);
  }

  const enriched = rawIssues.map(enrichIssue);
  const filtered = filterIssues(enriched, opts);

  if (opts.summary) {
    console.log(renderSummary(filtered, rawFirstPage));
  }
  if (opts.speckitBrief) {
    if (opts.summary) console.log('\n---\n');
    console.log(renderSpeckitBrief(filtered));
  }
}

main().catch((err) => {
  console.error(`[sonarcloud-issues] Error: ${err.message}`);
  process.exit(1);
});

