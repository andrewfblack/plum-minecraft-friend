import { http, HttpRequest, HttpHeader, HttpRequestMethod } from '@minecraft/server-net';
import { secrets, variables } from '@minecraft/server-admin';
import { offlineAnswer, cleanText } from './knowledge.js';

export function chatLabelFor(friend) {
  return 'AI chat • Questions go to the server’s AI service';
}

export async function answerQuestion(question, context) {
  try {
    const token = secrets.get('plum_bridge_token');
    if (!token) throw new Error('Missing bridge token');
    const url = String(variables.get('plum_bridge_url') ?? 'http://127.0.0.1:8787/ask');
    const request = new HttpRequest(url);
    request.method = HttpRequestMethod.Post;
    request.timeout = 25;
    request.headers = [new HttpHeader('Content-Type', 'application/json'), new HttpHeader('X-Plum-Token', token)];
    request.body = JSON.stringify({ question: cleanText(question), playerId: context.playerId, dimension: context.dimension, baby: context.baby, friend: context.friend ?? 'plum' });
    const response = await http.request(request);
    if (response.status !== 200) throw new Error('Bridge unavailable');
    const body = JSON.parse(response.body);
    if (typeof body.answer !== 'string' || !body.answer.trim()) throw new Error('Empty answer');
    return cleanText(body.answer, 1400);
  } catch {
    return `My AI connection is resting. Here is my offline help: ${offlineAnswer(question, context.friend)}`;
  }
}