# Mukesh Sai Madepalli — Machine Learning & Data Science

A portfolio focused on AI, machine learning, and data science opportunities. Python case studies sit alongside an animated 3D neural shell and core, interactive explanations, and source links. Built with HTML, CSS, vanilla JavaScript, and Three.js.

## Features

- Procedural neural shell and core with connected nodes, light trails, and pointer interaction
- Three scene modes: Structure, Signal, and Field
- Interactive notebook method panels for data preparation, features, models, and evaluation
- Classifier explanations and logistics aggregation diagrams linked to the original notebooks
- Animated typography, scroll reveals, and responsive project cards
- Optional click-to-play synthesized introduction with stop/Escape controls and a transcript
- Animation pause and reduced-motion support
- Rendering suspended when hidden or offscreen
- Responsive navigation, keyboard-accessible case studies, and copy-email contact
- Static neural-structure poster when JavaScript or WebGL is unavailable
- Local rendering library; no build step, trained-model downloads, analytics, or backend

## Run locally

Run `python -m http.server 4173` in this directory, then open `http://localhost:4173`.

## Edit

- `index.html`: AI focus, notebook case studies, methods, background, and contact links
- `styles.css`: typography, layout, color, and responsive behavior
- `script.js`: navigation, method panels, classifier explanations, motion preferences, and clipboard
- `neural.js`: procedural shell/core scene, three appearance modes, and rendering lifecycle
- `speech.js`: browser speech synthesis and playback lifecycle
- `assets/neural-poster.png`: static scene fallback
- `assets/social-card.svg`: editable sharing graphic; `social-card.png` is the generated preview

## Sources and accuracy

Background, education, and achievement facts come from the provided resume. Project descriptions and dataset counts were cross-checked against the public [Ola notebook](https://github.com/mukeshmade/Business-Cases/blob/4f700077cf08b8d6bb42a8d927f0807cb90cb995/Ola.ipynb) and [Delhivery notebook](https://github.com/mukeshmade/Business-Cases/blob/4f700077cf08b8d6bb42a8d927f0807cb90cb995/delhivery.ipynb).

The Ola case study compares tree-based classifiers and engineers driver-level features. Delhivery covers data preparation, feature engineering, and exploratory analysis. The interactive diagrams explain these methods; they do not run models or make predictions. No LLM project, production deployment, model-performance improvement, or business outcome is claimed. Contest ratings are historical peak ratings.

The original resume PDF is excluded from the public repository.

## Scene and narration

The 3D scene is a procedural illustration of connections and signals. Its animation is not a trained AI model, live inference, or a scientific diagram of a particular neural network. It has no human avatar or likeness.

Narration uses browser speech synthesis after a visitor clicks Listen. Voice availability and quality depend on the visitor's device. It is not a recording or clone of Mukesh's voice.

The theme uses a dark `#07090e` background, cyan `#70efdd`, mint `#a7ffc8`, and violet `#b197ff`. Google Fonts supplies Space Grotesk for headings, Manrope for body text, and IBM Plex Mono for small labels, with system fallbacks. Three.js 0.180.0 is bundled under the included MIT license.

## GitHub Pages

Publishes from `main:/` at [mukeshmade.github.io](https://mukeshmade.github.io/). The `.nojekyll` file serves static assets directly.
