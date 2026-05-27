<template>
  <div class="container mt-5">
    <h2>Quiz Summary</h2>
    <p>Total Questions: {{ totalQuestions }}</p>
    <p>Correct Answers: {{ quizStore.correctAnswers }}</p>
    <p>Incorrect Answers: {{ quizStore.incorrectAnswers }}</p>
    <p>Score: {{ ((quizStore.correctAnswers / totalQuestions) * 100).toFixed(2) }}%</p>
    <router-link class="btn btn-primary mt-3" to="/">Start Over</router-link>
  </div>
</template>

<script lang="ts">
import { useQuizStore } from '@/stores/counter.js'
import quizQuestions from '@/assets/questions.json'

export default {
  name: 'SummaryView',
  data() {
    return {
      quizStore: useQuizStore(),
      totalQuestions: quizQuestions.length,
    }
  },
}
</script>

<style scoped>
.container {
  text-align: center;
}
</style>
