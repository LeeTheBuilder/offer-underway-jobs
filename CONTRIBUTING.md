# Refreshing the job list

Run these commands from this repository. Node.js 20 or newer is required. There are no npm dependencies to install.

```bash
# Preview counts without changing files
npm run refresh -- --dry-run

# Refresh the local README and public listing data
npm run refresh

# Refresh, commit the generated files, and push to GitHub
npm run refresh:publish
```

Updates run only when you invoke a command. No daily schedule or GitHub Actions workflow is configured.

## Data access

The refresh command uses the existing `infra/scripts/prod-psql-prod.sh` helper in an authorised Offer Underway application checkout. By default, it looks for a sibling directory named `career-ops-chn`. For a different location:

```bash
npm run refresh -- --source-repo /path/to/career-ops-chn
```

The helper requires its existing deployment configuration, authenticated `gcloud`, Cloud SQL Auth Proxy, `psql`, and Python 3. Credentials remain in that private environment. No credentials or deployment configuration belong in this repository.

The query is a read-only transaction with a 30-second statement timeout. It reads canonical job postings and public crawler provenance; it does not read user profiles, applications, recommendations, or private lead records. The temporary query output is removed on completion or failure.

## Selection

Defaults: **50 jobs**, posted or first discovered within **14 days**, with at most **3 roles per company**. All locations are eligible. By default, titles must match software, data, AI, product, UX/design, cloud, platform, security, or testing keywords.

```bash
npm run refresh -- --limit 100 --days 30 --per-company 5

# Choose a different campaign focus (comma-separated literal title phrases)
npm run refresh -- --keywords "software,developer,data engineer"
```

A role must have been seen through a direct employer feed in the last three days, have an HTTPS source URL, and not be marked expired. The latest stored liveness observation must not report it closed. Job-board-only and user-import-only postings are excluded. This uses existing catalogue evidence; the refresh does not recrawl every employer or guarantee that a listing remains open.

The script considers the latest 2,000 eligible candidates, removes duplicate posting IDs and equivalent company/title/location rows, applies the company cap, and orders the result by posting date. It may publish fewer than the requested count when insufficient unique roles qualify. Empty results or invalid records fail without replacing the existing list.

Posting dates come from the source field. Missing dates, locations, or work arrangements are displayed as `Not specified`; discovery dates never become posting dates. The refresh date uses Australia/Melbourne time; posting dates use the stored source timestamp in UTC.

## Generated content and links

- `data/jobs.json`: only canonical posting ID, company, title, location, work model, posting date, and the refresh date.
- `README.md`: only the summary, table, and latest-update blocks delimited by `JOBS_SUMMARY`, `JOBS_TABLE`, and `JOBS_UPDATE` comments. Keep those markers intact. Git history retains previous lists.

Every job-title link is generated from a canonical posting ID:

```text
https://offerunderway.com/job-leads/posting%3A{POSTING_ID}?from=search&utm_source=github&utm_medium=repository&utm_campaign=offer_underway_jobs&utm_content=job_title
```

Company names are plain text. Employer and ATS URLs are never used as campaign destinations. The website can require sign-in to view role details.

The brand graphics and browse buttons remain hand-maintained. Browse links use `https://offerunderway.com/job-leads?tab=search` with the same campaign parameters. In HTML attributes, encode `&` as `&amp;`.

## Publishing and validation

`npm run refresh` changes local files only. Review them with `git diff -- README.md data/jobs.json`. `npm run refresh:publish` performs another live refresh and publishes its results; it requires `main`, the expected campaign remote, no pre-staged changes, and no other modified tracked files. It commits only `README.md` and `data/jobs.json`, and skips the commit when nothing changed. If a push fails, the local commit remains available to retry with `git push origin main`.

Run the focused tests after changing the script:

```bash
npm test
```

For listing corrections, open an issue or contact admin@offerunderway.com. Fix incorrect source metadata in the catalogue so a later refresh does not reintroduce it.
