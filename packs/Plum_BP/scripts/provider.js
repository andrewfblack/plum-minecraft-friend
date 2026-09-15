import { offlineAnswer } from './knowledge.js';
export const chatLabel = 'Offline Minecraft guide';
export async function answerQuestion(question, context) {
  return offlineAnswer(question);
}
