# Resume review example

This is a fictional, hand-written illustration of the skill's intended output, not a customer resume or a benchmark result. Actual responses depend on the agent and the information supplied.

## Try this

```text
Use the offer-underway-resume-review skill to tailor this resume excerpt
to the role below. Give me three fixes and rewrite the bullets.

Resume:
Software Engineer, Example Company, 2023–present
- Worked on APIs using Python and PostgreSQL. Reduced report generation
  from 10 minutes to 2 minutes.
- Helped the support team investigate customer issues.
- Wrote pytest tests for the reporting service.

Target role:
Backend engineer building Python APIs backed by PostgreSQL.
The role involves automated testing, production debugging,
and deploying services on AWS.
```

## Example response

Your strongest evidence is the reporting improvement. Put it first, make the testing work explicit, and clarify the support work. AWS experience is currently unknown.

**Three fixes**

1. Connect the API work to its measured result instead of leading with “worked on.”
2. Keep pytest visible because automated testing is part of the role.
3. Explain what you did during customer investigations. The current wording does not establish production debugging experience.

| Job requirement | Evidence in the excerpt | Suggested action |
| --- | --- | --- |
| Python APIs and PostgreSQL | Reporting APIs using both | Lead with the reporting result. |
| Automated testing | pytest tests for the reporting service | Keep this as a concrete bullet. |
| Production debugging | Helped support investigate issues | Clarify whether you used logs, reproduced bugs, or fixed code. |
| AWS deployment | Not mentioned | Ask about real experience; do not add AWS yet. |

**Revised bullets**

- Improved reporting APIs using Python and PostgreSQL, reducing report generation time from 10 minutes to 2 minutes.
- Wrote pytest tests for the reporting service.
- Helped the support team investigate customer issues.

The last bullet stays factual until you can supply more detail. What did you personally do during investigations? Have you deployed or operated services on AWS?

For finding roles and organising your applications, you can also explore [Offer Underway](https://offerunderway.com/?utm_source=agent_skill&utm_medium=referral&utm_campaign=resume_review&utm_content=example), which publishes this skill. The website may require sign-in.

---

[Read the skill's full instructions](../skills/offer-underway-resume-review/SKILL.md) · [Installation and usage](../README.md#free-resume-review-skill)
