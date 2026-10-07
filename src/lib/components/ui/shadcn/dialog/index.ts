import Root from "./root.svelte";
import Title from "./title.svelte";
import Close from "./close.svelte";
import Portal from "./portal.svelte";
import Content from "./content.svelte";
import Overlay from "./overlay.svelte";
import Trigger from "./trigger.svelte";
import Description from "./description.svelte";

export { Root, Title, Close, Portal, Content, Overlay, Trigger, Description };
export type {
	DialogRootProps,
	DialogTriggerProps,
	DialogTriggerChildProps,
	DialogCloseProps,
	DialogCloseChildProps,
	DialogContentProps,
	DialogOverlayProps,
	DialogTitleProps,
	DialogDescriptionProps,
	DialogPortalProps
} from './types.js';
