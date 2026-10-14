# RyanParsleyDotCom

There are many blogs but this one is special because it is mine. I've migrated
it from more platforms than it has posts. Today, It is built with Astro.

## 🚀 Project Structure

It started out looking something like this:

```bash
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page
is exposed as a route based on its filename.

There's nothing special about `src/components/`, but that's where components like to live
any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX
documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and
type-check your frontmatter using an optional schema. See [Astro's Content
Collections docs](https://docs.astro.build/en/guides/content-collections/) to
learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                                 |
| :--------------------- | :----------------------------------------------------- |
| `npm install`          | Installs dependencies                                  |
| `npm run dev`          | Starts local dev server at `localhost:3000`            |
| `npm run build`        | Build your production site to `./dist/`                |
| `npm run preview`      | Preview your build locally, before deploying           |
| `npm run astro ...`    | Run command-line tools like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro command-line tools            |
