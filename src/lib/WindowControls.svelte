<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import Minus from '@lucide/svelte/icons/minus';
	import Square from '@lucide/svelte/icons/square';
	import X from '@lucide/svelte/icons/x';

	const win = getCurrentWindow();
	const fail = (err: unknown) => console.error(err);
</script>

<div class="winctl">
	<button aria-label="Minimize" title="Minimize" onclick={() => win.minimize().catch(fail)}>
		<Minus size={16} strokeWidth={1.25} />
	</button>
	<button aria-label="Maximize" title="Maximize" onclick={() => win.toggleMaximize().catch(fail)}>
		<Square size={12} strokeWidth={1.25} />
	</button>
	<!-- Close keeps the app in the tray, like the native close button does. -->
	<button class="close" aria-label="Close" title="Close" onclick={() => win.hide().catch(fail)}>
		<X size={16} strokeWidth={1.25} />
	</button>
</div>
