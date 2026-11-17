# Optimus Codeworks

The source code for **[optimuscodeworks.com](https://optimuscodeworks.com)**, the portfolio and business site of Optimus Codeworks, founded by Kevin Wilkes.

The site showcases software, data science, and AI projects, each with a write-up of how it was built and, where possible, a live demo or video.

## Featured projects

- **[Census Dashboard](https://github.com/Kevin-Wilkes/Census_Dashboard)**: maps neighborhood-level Census data for any U.S. city through switchable lenses like rent burden, poverty, and internet access.
- **[GenChatBot](https://github.com/Kevin-Wilkes/GenChatBot)**: a self-replicating chatbot world where AI characters create new characters through conversation, with a live relationship graph.
- **[YouTube Video Streaming](https://github.com/Kevin-Wilkes/Youtube-Video-Streaming)**: a containerized service that streams YouTube video frames into Kafka as the input stage of a Kubernetes image-recognition pipeline.

## Built with

- [Astro](https://astro.build): static site framework
- [Tailwind CSS](https://tailwindcss.com): styling
- [Mermaid](https://mermaid.js.org): diagrams in project write-ups
- [Cloudflare Workers](https://workers.cloudflare.com): hosting, with automatic deploys from this repository

The design is based on **The Navigator**, a free Astro theme by Ed Stuurman.

## Project structure

```
├── public/                  # Static files served as-is (favicon, etc.)
├── scripts/                 # Build helper scripts from the theme
├── src/
│   ├── content/
│   │   ├── blog/            # Project write-ups and articles (Markdown)
│   │   └── log/             # Short status updates
│   ├── data/                # Experience timeline and other site data
│   ├── images/              # Profile photo and post images
│   ├── pages/               # Site pages
│   ├── site.config.ts       # Site identity: name, domain, bio, social links
│   └── theme.config.ts      # Navigation, features, contact form, footer
├── astro.config.mjs         # Astro and Markdown plugin settings
└── package.json             # Dependencies and npm scripts
```

## Running locally

Requires [Node.js](https://nodejs.org) (LTS version).

```bash
# Install dependencies
npm install

# Install the browser used to render Mermaid diagrams at build time
npx playwright install chromium

# Start the local development server
npm run dev
```

Then open the `localhost` link shown in the terminal. Pages update automatically as you edit and save files.

To check that the site builds the same way it will in production:

```bash
npm run build
```

## Adding a project

1. Create a new Markdown file in `src/content/blog/`, named with the date and a short title, for example `2026-11-17-my-project.md`.
2. Start it with the post details:

   ```markdown
   ---
   title: "Project name"
   description: "One or two sentences about the project."
   pubDate: 2026-11-17
   sectionNav: true
   tags: ["project", "Python"]
   ---
   ```

3. Include the `project` tag so the post appears on the [projects page](https://optimuscodeworks.com/tags/project/).
4. Preview it with `npm run dev`, then commit and push.

## Deployment

Every push to the `main` branch is built and deployed automatically by Cloudflare. If a build fails, the previous version of the site stays live until the problem is fixed.

## Contact

Interested in working together? Reach out through the [contact page](https://optimuscodeworks.com/contact/) or connect on [LinkedIn](https://www.linkedin.com/in/kevin-wilkes-1560a22a7/).
