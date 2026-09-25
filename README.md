# mrm.photography

Portfolio site for Marshall Mumford, built with Jekyll for GitHub Pages.

## Adding photos

Every gallery pulls its images automatically from a folder under `photos/`.
Drop exported JPEGs into the matching folder and push. That's it.

| Page | Folder |
| --- | --- |
| Homepage hero | `photos/home/hero.jpg` |
| Homepage row of three | `photos/home/featured-1.jpg`, `-2`, `-3` |
| Alaska | `photos/trips/alaska/` |
| Shoals Marine Lab | `photos/experiences/shoals-marine-lab/` |
| Shoals, Teaching Assistant | `photos/experiences/shoals-teaching-assistant/` |
| ...and so on | see the `folder:` line in each file in `_galleries/` |

Tips:
- Photos appear in filename order, so name them `01.jpg`, `02.jpg`, ...
- Export at about 2000 px on the long edge, JPEG quality ~80. Keep each file well under 1 MB.
- A gallery's cover tile uses its first photo. To pick a different one, add
  `cover: /photos/trips/alaska/07.jpg` to that gallery's file.

## Editing a gallery

Each gallery is a file in `_galleries/`, for example `_galleries/trips/alaska.md`:

```yaml
---
title: Alaska
folder: trips/alaska
section: trips
order: 1                 # position on the Trips page
location: Katmai, Alaska # optional, shown under the title
year: 2024               # optional
recent: true             # show on the homepage under "Recent adventures"
recent_order: 6          # position in that homepage list
captions:                # optional, shown in the full-screen viewer
  01.jpg: Brown bear fishing at Brooks Falls
---

Anything written here, below the front matter, appears as a short
paragraph under the title. Plain text or Markdown.
```

To add a new trip, copy one of these files, change the title and folder,
and create the matching folder in `photos/`.

## Where things live

- `index.html` – homepage (bio text is here)
- `_layouts/` – page templates (`default`, `gallery`, `section`)
- `_includes/` – header, footer, gallery tile, photo grid
- `assets/css/style.css` – all styling; colors and fonts are at the top
- `assets/js/lightbox.js` – full-screen photo viewer
- `_config.yml` – site name, tagline, Instagram/eBird links

URLs match the old Google Site (`/home/trips/alaska/` etc.), so existing links keep working.

## Previewing locally (optional)

```
gem install bundler jekyll
jekyll serve
```
Then open http://localhost:4000.

## Custom domain

Don't add a `CNAME` file until the site looks right at `yourusername.github.io`.
When ready: Settings → Pages → Custom domain → `www.mrm.photography`, then update DNS.
