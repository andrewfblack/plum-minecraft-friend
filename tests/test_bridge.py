import hashlib
import importlib.util
import json
from pathlib import Path
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch
import io

spec = importlib.util.spec_from_file_location('bridge', Path(__file__).parents[1] / 'server/bridge.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def reply(*args):
            self.calls.append(args)
            return 'Hello adventurer!'
        self.state = bridge.State('test-token-' * 4, 'fake-key', 'test-model', reply)

    def body(self, player='one', question='How do I build a bed?'):
        return {'playerId': player, 'question': question, 'dimension': 'minecraft:overworld'}

    def test_histories_are_separate_and_bounded(self):
        for n in range(7):
            key = hashlib.sha256(b'one').hexdigest()
            if key in self.state.sessions: self.state.sessions[key]['last'] -= 6
            self.assertEqual(self.state.answer(self.body())[0], 200)
        self.assertEqual(len(self.state.sessions[key]['history']), 8)
        self.state.answer(self.body('two'))
        self.assertEqual(self.calls[-1][1], [])
        self.assertNotIn('one', json.dumps(self.calls))

    def test_rejects_invalid_inputs_without_calling_ai(self):
        for body in [[], {}, self.body(question=''), self.body(question='x' * 401), {'playerId': 9, 'question': 'hey'}, dict(self.body(), dimension='invented')]:
            self.assertEqual(self.state.answer(body)[0], 400)
        self.assertEqual(self.calls, [])

    def test_rate_limit_and_failure_release(self):
        self.assertEqual(self.state.answer(self.body())[0], 200)
        self.assertEqual(self.state.answer(self.body())[0], 429)
        def fail(*args): raise RuntimeError('secret must not leak')
        self.state.responder = fail
        status, body = self.state.answer(self.body('other'))
        self.assertEqual(status, 503)
        self.assertNotIn('secret', json.dumps(body))
        self.assertEqual(self.state.active, set())

    def test_http_authentication_and_json(self):
        server = bridge.make_server(self.state, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f'http://127.0.0.1:{server.server_port}/ask'
            def request(token, body):
                req = urllib.request.Request(url, data=body, headers={'X-Plum-Token': token}, method='POST')
                try:
                    with urllib.request.urlopen(req) as response: return response.status, json.load(response)
                except urllib.error.HTTPError as e: return e.code, json.load(e)
            self.assertEqual(request('wrong', b'{}')[0], 401)
            self.assertEqual(self.calls, [])
            self.assertEqual(request(self.state.token, b'not-json')[0], 400)
            self.assertEqual(request(self.state.token, b'x' * 9000)[0], 413)
            self.assertEqual(request(self.state.token, json.dumps(self.body()).encode()), (200, {'answer': 'Hello adventurer!'}))
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_responses_api_parses_text_after_non_message_output(self):
        payload = {'output': [{'type': 'reasoning'}, {'type': 'message', 'content': [{'type': 'output_text', 'text': 'Make a crafting table.'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('help', [], 'minecraft:overworld', False, 'fake-key', 'test-model'), 'Make a crafting table.')
            request = mocked.call_args.args[0]
            sent = json.loads(request.data)
            self.assertFalse(sent['store'])
            self.assertNotIn('tools', sent)
            self.assertEqual(request.full_url, 'https://api.openai.com/v1/responses')

if __name__ == '__main__': unittest.main()
