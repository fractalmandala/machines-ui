// The headings of the docs page on screen. The docs layout fills it; the right sidebar and the
// "On this page" menu (shown where that sidebar is hidden) both read it.
export const toc = $state<{ items: { id: string; text: string }[] }>({ items: [] });
