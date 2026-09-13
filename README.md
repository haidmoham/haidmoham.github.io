# mhaider.dev

Personal portfolio for Mohammad Haider, a software engineer working across production systems, simulation, robotics, and scientific computing.

🌐 **live at:** [mhaider.dev](https://mhaider.dev)

## a few places to start

| Project | Open the source |
| --- | --- |
| Indigo Circuit | [indigo-circuit](https://github.com/haidmoham/indigo-circuit) |
| C-1N | [spider](https://github.com/haidmoham/spider) · [robotics-test-bench](https://github.com/haidmoham/robotics-test-bench) |
| Tiramisu | [tiramisu](https://github.com/haidmoham/tiramisu) |
| Fourier Drawing | [fourier-drawing](https://github.com/haidmoham/fourier-drawing) |
| Receipts | [political-receipts](https://github.com/haidmoham/political-receipts) |
| LM Lab | [lmlab](https://github.com/haidmoham/lmlab) |

The [project archive](https://mhaider.dev/projects.html) includes the older experiments and other work. The [résumé downloads](https://mhaider.dev/resume.html) are the public reference copies.

## delivery

- Static HTML, CSS, and JavaScript; no runtime framework or build requirement.
- The homepage is exported from the companion portfolio source with [`scripts/export-homepage.mjs`](scripts/export-homepage.mjs); supporting pages are maintained as static documents here.
- Railway hosts `mhaider.dev`; Vercel hosts `c1n.mhaider.dev`; GitHub Pages mirrors `main`.
- DNS is managed through Cloudflare.

## structure

```
.
├── index.html       # exported homepage
├── about.html       # background and experience
├── projects.html    # project archive
├── work/            # production, simulation, and creative entrypoints
├── robotics/        # robotics test bench records
├── resume.html      # resume chooser
├── resumes/         # role-specific resume downloads
├── available.html   # current role search
├── notes.html       # working notes index
├── contact.html     # contact form
├── scripts/         # export and validation utilities
├── CNAME            # custom domain configuration
└── portfolio-*.css  # shared stylesheets
```

## contact

- email: hi@mhaider.dev
- LinkedIn: [/in/haidmoham](https://linkedin.com/in/haidmoham)
- GitHub: [/haidmoham](https://github.com/haidmoham)
