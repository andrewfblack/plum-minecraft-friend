import { offlineAnswer } from './knowledge.js';
export function chatLabelFor(friend) {
  return friend === 'apple' ? 'Applezon order desk • offline help' : 'Offline Minecraft guide';
}
export async function answerQuestion(question, context) {
  return offlineAnswer(question, context.friend);
}