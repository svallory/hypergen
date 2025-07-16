import { vi } from 'bun:test'

class MockEnquirer {
  async prompt(questions) {
    if (Array.isArray(questions)) {
      const answers = {}
      for (const question of questions) {
        answers[question.name] = this._getDefaultAnswer(question)
      }
      return answers
    } else {
      return {
        [questions.name]: this._getDefaultAnswer(questions),
      }
    }
  }

  _getDefaultAnswer(question) {
    switch (question.type) {
      case 'confirm':
        return true // Always answer "yes" to confirm prompts
      case 'input':
        return 'mock input'
      default:
        return ''
    }
  }
}

export default MockEnquirer