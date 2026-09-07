# Receipt physical roll v579

This protected runtime release fixes excessive blank feed on 80 mm receipt printers.

- Prepares the dynamic `@page` size before the native print dialog opens.
- Recalculates the paper length when receipt content or fonts change.
- Anchors the receipt at the physical page origin instead of centering it.
- Removes browser page-margin boxes and limits intentional vertical padding to 2 mm.
- Keeps the receipt route isolated from application navigation and other screen UI.

The browser regression verifies an 80 mm single-page PDF, a top offset below 0.5 px,
a trailing gap below 1.5 mm, and automatic growth for longer receipts.
