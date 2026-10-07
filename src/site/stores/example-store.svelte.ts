export const example = $state({
	lastClickedCta: null as string | null,
	ctaClickCount: 0
});

export function setLastClickedCta(cta: string) {
	example.lastClickedCta = cta;
	example.ctaClickCount++;
}
