# Install Ego Striker components

1. Copy the assets/ego-striker folder into the root of your GitHub profile repository.
2. Commit the SVGs on the same branch as your existing README.md.
3. Copy the snippets you want from embed-snippets.md, variant-snippets.md or carousel-snippets.md into your README.
4. Keep project and contact links outside the SVG image so visitors can click them.
5. To update, import profile.config.json in the Studio, edit the profile, and export again.

Additional character selections retain the active profile assets and per-card overrides. Every generated README reference is checked against the export manifest.

Each card has four responsive variants: dark/light × wide/compact. Items per page follow the selected design: Project Squad shows three projects, Compact Project List shows four, and language/player designs show up to six. Page one keeps the default filename; non-default designs add their design ID, and later pages add .p02, .p03, etc. The snippets include the corresponding fallback images. Carousel snippets are optional and use one animated SVG for all pages. FONT-LICENSES.txt accompanies the self-contained vector typography.
The snippets use relative paths from a README at the repository root. Adjust paths if it is elsewhere.
Animation preferences are included inside each SVG. GitHub rendering and caching can differ from the local preview; check your committed README. See the Studio compatibility notes before relying on animation in an external host. Reduced-motion styles keep carousel page one visible when the host honors the preference.

The profile kit contains generated assets and embed instructions. Poster exports retain hero-anime.*.svg aliases temporarily; new snippets use hero.poster.*.svg. For automatic contribution sync, install the workflow from the Studio repository in a profile repository that also contains the Ego Striker source and package scripts, then grant the workflow Contents write permission. The workflow needs GITHUB_TOKEN; the profile kit alone does not include the generator source. Without a token, local generation uses the configured season data. Demo labels describe sample data. Change them to your own information before publishing. Skill ratings are self-assessments, not verified qualifications.
