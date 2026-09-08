#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_KEYWORDS = 'software,developer,full stack,fullstack,frontend,front end,backend,back end,data engineer,data scientist,data analyst,data specialist,machine learning,artificial intelligence,product manager,product designer,product owner,ux,ui designer,devops,cloud engineer,platform engineer,security engineer,quality engineer,test engineer';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const markers = ['JOBS_SUMMARY', 'JOBS_TABLE', 'JOBS_UPDATE'];

export function titlePattern(value) {
  const keywords = value.split(',').map(word => word.trim()).filter(Boolean);
  if (!keywords.length || keywords.length > 50 || keywords.some(word => word.length > 80)) throw new Error('Provide 1–50 title keywords, each at most 80 characters.');
  return keywords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
}
function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Expected a valid YYYY-MM-DD date.');
  }
  return value;
}
function clean(value, required = false) {
  if (value == null && !required) return 'Not specified';
  if (typeof value !== 'string') throw new Error('Invalid listing text.');
  const result = value.replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim();
  if ((!result && required) || result.length > 500) throw new Error('Invalid listing text.');
  return result || 'Not specified';
}
export function escapeMarkdown(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([\\`*_{}\[\]()!|~])/g, '\\$1');
}
function workModel(value) {
  const text = clean(value);
  const key = text.toLowerCase().replace(/[\s_-]/g, '');
  return ({ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On Site',
    inperson: 'On Site', office: 'On Site' })[key] ?? 'Not specified';
}
export function jobUrl(id) {
  if (!UUID.test(id)) throw new Error('Invalid canonical posting ID.');
  return `https://offerunderway.com/job-leads/${encodeURIComponent(`posting:${id}`)}?from=search&utm_source=github&utm_medium=repository&utm_campaign=offer_underway_jobs&utm_content=job_title`;
}
export function prepareJobs(input, { limit = 50, perCompany = 3 } = {}) {
  const updatedAt = date(input.updatedAt);
  if (!Array.isArray(input.jobs) || input.jobs.length === 0) throw new Error('No eligible jobs; existing files were preserved.');
  const rows = input.jobs.map(row => {
    jobUrl(row.id);
    const postedAt = row.postedAt == null ? null : date(row.postedAt);
    if (postedAt && postedAt > updatedAt) throw new Error('Future posting date.');
    // Deliberately project only public listing fields; never spread source rows.
    return { id: row.id.toLowerCase(), company: clean(row.company, true), title: clean(row.title, true),
      location: clean(row.location), workModel: workModel(row.workModel), postedAt };
  }).sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? '') || a.id.localeCompare(b.id));
  const ids = new Set(), roles = new Set(), companies = new Map(), jobs = [];
  for (const row of rows) {
    const company = row.company.toLowerCase();
    const role = JSON.stringify([company, row.title.toLowerCase(), row.location.toLowerCase()]);
    if (ids.has(row.id) || roles.has(role) || (companies.get(company) ?? 0) >= perCompany) continue;
    ids.add(row.id); roles.add(role); companies.set(company, (companies.get(company) ?? 0) + 1);
    jobs.push(row);
    if (jobs.length >= limit) break;
  }
  if (!jobs.length) throw new Error('No publishable jobs; existing files were preserved.');
  return { updatedAt, jobs };
}
function replaceBlock(readme, name, content) {
  const start = `<!-- ${name}_START -->`, end = `<!-- ${name}_END -->`;
  if (readme.split(start).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(start) >= readme.indexOf(end)) {
    throw new Error(`Missing, duplicate, or reversed ${name} markers; README was preserved.`);
  }
  return readme.slice(0, readme.indexOf(start) + start.length) + `\n\n${content}\n\n` + readme.slice(readme.indexOf(end));
}
export function updateReadme(readme, data) {
  const { jobs, updatedAt } = data;
  const companies = new Set(jobs.map(job => job.company.toLowerCase())).size;
  const contents = [
    `**Last updated: ${updatedAt} (Melbourne) · ${jobs.length} jobs · ${companies} companies**\n\nSelected from recently seen employer feeds. Open a job title to view the role on Offer Underway.`,
    '| Company | Job Title | Location | Work Model | Date Posted |\n| ------- | --------- | -------- | ---------- | ----------- |\n' +
      jobs.map(row => `| **${escapeMarkdown(row.company)}** | **[${escapeMarkdown(row.title)}](${jobUrl(row.id)})** | ${escapeMarkdown(row.location)} | ${row.workModel} | ${row.postedAt ?? 'Not specified'} |`).join('\n'),
    `- **${updatedAt}:** Refreshed ${jobs.length} roles across ${companies} companies.`
  ];
  return markers.reduce((text, marker, i) => replaceBlock(text, marker, contents[i]), readme);
}
function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function assertPublishable() {
  if (git(['branch', '--show-current']) !== 'main') throw new Error('Publishing requires main.');
  if (!/^((git@github.com:)|(https:\/\/github.com\/))LeeTheBuilder\/offer-underway-jobs(?:\.git)?$/.test(git(['remote', 'get-url', '--push', 'origin']))) {
    throw new Error('Publishing requires the Offer Underway jobs remote.');
  }
  if (git(['diff', '--cached', '--name-only'])) throw new Error('Unstage existing changes before using --publish.');
  const otherChanges = git(['diff', '--name-only']).split('\n').filter(path => path && !['README.md', 'data/jobs.json'].includes(path));
  if (otherChanges.length) throw new Error('Commit other tracked changes before using --publish.');
}
function atomicWrite(path, content) {
  const temporary = `${path}.tmp`;
  try { writeFileSync(temporary, content); renameSync(temporary, path); }
  finally { rmSync(temporary, { force: true }); }
}
export function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    'source-repo': { type: 'string', default: resolve(ROOT, '../career-ops-chn') },
    keywords: { type: 'string', default: DEFAULT_KEYWORDS },
    limit: { type: 'string', default: '50' }, days: { type: 'string', default: '14' },
    'per-company': { type: 'string', default: '3' },
    'dry-run': { type: 'boolean', default: false }, publish: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  } });
  if (values.help) {
    console.log('Usage: node scripts/refresh-jobs.mjs [--limit 50] [--days 14] [--per-company 3]\n  [--keywords software,developer,data] [--source-repo /path/to/career-ops-chn] [--dry-run | --publish]\nReads live catalogue in a read-only transaction. Default: update local README and data only.\n--dry-run reads and previews counts without writing. --publish also commits and pushes the two generated files.');
    return;
  }
  const numbers = {};
  for (const [key, max] of [['limit', 200], ['days', 90], ['per-company', 20]]) {
    if (!/^[1-9]\d*$/.test(values[key]) || Number(values[key]) > max) throw new Error(`--${key} must be an integer from 1 to ${max}.`);
    numbers[key] = Number(values[key]);
  }
  const pattern = titlePattern(values.keywords);
  if (values.publish && values['dry-run']) throw new Error('Choose --dry-run or --publish, not both.');
  if (values.publish) assertPublishable();
  const helper = resolve(values['source-repo'], 'infra/scripts/prod-psql-prod.sh');
  if (!existsSync(helper)) throw new Error('Database helper not found. Supply --source-repo pointing to your authorised Offer Underway application checkout.');
  const directory = mkdtempSync(join(tmpdir(), 'offer-underway-jobs-'));
  try {
    const snapshot = join(directory, 'jobs.json');
    console.log('Reading recent catalogue listings (read-only)…');
    try {
      execFileSync('bash', [helper, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', `days=${numbers.days}`, '-v', `title_pattern=${pattern}`,
        '-o', snapshot, '-f', join(ROOT, 'scripts/select-jobs.sql')],
      { cwd: resolve(values['source-repo']), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
    } catch {
      throw new Error('Catalogue query failed; existing files were preserved. Check gcloud authentication, Cloud SQL proxy, psql, and the source checkout configuration.');
    }
    const data = prepareJobs(JSON.parse(readFileSync(snapshot, 'utf8')), { limit: numbers.limit, perCompany: numbers['per-company'] });
    const readmePath = join(ROOT, 'README.md'), dataPath = join(ROOT, 'data/jobs.json');
    const readme = updateReadme(readFileSync(readmePath, 'utf8'), data);
    console.log(`Selected ${data.jobs.length} jobs across ${new Set(data.jobs.map(job => job.company.toLowerCase())).size} companies; snapshot ${data.updatedAt}.`);
    if (values['dry-run']) { console.log('Dry run complete; no files changed.'); return; }
    atomicWrite(dataPath, JSON.stringify(data, null, 2) + '\n');
    atomicWrite(readmePath, readme);
    if (values.publish) {
      // Recheck after the query in case another task staged changes meanwhile.
      assertPublishable();
      git(['add', '--', 'README.md', 'data/jobs.json']);
      if (git(['diff', '--cached', '--name-only'])) git(['commit', '-m', `Refresh Offer Underway jobs (${data.updatedAt})`]);
      git(['push', 'origin', 'main']);
      console.log('Published https://github.com/LeeTheBuilder/offer-underway-jobs');
    } else console.log('Updated README.md and data/jobs.json locally. Review the diff, or rerun with --publish to publish.');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(`refresh-jobs: ${error.message}`); process.exitCode = 1; }
}
