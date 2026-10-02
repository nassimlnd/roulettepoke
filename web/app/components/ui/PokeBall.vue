<script setup lang="ts">
// Emblème Poké Ball décoratif (CSS pur). Réutilisable (auth, menu, nav…).
withDefaults(defineProps<{ size?: number, float?: boolean }>(), {
  size: 56,
  float: false
})
</script>

<template>
  <span
    class="pokeball"
    :class="{ 'pokeball--float': float }"
    :style="{ '--s': size + 'px' }"
    aria-hidden="true"
  >
    <span class="pokeball__btn" />
  </span>
</template>

<style scoped>
.pokeball {
  display: inline-block;
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  position: relative;
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, .55), transparent 34%),
    linear-gradient(#ef5a48 0 47%, #17171c 47% 53%, #fdfdfd 53% 100%);
  box-shadow:
    0 calc(var(--s) * 0.12) calc(var(--s) * 0.28) rgba(221, 51, 34, .28),
    inset 0 0 0 max(2px, calc(var(--s) * 0.03)) rgba(0, 0, 0, .12);
}
.pokeball__btn {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30%;
  height: 30%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #fff;
  border: max(2px, calc(var(--s) * 0.045)) solid #17171c;
  box-shadow: 0 0 0 calc(var(--s) * 0.03) #fff, 0 0 0 calc(var(--s) * 0.06) rgba(0, 0, 0, .14);
}
.pokeball--float { animation: pbfloat 4s ease-in-out infinite; }
@keyframes pbfloat {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-9%) rotate(5deg); }
}
@media (prefers-reduced-motion: reduce) {
  .pokeball--float { animation: none; }
}
</style>
