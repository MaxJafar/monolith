"""Protocol boundary tests; no model downloads or inference required."""
import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import Mock

from server import Gateway, handler


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.gateway = Gateway({"tokens": {"monolith": "a" * 43, "golden_retriever": "b" * 43},
            "embedding_model": "embedding", "generation_model": "gemma", "engines": {"laya": {"port": 1236}}})
        self.gateway.ready = True
        self.gateway.upstream = Mock(return_value={"answers": {"relevance": {"probabilities": {"A": .9},
            "confidence": .8}}, "usage": {"input_tokens": 50}})
        self.gateway.multilingual = Mock(return_value={"answers": {"relevance": {"probabilities": {"A": .9},
            "confidence": .8}}, "per_question": {"relevance": {"input_ids": [1] * 50}}})
        self.http = ThreadingHTTPServer(("127.0.0.1", 0), handler(self.gateway))
        self.http.daemon_threads = True
        threading.Thread(target=self.http.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.http.server_port}"
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()

    def request(self, path, value=None, token="a" * 43, **headers):
        request = urllib.request.Request(self.url + path,
            data=json.dumps(value).encode() if value is not None else None,
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", **headers})
        try:
            with self.opener.open(request) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def test_authentication_and_browser_origin(self):
        self.assertEqual(self.request("/v1/models", token="wrong")[0], 401)
        self.assertEqual(self.request("/v1/models", Origin="https://example.com")[0], 401)
        self.assertEqual(self.request("/v1/models", token="b" * 43)[0], 200)

    def test_duplicate_ids_and_unknown_models_never_reach_engine(self):
        self.assertEqual(self.request("/v1/rerank", {"query": "invoice", "items": [
            {"id": 1, "passage": "one"}, {"id": 1, "passage": "two"}]})[0], 400)
        self.assertEqual(self.request("/v1/embeddings", {"model": "other", "input": "data"})[0], 400)
        self.gateway.upstream.assert_not_called()

    def test_remote_images_and_unbounded_outputs_are_rejected(self):
        body = {"model": "gemma", "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": "https://example.com/image.png"}}]}]}
        self.assertEqual(self.request("/v1/chat/completions", body)[0], 400)
        body.update(messages=[{"role": "user", "content": "hello"}], max_tokens=9999)
        self.assertEqual(self.request("/v1/chat/completions", body)[0], 400)
        self.gateway.upstream.assert_not_called()

    def test_multilingual_routing_including_ascii_spanish(self):
        for query, passage in [("蓝色发票", "这是一张蓝色发票。"), ("factura azul", "Factura azul de octubre.")]:
            status, body = self.request("/v1/rerank", {"query": query, "items": [{"id": 1, "passage": passage}]})
            self.assertEqual(status, 200)
            self.assertEqual(body["scores"][0]["model"], "multilingual")
        self.assertEqual(self.gateway.multilingual.call_count, 2)
        self.gateway.upstream.assert_not_called()

    def test_truncated_decision_abstains_for_golden_retriever(self):
        self.gateway.upstream.return_value["usage"]["input_tokens"] = 600
        status, body = self.request("/v1/chat/completions", {"model": "laya", "messages": [{"role": "user",
            "content": json.dumps({"query": "blue invoice", "items": [{"id": 1, "passage": "This is the blue invoice."}]})}]})
        self.assertEqual(status, 200)
        scores = json.loads(body["choices"][0]["message"]["content"])["scores"]
        self.assertEqual(scores[0]["confidence"], 0)

    def test_bad_model_probability_fails_closed(self):
        self.gateway.upstream.return_value["answers"]["relevance"]["probabilities"]["A"] = float("nan")
        self.assertEqual(self.request("/v1/rerank", {"query": "blue invoice", "items": [
            {"id": 1, "passage": "This is the blue invoice."}]})[0], 503)


if __name__ == "__main__":
    unittest.main()
