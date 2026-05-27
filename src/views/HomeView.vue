<template>
  <div class="d-flex flex-column align-items-center justify-content-center container text-center">
    <h2>Welcome to the Vigil Quiz</h2>
    <p class="lead">
      Get ready to learn more about this amazing company through our interactive quiz!
    </p>
    <router-link to="/question" class="btn btn-primary mt-3">Start</router-link>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HomeView'
}
</script>
