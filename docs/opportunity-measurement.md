# Opportunity measurement

The site should make the origin of an inquiry legible without adding a third-party analytics service. The contact page accepts a small, allowlisted query contract:

`/contact.html?topic=<value>&project=<value>&from=<value>`

| Parameter | Allowed values | Stored with the submitted message as |
| --- | --- | --- |
| `topic` | `full-time-software-engineering`, `research-scientific-computing`, `creative-engineering-collaboration`, `technical-conversation` | `interest` |
| `project` | `c-1n`, `robotics-test-bench`, `lmlab`, `indigo`, `fourier`, `jelly`, `tiramisu`, `magnet`, `creative-engineering`, `portfolio` | `project` |
| `from` | `portfolio`, `project`, `notes`, `resume`, `github`, `linkedin`, `referral` | `entry_surface` |

Each parameter must appear exactly once and match the allowlist. Unknown, repeated, or arbitrary values are ignored. `from` records the page or external surface that linked to this contact page; it is not a claim about original discovery. The separate optional `discovery_source` text field is left blank for the visitor to describe that, if useful. The page does not read, retain, or submit the document referrer or any other query parameter. Visitors can change or leave every context field empty before sending. Direct email remains a valid route and has no automatic attribution.

## What to count

A contact-page visit or a click from a project to contact is only a **signal of interest**. It does not establish that an opportunity exists. A successful Formspree response is a **submitted inquiry**; it may still be spam, a personal note, or an unrelated request.

Record an **interview request** only after a sender explicitly invites or asks to schedule a screening or interview. a general role inquiry is a recruiting conversation, not yet an interview request. Record a **substantive inbound conversation** only after the sender requests or begins a technically specific discussion, collaboration, review, research exchange, or project inquiry. The project, interest, entry-surface, and self-reported discovery fields can then be copied from the submitted message into a private log alongside the later outcome.

## Review cadence and limitations

Review messages monthly or after a meaningful number of inquiries. Tally submitted inquiries, interview requests, and substantive conversations separately, then compare the contextual fields for the latter two. Read the message itself before assigning a category; the fields are self-reported and may be blank or wrong.

No baseline has been established for the current site. Do not infer a conversion rate, an increase in interviews, or a winning role category from clicks or a small number of messages. Direct email, forwarded links, recruiter systems, and links without the query contract will remain unattributed. The method supports qualitative decisions about what surfaces interest; it does not measure every path into an opportunity.
