<script setup lang="ts">
// Layout public : décor de « connexion de jeu » — fond clair + halos pastel
// qui dérivent doucement, panneau centré. Aucune navbar ni store de jeu.
</script>

<template>
  <div class="auth-bg">
    <span
      class="blob blob--red"
      aria-hidden="true"
    />
    <span
      class="blob blob--amber"
      aria-hidden="true"
    />
    <span
      class="blob blob--blue"
      aria-hidden="true"
    />
    <div class="auth-wrap">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-bg {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
  background: radial-gradient(120% 90% at 50% -10%, #ffffff 0%, #f6f7f9 45%, #eceef2 100%);
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  opacity: .55;
  pointer-events: none;
}
.blob--red {
  width: 360px;
  height: 360px;
  background: #ffb2a6;
  top: -90px;
  left: -70px;
  animation: drift 15s ease-in-out infinite;
}
.blob--amber {
  width: 300px;
  height: 300px;
  background: #ffe1a2;
  bottom: -80px;
  right: -50px;
  animation: drift 19s ease-in-out infinite reverse;
}
.blob--blue {
  width: 260px;
  height: 260px;
  background: #aad4f5;
  bottom: 18%;
  left: -90px;
  animation: drift 22s ease-in-out infinite;
}
.auth-wrap {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(34px, -22px) scale(1.06); }
}
@media (prefers-reduced-motion: reduce) {
  .blob { animation: none; }
}
</style>
