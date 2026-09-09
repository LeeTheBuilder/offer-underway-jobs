import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { prepareJobs, updateReadme, jobUrl, titlePattern } from '../refresh-jobs.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n, extra = {}) => ({ id: id(n), company: 'Example Co', title: `Engineer ${n}`,
  location: 'Melbourne, Australia', workModel: 'on_site', postedAt: '2026-09-08', ...extra });
const snapshot = jobs => ({ updatedAt: '2026-09-09', jobs });
const readme = ['Header stays', ...['JOBS_SUMMARY', 'JOBS_TABLE', 'JOBS_UPDATE']
  .map(name => `<!-- ${name}_START -->\nold content\n<!-- ${name}_END -->`), 'Footer stays'].join('\n');

test('only projects public fields and never consumes source URLs or user data', () => {
  const data = prepareJobs(snapshot([row(1, { job_url: 'https://employer.invalid/apply',
    userEmail: 'synthetic@example.invalid', raw_payload: { private: 'SYNTHETIC_PRIVATE' } })]));
  assert.deepEqual(Object.keys(data.jobs[0]), ['id', 'company', 'title', 'location', 'workModel', 'postedAt']);
  const output = JSON.stringify(data) + updateReadme(readme, data);
  assert.doesNotMatch(output, /employer\.invalid|synthetic@example|SYNTHETIC_PRIVATE/);
  const url = new URL(jobUrl(id(1)));
  assert.equal(url.origin, 'https://offerunderway.com');
  assert.equal(url.pathname, `/jobs/info/${id(1)}`);
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    utm_source: 'github', utm_medium: 'repository',
    utm_campaign: 'offer_underway_jobs', utm_content: 'job_title'
  });
});

test('deduplicates IDs and same role/location while retaining distinct locations and limiting companies', () => {
  const data = prepareJobs(snapshot([row(1), row(1), row(2, { title: 'Engineer 1' }),
    row(3, { title: 'Engineer 1', location: 'Sydney, Australia' }), row(4),
    row(5, { company: 'Second Co' })]), { limit: 50, perCompany: 2 });
  assert.deepEqual(data.jobs.map(job => job.id), [id(1), id(3), id(5)]);
});

test('uses real posting dates, sorts newest first and preserves missing values', () => {
  const data = prepareJobs(snapshot([row(1, { postedAt: null, location: null, workModel: 'unknown' }),
    row(2, { postedAt: '2026-09-07' }), row(3)]));
  assert.deepEqual(data.jobs.map(job => job.id), [id(3), id(2), id(1)]);
  assert.equal(data.jobs[2].postedAt, null);
  assert.equal(data.jobs[2].location, 'Not specified');
  assert.equal(data.jobs[2].workModel, 'Not specified');
  assert.equal(data.jobs[0].workModel, 'On Site');
  assert.match(updateReadme(readme, data), /Not specified \| Not specified \| Not specified/);
  assert.equal(prepareJobs(snapshot([row(1), row(2)]), { limit: 1 }).jobs.length, 1);
});

test('fails closed for empty data, invalid dates, future dates and noncanonical IDs', () => {
  for (const jobs of [[], [row(1, { id: 'https://outside.invalid' })],
    [row(1, { postedAt: '2026-02-30' })], [row(1, { postedAt: '2026-09-10' })],
    [row(1, { company: '' })]]) assert.throws(() => prepareJobs(snapshot(jobs)));
  assert.throws(() => jobUrl('fake-id'));
});

test('escapes untrusted Markdown and HTML without adding table rows or links', () => {
  const data = prepareJobs(snapshot([row(1, { company: '<img src=x>',
    title: '[Click](https://outside.invalid) | **role**\nnew line' })]));
  const result = updateReadme(readme, data);
  assert.doesNotMatch(result, /<img|\[Click\]\(https:\/\/outside/);
  assert.match(result, /&lt;img src=x&gt;/);
  assert.ok(result.includes('\\| \\*\\*role\\*\\* new line'));
  assert.equal(result.split('\n').filter(line => line.startsWith('| **')).length, 1);
});

test('updates only named blocks, is idempotent, and rejects missing or duplicate markers', () => {
  const data = prepareJobs(snapshot([row(1)]));
  const result = updateReadme(readme, data);
  assert.ok(result.startsWith('Header stays\n'));
  assert.ok(result.endsWith('\nFooter stays'));
  assert.equal(updateReadme(result, data), result);
  assert.throws(() => updateReadme(readme.replace('JOBS_TABLE_END', 'BROKEN'), data));
  assert.throws(() => updateReadme(readme + '\n<!-- JOBS_UPDATE_START -->', data));
});

test('validates CLI options before any query or writes', () => {
  const script = new URL('../refresh-jobs.mjs', import.meta.url);
  for (const args of [['--limit', '0'], ['--days', '1;DROP TABLE'], ['--per-company', '100'],
    ['--publish', '--dry-run'], ['--unknown']]) {
    assert.throws(() => execFileSync(process.execPath, [script.pathname, ...args], { stdio: 'pipe' }));
  }
  assert.match(execFileSync(process.execPath, [script.pathname, '--help'], { encoding: 'utf8' }), /read-only/);
});


test('title keywords are literal phrases, with regex metacharacters escaped', () => {
  const pattern = new RegExp(titlePattern('C++, .NET, data (AI)'), 'i');
  assert.ok(pattern.test('C++ engineer'));
  assert.ok(pattern.test('.NET developer'));
  assert.ok(pattern.test('Data (AI) specialist'));
  assert.ok(!pattern.test('CCCC engineer'));
  assert.throws(() => titlePattern(' , '));
});
