<script lang="ts">
  import { onMount } from 'svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'

  // The window starts hidden to avoid a white flash; show it after first paint.
  onMount(() => {
    requestAnimationFrame(() => getCurrentWindow().show())
  })
</script>

<main>mynotes</main>
