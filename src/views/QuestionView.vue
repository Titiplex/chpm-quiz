<template>
  <div class="container mt-5">
    <h3>Question {{ questionNumber }}:</h3>
    <p class="question">{{ currentQuestion.question }}</p>
    <div v-for="(choice, index) in currentQuestion.choices" :key="index" class="mt-3">
      <button
        :class="{
          'btn btn-outline-primary btn-choice': !isAnswered,
          'btn btn-success btn-choice': isAnswered && index === currentQuestion.correctIndex,
          'btn btn-danger btn-choice': isAnswered && index !== currentQuestion.correctIndex,
        }"
        :disabled="isAnswered"
        @click="handleChoice(index)"
      >
        {{ choice }}
      </button>
    </div>
    <div class="d-flex justify-content-end mt-3">
      <button
        v-if="isAnswered && questionNumber < totalQuestions"
        class="btn btn-primary"
        @click="nextQuestion"
      >
        Next
      </button>
      <button
        v-if="isAnswered && questionNumber === totalQuestions"
        class="btn btn-primary"
        @click="showSummary"
      >
        Finish Quiz
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import quizQuestions from '@/assets/questions.json'
import { useQuizStore } from '@/stores/counter.js'

export default {
  data() {
    return {
      quizStore: useQuizStore(),
      questionNumber: 1,
      totalQuestions: quizQuestions.length,
      currentQuestionIndex: 0,
      userChoiceIndex: null,
      isAnswered: false,
    }
  },
  computed: {
    currentQuestion() {
      return quizQuestions[this.currentQuestionIndex]
    },
  },
  methods: {
    handleChoice(index) {
      if (index === this.currentQuestion.correctIndex) {
        this.quizStore.incrementCorrect()
      } else {
        this.quizStore.incrementIncorrect()
      }
      this.isAnswered = true
    },
    nextQuestion() {
      if (this.questionNumber < this.totalQuestions) {
        this.questionNumber++
        this.currentQuestionIndex++
        this.userChoiceIndex = null
        this.isAnswered = false
      }
    },
    showSummary() {
      // Navigate to the summary component with the correct and incorrect answers count
      this.$router.push({ name: 'summary' })
    },
  },
}
</script>

<style scoped>
.btn-choice {
  width: 100%;
  white-space: normal;
}
</style>
