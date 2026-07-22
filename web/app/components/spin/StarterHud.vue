<script setup lang="ts">
import { useSpinStore } from '~/stores/spin'

// Bandeau du starter : montre la croissance (sprite courant, niveau, barre d'XP,
// stade d'évolution, objet tenu) pendant tout le run.
const spin = useSpinStore()
</script>

<template>
  <div
    v-if="spin.starter"
    class="shud"
  >
    <span class="shud__pic">
      <img
        :src="spin.starter.imageUrl"
        :alt="spin.starter.name"
      >
    </span>
    <div class="shud__mid">
      <div class="shud__row">
        <b class="shud__name font-display">{{ spin.starter.name }}</b>
        <span class="shud__lvl">Nv {{ spin.level }}</span>
        <span class="shud__stats">
          <span
            class="shud__chip shud__chip--badge"
            :title="`Badges d'arène : ${spin.badges}/${spin.badgeGoal}`"
          >
            <UIcon
              name="i-lucide-medal"
              class="size-3"
            /> {{ spin.badges }}/{{ spin.badgeGoal }}
          </span>
          <span
            class="shud__chip shud__chip--coins"
            title="Pièces du run"
          >
            <UIcon
              name="i-lucide-coins"
              class="size-3"
            /> {{ spin.runCoins }}
          </span>
          <span
            v-if="spin.lives"
            class="shud__chip shud__chip--life"
            title="Rappels (survivre à une défaite)"
          >
            <UIcon
              name="i-lucide-heart"
              class="size-3"
            /> {{ spin.lives }}
          </span>
          <span
            v-if="spin.heldItem"
            class="shud__chip shud__chip--item"
            :title="spin.heldItem.name"
          >
            <UIcon
              name="i-lucide-shield-plus"
              class="size-3"
            /> +{{ spin.heldItem.bonus }} %
          </span>
        </span>
      </div>
      <div class="shud__xp">
        <span
          class="shud__xp-fill"
          :style="{ width: `${spin.xpPct}%` }"
        />
      </div>
    </div>
    <span class="shud__stages">
      <span
        v-for="s in spin.evoChain.length"
        :key="s"
        class="shud__stage"
        :class="{ 'is-on': s - 1 <= spin.stage }"
      />
    </span>
  </div>
</template>

<style scoped>
.shud {
  /* Taille adaptative : un plancher, puis on grandit avec les éléments. */
  width: fit-content;
  min-width: min(300px, 90vw);
  max-width: min(94vw, 560px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 8px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .14);
  backdrop-filter: blur(4px);
}
.shud__pic {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, .22), rgba(255, 255, 255, .06));
}
.shud__pic img { width: 44px; height: 44px; object-fit: contain; image-rendering: pixelated; }
.shud__mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.shud__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; row-gap: 5px; }
.shud__name { font-weight: 700; font-size: .95rem; color: #fff; white-space: nowrap; }
.shud__lvl { flex: none; font-weight: 800; font-size: .74rem; color: #fff; background: rgba(255, 255, 255, .2); padding: 1px 8px; border-radius: 999px; white-space: nowrap; }
.shud__stats { margin-left: auto; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; row-gap: 4px; justify-content: flex-end; }
.shud__chip { flex: none; display: inline-flex; align-items: center; gap: 3px; font-weight: 800; font-size: .72rem; padding: 2px 7px; border-radius: 999px; background: rgba(255, 255, 255, .14); white-space: nowrap; }
.shud__chip--badge { color: #ffd76b; }
.shud__chip--coins { color: #ffe08a; }
.shud__chip--life { color: #ff9db0; }
.shud__chip--item { color: #e8d7ff; }
.shud__xp { height: 7px; border-radius: 999px; background: rgba(0, 0, 0, .28); overflow: hidden; }
.shud__xp-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #8fd6a8, #5bbf82); transition: width .5s var(--ease-glide); }
.shud__stages { flex: none; display: flex; gap: 4px; }
.shud__stage { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, .22); transition: background .4s ease; }
.shud__stage.is-on { background: linear-gradient(150deg, #ffd76b, #f0a52e); }
</style>
