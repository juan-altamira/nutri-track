<script lang="ts">
  import '../app.css'; // Tailwind global styles
  import theme from '$lib/stores/theme';
  import ToastHost from '$lib/components/ui/ToastHost.svelte';
  import PWAInstallPrompt from '$lib/components/PWAInstallPrompt.svelte';

  let { children } = $props();

  const toggleTheme = () => {
    console.log('toggleTheme clicked');
    theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  };
</script>

<svelte:head>
  <meta name="google" content="notranslate" />
</svelte:head>

<div class="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors" translate="no">
  <!-- Theme toggle button -->
  <button
    onclick={toggleTheme}
    aria-label="Toggle dark mode"
    class="fixed bottom-4 right-4 z-50 rounded-full p-3 bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 shadow-lg transition-transform active:scale-95"
  >
    {#if $theme === 'dark'}
      🌙
    {:else}
      ☀️
    {/if}
  </button>

  <ToastHost />
  <PWAInstallPrompt />
  {@render children?.()}
</div>
