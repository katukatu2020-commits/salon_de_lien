(() => {
  const media = window.matchMedia("(max-width: 639px)");

  const setImportant = (element, properties) => {
    if (!(element instanceof HTMLElement)) return;
    for (const [name, value] of Object.entries(properties)) {
      element.style.setProperty(name, value, "important");
    }
  };

  const contentHeight = {
    height: "auto",
    "min-height": "0",
    "max-height": "none",
    "align-self": "auto",
    "flex-grow": "0",
    "flex-shrink": "0"
  };

  const normalizeCommunityDetail = () => {
    if (!media.matches) return;

    document.querySelectorAll(".community-detail-page").forEach((root) => {
      setImportant(root, {
        ...contentHeight,
        display: "block",
        width: "100%",
        "align-content": "start"
      });
      root.dataset.communityMobileLayout = "v376";

      const feed = Array.from(root.children).find((child) => child.matches("div.grid"));
      setImportant(feed, {
        ...contentHeight,
        display: "block",
        width: "100%",
        "grid-auto-rows": "max-content",
        "align-content": "start"
      });

      root.querySelectorAll("article").forEach((article) => {
        setImportant(article, {
          ...contentHeight,
          display: "block",
          width: "100%",
          "align-content": "start"
        });

        article.querySelectorAll("div").forEach((block) => setImportant(block, contentHeight));

        const articleBlocks = Array.from(article.children).filter((child) => child instanceof HTMLElement);
        const mediaBlock = articleBlocks.find((child) => child.querySelector(":scope > a"));
        const contentBlock = articleBlocks.find((child) => child !== mediaBlock);

        setImportant(mediaBlock, {
          ...contentHeight,
          display: "grid",
          width: "100%",
          "grid-auto-rows": "max-content",
          "align-content": "start"
        });

        if (mediaBlock) {
          Array.from(mediaBlock.children).forEach((photo) => {
            if (!(photo instanceof HTMLAnchorElement)) return;
            setImportant(photo, {
              ...contentHeight,
              display: "block",
              width: "100%",
              "aspect-ratio": "4 / 3"
            });
          });
        }

        setImportant(contentBlock, {
          ...contentHeight,
          display: "block",
          width: "100%",
          padding: "14px"
        });

        if (contentBlock) {
          const meta = contentBlock.firstElementChild;
          setImportant(meta, {
            ...contentHeight,
            display: "flex",
            width: "100%",
            "flex-wrap": "wrap",
            "align-items": "center",
            "justify-content": "flex-start",
            gap: "6px 16px",
            padding: "10px 12px"
          });

          const comments = contentBlock.querySelector(".mt-4.grid");
          setImportant(comments, {
            ...contentHeight,
            display: "grid",
            width: "100%",
            "grid-auto-rows": "max-content",
            "align-content": "start"
          });
        }
      });
    });
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduled = false;
        normalizeCommunityDetail();
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener("pageshow", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  [50, 150, 400, 900, 1800].forEach((delay) => window.setTimeout(schedule, delay));
})();
