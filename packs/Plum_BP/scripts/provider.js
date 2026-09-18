import { offlineAnswer } from './knowledge.js';
export function chatLabelFor(friend) {
  return friend === 'apple' ? 'Applezon order desk • offline help'
    : friend === 'blueberry' ? 'Collector cargo desk • offline help'
    : friend === 'lemon' ? 'Warm orchard light • offline help'
    : friend === 'banana' ? 'Certified peel patrol • offline help'
    : 'Offline Minecraft guide';
}
export async function answerQuestion(question, context) {
  return offlineAnswer(question, context.friend);
}