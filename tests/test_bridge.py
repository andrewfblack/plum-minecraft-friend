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
        def reply(*args, **kwargs):
            self.calls.append((args, kwargs))
            return 'Hello adventurer!'
        self.state = bridge.State('test-token-' * 4, 'fake-key', 'test-model', reply)

    def body(self, player='one', question='How do I build a bed?', friend=None):
        body = {'playerId': player, 'question': question, 'dimension': 'minecraft:overworld'}
        if friend: body['friend'] = friend
        return body

    def test_histories_are_separate_and_bounded(self):
        for n in range(7):
            key = hashlib.sha256(b'one').hexdigest()
            if key in self.state.sessions: self.state.sessions[key]['last'] -= 6
            self.assertEqual(self.state.answer(self.body())[0], 200)
        self.assertEqual(len(self.state.sessions[key]['history']), 8)
        self.state.answer(self.body('two'))
        self.assertEqual(self.calls[-1][0][1], [])
        self.assertNotIn('one', json.dumps(self.calls))

    def test_rejects_invalid_inputs_without_calling_ai(self):
        for body in [[], {}, self.body(question=''), self.body(question='x' * 401), {'playerId': 9, 'question': 'hey'}, dict(self.body(), dimension='invented'), dict(self.body(), friend='kiwi')]:
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
            self.assertIn('Plum', sent['instructions'])
            self.assertIn('Plum is an adult', sent['input'][-1]['content'])

    def test_apple_friend_selects_applezon_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'Shop hard!'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('deliver?', [], 'minecraft:overworld', True, 'fake-key', 'test-model', friend='apple'), 'Shop hard!')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Applezon', sent['instructions'])
            self.assertIn('Apple is a baby', sent['input'][-1]['content'])

    def test_blueberry_friend_selects_collector_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'Item stored!'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('store it?', [], 'minecraft:overworld', False, 'fake-key', 'test-model', friend='blueberry'), 'Item stored!')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Collector', sent['instructions'])
            self.assertIn('Blueberry is an adult', sent['input'][-1]['content'])
        self.assertEqual(self.state.answer(self.body(friend='blueberry'))[0], 200)

    def test_lemon_friend_selects_light_friend_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'Stay out of the dark, friend.'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('why do you glow?', [], 'minecraft:overworld', False, 'fake-key', 'test-model', friend='lemon'), 'Stay out of the dark, friend.')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Light Friend', sent['instructions'])
            self.assertIn('Lemon is an adult', sent['input'][-1]['content'])
        self.assertEqual(self.state.answer(self.body(friend='lemon'))[0], 200)

    def test_banana_friend_selects_prankster_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'That is a-peel-ing advice, friend.'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('how do I make a torch?', [], 'minecraft:overworld', False, 'fake-key', 'test-model', friend='banana'), 'That is a-peel-ing advice, friend.')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Prankster', sent['instructions'])
            self.assertIn('every 30 seconds', sent['instructions'])
            self.assertIn('Banana is an adult', sent['input'][-1]['content'])
        self.assertEqual(self.state.answer(self.body(friend='banana'))[0], 200)

    def test_grapes_friend_selects_sharpshooter_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'Seeds away! Sharpshooting is go!'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('a creeper is coming!', [], 'minecraft:overworld', False, 'fake-key', 'test-model', friend='grapes'), 'Seeds away! Sharpshooting is go!')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Sharpshooter', sent['instructions'])
            self.assertIn('12 blocks', sent['instructions'])
            self.assertIn('Grapes is an adult', sent['input'][-1]['content'])
        self.assertEqual(self.state.answer(self.body(friend='grapes'))[0], 200)

    def test_strawberry_friend_selects_farmer_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'The harvest is safe in my farm chest!'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('where does my harvest go?', [], 'minecraft:overworld', False, 'fake-key', 'test-model', friend='strawberry'), 'The harvest is safe in my farm chest!')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Farmer', sent['instructions'])
            self.assertIn('plains', sent['instructions'])
            self.assertIn('3-wide, 2-high', sent['instructions'])
            self.assertIn('Strawberry is an adult', sent['input'][-1]['content'])
        self.assertEqual(self.state.answer(self.body(friend='strawberry'))[0], 200)

    def test_coconut_friend_selects_bodyguard_instructions(self):
        payload = {'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': 'Round, hairy, and ready to rumble!'}]}]}
        with patch('urllib.request.urlopen', return_value=io.BytesIO(json.dumps(payload).encode())) as mocked:
            self.assertEqual(bridge.ask_openai('a zombie is chasing us!', [], 'minecraft:overworld', False, 'fake-key', 'test-model', friend='coconut'), 'Round, hairy, and ready to rumble!')
            sent = json.loads(mocked.call_args.args[0].data)
            self.assertIn('Bodyguard', sent['instructions'])
            self.assertIn('8 blocks', sent['instructions'])
            self.assertIn('beaches', sent['instructions'])
            self.assertIn('Coconut is an adult', sent['input'][-1]['content'])
        self.assertEqual(self.state.answer(self.body(friend='coconut'))[0], 200)

if __name__ == '__main__': unittest.main()
