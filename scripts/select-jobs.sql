\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL timezone = 'UTC';
WITH candidates AS (
  SELECT jp.id, jp.company, jp.title, jp.location, jp.workplace_type, jp.posted_at,
         max(s.last_seen_at) AS source_seen_at
  FROM job_postings jp
  JOIN job_posting_sources s ON s.posting_id = jp.id
  WHERE s.source = 'direct_careers'
    AND s.source_kind = 'direct_careers'
    AND jp.title ~* :'title_pattern'
    AND s.last_seen_at >= now() - interval '3 days'
    AND jp.expired_at IS NULL
    AND btrim(jp.company) <> '' AND btrim(jp.title) <> ''
    AND jp.job_url ~ '^https://'
    AND COALESCE(jp.posted_at, jp.first_seen_at) >= now() - (:'days'::int * interval '1 day')
    AND (jp.posted_at IS NULL OR jp.posted_at <= now())
    AND COALESCE((
      SELECT o.status FROM job_posting_liveness_observations o
      WHERE o.posting_id = jp.id ORDER BY o.checked_at DESC, o.id DESC LIMIT 1
    ), 'uncertain') <> 'expired'
  GROUP BY jp.id
  ORDER BY jp.posted_at DESC NULLS LAST, source_seen_at DESC, jp.id
  LIMIT 2000
)
SELECT json_build_object(
  'updatedAt', to_char(now() AT TIME ZONE 'Australia/Melbourne', 'YYYY-MM-DD'),
  'jobs', COALESCE(json_agg(json_build_object(
    'id', id, 'company', company, 'title', title, 'location', location,
    'workModel', workplace_type, 'postedAt', to_char(posted_at, 'YYYY-MM-DD')
  ) ORDER BY posted_at DESC NULLS LAST, source_seen_at DESC, id), '[]'::json)
) FROM candidates;
COMMIT;
