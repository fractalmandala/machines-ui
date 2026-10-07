import type { Component } from 'svelte';

export type AssetSvgComponent = Component<{
	class?: string;
	className?: string;
	role?: string;
	'aria-hidden'?: boolean | 'true' | 'false';
	'aria-label'?: string;
}>;

// An imported image asset (plain object with a resolved URL) as opposed to a raw path.
export type StaticImage = {
	src: string;
	width?: number;
	height?: number;
	blurDataURL?: string | null;
};

export type AssetImageSource = string | StaticImage | AssetSvgComponent;

export type AssetFit = 'cover' | 'contain' | 'fill' | 'none';

type AssetBaseProps = {
	width: number;
	height: number;
	fit?: AssetFit;
	className?: string;
	mediaClassName?: string;
};

export type AssetImageProps = AssetBaseProps & {
	type: 'image';
	src: AssetImageSource;
	alt: string;
	sizes?: string;
	quality?: number;
	blurDataURL?: string | null;
	priority?: boolean;
	loading?: 'eager' | 'lazy';
};

export type AssetVideoProps = AssetBaseProps & {
	type: 'video';
	src: string;
	poster: string;
	stillPoster?: string;
	alt?: string;
	mobileSrc?: string;
};

export type AssetProps = AssetImageProps | AssetVideoProps;
