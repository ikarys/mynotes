<script lang="ts">
  import { onMount } from 'svelte'
  import { invoke } from '@tauri-apps/api/core'

  // The window starts hidden to avoid a white flash; show it after first paint.
  onMount(() => {
    requestAnimationFrame(() => invoke('app_ready'))
  })
</script>

<main>mynotes</main>
