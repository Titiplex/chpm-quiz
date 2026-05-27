import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useQuizStore = defineStore('quiz', () => {
  const correctAnswers = ref(0)
  const incorrectAnswers = ref(0)

  function incrementCorrect() {
    correctAnswers.value++
  }

  function incrementIncorrect() {
    incorrectAnswers.value++
  }

  return {
    correctAnswers,
    incorrectAnswers,
    incrementCorrect,
    incrementIncorrect,
  }
})
