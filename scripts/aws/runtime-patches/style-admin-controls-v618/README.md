# Style admin controls v618

Store-side style management now uses current staff records as the canonical stylist source.

- Replaces the legacy admin list filters with sort, stylist, course, and gender.
- Removes the age filter.
- Filters both visit posts and store/imported posts by stable staff key, with a normalized-name fallback for existing unlinked posts.
- Provides the fixed gender choices: 女性, 男性, その他.
- Aligns the customer-side style filter with the same choices while reading legacy unisex values as その他.
- Replaces the legacy style editor with a current-staff dropdown.
- Removes imported stylist name, kana, and role metadata when a style is saved.
- Preserves style title, comment, menu links, and per-style stylist photo editing.
