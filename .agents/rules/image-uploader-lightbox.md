# Image Uploader & Lightbox Design Standard

## 1. Dual-Action on Form Thumbnails
- Every uploaded image or avatar thumbnail inside form modals MUST include:
  - 👁️ **Preview Button** (<kbd>Eye</kbd> icon): Immediately launches the full-screen Lightbox modal to inspect the image in high resolution.
  - 🗑️ **Remove Button** (<kbd>Trash</kbd> icon): Clears the current image/avatar.
- Clicking the thumbnail directly MUST also trigger the Lightbox viewer.

## 2. Full-Screen Interactive Lightbox Viewer
All image inspection lightboxes must feature:
- Dark glassmorphic backdrop (`backdrop-blur-xl bg-slate-950/90`).
- Zoom level controls (`50%` to `300%` with zoom in, zoom out, reset, and scale indicator).
- Open original image in new browser tab shortcut button.
- Dismissal via clicking outside or pressing <kbd>Esc</kbd>.

## 3. Server-Side Asset Lifecycle & Cleanup
- Deleting or replacing images in CRUD controllers MUST automatically unlink old image files on disk (`fs.unlinkSync`) to prevent dead file accumulation.
- Vite dev server proxy MUST proxy `/uploads` to the Express backend port so uploaded media loads immediately without broken image links.
