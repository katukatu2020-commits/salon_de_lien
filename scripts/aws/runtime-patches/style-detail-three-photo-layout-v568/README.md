# Style detail three-photo layout v568

Removes the empty fourth cell from store style posts containing the required
FRONT, SIDE, and BACK photos.

- Uses a FRONT hero with SIDE and BACK stacked at the right when the rendered
  photo region is at least 600px.
- Uses a single-column stack when the photo region is narrower.
- Leaves existing one-, two-, and four-photo posts unchanged.
- Observes route and viewport changes so the layout remains correct after SPA navigation.
