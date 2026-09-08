# Maintaining the job list

Update `README.md` manually. This starter repository has no scheduled workflow, crawler, or connection to a private database.

## Add a role

1. Find a real role on Offer Underway and confirm its company, title, location, work arrangement, and posting date.
2. Use the canonical posting identifier from that role. Do not publish a user-specific lead, profile, application, match score, or private account URL.
3. Link the job title to the corresponding Offer Underway detail page. Open the final URL and confirm the company and title match before adding the row. Do not substitute an employer or ATS application URL, or link a specific title to a generic search page.
4. Add the row between `JOBS_TABLE_START` and `JOBS_TABLE_END`, newest posting date first. Use `Not specified` for missing details; do not use the update date as the posting date. Escape table pipes as `\|`.
5. Replace the starter-edition notice when real listings are present, update the list's review date, and add a short entry under Updates. Remove closed roles when reviewing the list.

### Job link format

The website supports canonical posting links in this form:

```text
https://offerunderway.com/job-leads/posting%3A{POSTING_ID}?from=search&utm_source=github&utm_medium=repository&utm_campaign=offer_underway_jobs&utm_content=job_title
```

Replace `{POSTING_ID}` with the real canonical posting ID. The placeholder is documentation only and must never be published as a live listing. Verify the full link in the website before use; the skeleton does not establish availability of any individual job.

### Row format

```markdown
| **Company name** | **[Job title](VERIFIED_OFFER_UNDERWAY_DETAIL_URL)** | City, Country | Remote / Hybrid / On Site / Not specified | YYYY-MM-DD / Not specified |
```

Company names are plain text so all job-related click-throughs stay on Offer Underway. For multiple consecutive roles at the same company, `↳` can replace the repeated company name.

## Campaign links and artwork

Use `https://offerunderway.com/job-leads?tab=search` for browse links. Include `utm_source=github`, `utm_medium=repository`, and `utm_campaign=offer_underway_jobs`; use `utm_content` to distinguish placements. In HTML attributes, encode `&` as `&amp;`.

The images in `static/img/` use Offer Underway's public wordmark and jade palette. Keep the visible brand, alternative text, and destinations consistent. Contact: admin@offerunderway.com.

## Automation

Daily updates are intentionally not configured. Adding a schedule or a publishing pipeline is a separate future change.
