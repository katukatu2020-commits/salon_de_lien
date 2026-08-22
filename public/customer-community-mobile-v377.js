(() => {
  const mobile = window.matchMedia("(max-width: 639px)");
  const fit = {
    height: "auto",
    "min-height": "0",
    "max-height": "none",
    "align-self": "auto",
    "flex-grow": "0",
    "flex-shrink": "0"
  };

  const set = (element, properties) => {
    if (!(element instanceof HTMLElement)) return;
    Object.entries(properties).forEach(([name, value]) => element.style.setProperty(name, value, "important"));
  };

  const apply = () => {
    if (!mobile.matches) return;
    document.querySelectorAll(".community-detail-page").forEach((root) => {
      set(root, { ...fit, display: "block", width: "100%", "align-content": "start" });
      root.dataset.communityMobileLayout = "v377";

      const feed = Array.from(root.children).find((child) => child.matches("div.grid"));
      set(feed, {
        ...fit,
        display: "block",
        width: "100%",
        "grid-auto-rows": "max-content",
        "align-content": "start"
      });

      root.querySelectorAll("article").forEach((article) => {
        set(article, { ...fit, display: "block", width: "100%", "align-content": "start" });
        article.querySelectorAll("div").forEach((block) => set(block, fit));

        const directBlocks = Array.from(article.children).filter((child) => child instanceof HTMLDivElement);
        const mediaBlock = directBlocks.find((child) => child.querySelector(":scope > a"));
        const contentBlock = [...directBlocks].reverse().find((child) => child !== mediaBlock);

        set(mediaBlock, {
          ...fit,
          display: "grid",
          width: "100%",
          "grid-auto-rows": "max-content",
          "align-content": "start"
        });
        if (mediaBlock) {
          Array.from(mediaBlock.children).forEach((photo) => {
            if (photo instanceof HTMLAnchorElement) {
              set(photo, { ...fit, display: "block", width: "100%", "aspect-ratio": "4 / 3" });
            }
          });
        }

        set(contentBlock, { ...fit, display: "block", width: "100%", padding: "14px" });
        if (contentBlock) {
          const meta = contentBlock.firstElementChild;
          set(meta, {
            ...fit,
            display: "flex",
            width: "100%",
            "flex-wrap": "wrap",
            "align-items": "center",
            "justify-content": "flex-start",
            gap: "6px 16px",
            padding: "10px 12px"
          });
          const comments = contentBlock.querySelector(".mt-4.grid");
          set(comments, {
            ...fit,
            display: "grid",
            width: "100%",
            "grid-auto-rows": "max-content",
            "align-content": "start"
          });
        }
      });
    });
  };

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pending = false;
      apply();
    }));
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
  window.addEventListener("pageshow", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  [50, 150, 400, 900, 1800].forEach((delay) => setTimeout(schedule, delay));
})();
