# Mukesh Sai Madepalli — Portfolio

A responsive personal portfolio built with semantic HTML, CSS, and vanilla JavaScript. Designed for job applications, highlighting software engineering and applied machine learning projects.

## Features

- Interactive stylized 3D human character rendered with a locally hosted Three.js library
- Click-to-play synthesized spoken introduction with stop controls and a visible transcript
- Scroll reveals and a scroll progress indicator
- Reduced-motion support and a persistent animation pause control
- Responsive mobile navigation and keyboard-accessible project details
- Real GitHub notebook links and professional email contact
- No build step, package installation, analytics, or server-side services

## Run locally

From this directory run `python -m http.server 4173`, then open `http://localhost:4173`.

## Publish with GitHub Pages

Push these files to the repository's `main` branch. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save. The `.nojekyll` file serves the static files directly.

## Edit

- `index.html`: biography, projects, experience, links, and milestones
- `styles.css`: colors, typography, layout, and responsive styles
- `script.js`: navigation, motion preferences, and clipboard
- `avatar.js`: procedural 3D character, animation, and synthesized introduction

The source resume is excluded from this public repository. The portfolio summarizes its professional facts without publishing the original PDF or phone number.

All career and project claims are based on the provided resume. Project visuals are illustrations, not measured model results. Contest ratings are historical peak ratings.

Google Fonts supplies DM Sans and Instrument Serif; local system fonts are used if unavailable.

The spoken introduction uses the visitor's browser speech synthesis. Voice availability and quality depend on their browser and device. Audio plays only after a click. The character is a stylized illustration, and the voice is synthesized, not a recording or clone of Mukesh. A static SVG character and text transcript are available as fallbacks.

Three.js 0.180.0 is bundled in `assets/vendor/` under its included MIT license.
