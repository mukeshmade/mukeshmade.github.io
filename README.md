# Mukesh Sai Madepalli — Portfolio

A job-focused portfolio with a graphite and mint AI aesthetic, an interactive abstract neural structure, and directly sourced professional content. Built with HTML, CSS, vanilla JavaScript, and Three.js.

## Features

- Original 3D sculpture of interwoven neural ribbons, metallic surfaces, nodes, and luminous filaments
- Structure and signal modes, pointer parallax, and restrained animation
- Optional click-to-play synthesized introduction with stop/Escape controls and a transcript
- Animation pause and reduced-motion support
- Rendering suspended when hidden or offscreen
- Responsive navigation, keyboard-accessible case studies, and copy-email contact
- Static neural-structure poster when JavaScript or WebGL is unavailable
- Local rendering library; no build step, model downloads, analytics, or backend

## Run locally

Run `python -m http.server 4173` in this directory, then open `http://localhost:4173`.

## Edit

- `index.html`: projects, experience, biography, technical skills, and links
- `styles.css`: typography, layout, color, and responsive behavior
- `script.js`: navigation, motion preferences, scroll reveals, and clipboard
- `neural.js`: procedural neural sculpture and rendering lifecycle
- `speech.js`: browser speech synthesis and playback lifecycle
- `assets/neural-poster.png`: static sculpture fallback

## Sources and accuracy

Career, education, and achievement facts come from the provided resume. Project descriptions and dataset counts were cross-checked against the public [Ola notebook](https://github.com/mukeshmade/Business-Cases/blob/4f700077cf08b8d6bb42a8d927f0807cb90cb995/Ola.ipynb) and [Delhivery notebook](https://github.com/mukeshmade/Business-Cases/blob/4f700077cf08b8d6bb42a8d927f0807cb90cb995/delhivery.ipynb).

Case-study diagrams illustrate workflows. Model performance and business impact are not claimed. The Delhivery project is exploratory analysis and feature engineering. Contest ratings are historical peak ratings.

The original resume PDF and phone number are excluded from the public repository. No graduate-study plans are included.

## Scene and narration

The abstract 3D structure is a procedural illustration, not a trained AI model or a scientific diagram of a particular network. It has no human avatar or likeness.

Narration uses browser speech synthesis after a visitor clicks Listen. Voice availability and quality depend on the visitor's device. It is not a recording or clone of Mukesh's voice.

Three.js 0.180.0 is bundled under the included MIT license. Google Fonts supplies Manrope and IBM Plex Mono, with local system fallbacks.

## GitHub Pages

Publishes from `main:/` at [mukeshmade.github.io](https://mukeshmade.github.io/). The `.nojekyll` file serves static assets directly.
