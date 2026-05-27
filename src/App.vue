<script lang="ts">
import { RouterView } from 'vue-router'

export default {
  name: 'App',
  components: {
    RouterView,
  },
}
</script>

<template>
  <RouterView id="app" />
</template>

<style scoped>
#app {
  width: 100vw;
  height: 100vh;
}
</style>
