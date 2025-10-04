<script lang="ts">
  // Client redirect handled in +page.ts; keep UI minimal to avoid flash.
  let { children } = $props();
  // Children should be empty here, but keep compatibility with Svelte 5 API.
  void children;
  
</script>

<div class="min-h-screen flex items-center justify-center text-gray-500">
  Redirecting...
  {@render children?.()}
  
</div>
