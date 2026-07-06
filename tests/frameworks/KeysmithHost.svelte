<script>
  import { onDestroy, onMount } from "svelte";
  import { createKeysmith } from "../../src";

  let { onFire } = $props();
  let keys;

  onMount(() => {
    keys = createKeysmith({ platform: "other" });
    keys.add({ id: "save", keys: "mod+s", onTrigger: onFire });
  });

  onDestroy(() => keys?.destroy());
</script>

<div></div>
