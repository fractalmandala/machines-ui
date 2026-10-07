export const SITE_NAME = 'machines-ui';
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://example.com';
export const SITE_DESCRIPTION =
	'Build email automations on a visual canvas: drag in actions, branch on true/false conditions and connect flows.';
export const DEFAULT_OG_IMAGE = '/opengraph-image.jpg';

export function absoluteUrl(path: string) {
	return new URL(path, SITE_URL).toString();
}

export type SiteRoute = {
	path: string;
	title: string;
	description: string;
	changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority?: number;
};

export const SITE_ROUTES: SiteRoute[] = [
	{
		path: '/',
		title: 'Flow',
		description: SITE_DESCRIPTION,
		changeFrequency: 'weekly',
		priority: 1
	}
];

type PageMetadataOptions = {
	title: string;
	description: string;
	path: string;
	image?: string;
};

export type PageMetadata = {
	title: string;
	description: string;
	alternates: { canonical: string };
	openGraph: {
		locale: string;
		type: string;
		url: string;
		siteName: string;
		title: string;
		description: string;
		images: { url: string }[];
	};
	twitter: {
		card: string;
		title: string;
		description: string;
		images: string[];
	};
};

export function pageMetadata({
	title,
	description,
	path,
	image = DEFAULT_OG_IMAGE
}: PageMetadataOptions): PageMetadata {
	const url = absoluteUrl(path);

	return {
		title,
		description,
		alternates: { canonical: url },
		openGraph: {
			locale: 'en',
			type: 'website',
			url,
			siteName: SITE_NAME,
			title,
			description,
			images: [{ url: absoluteUrl(image) }]
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [absoluteUrl(image)]
		}
	};
}
