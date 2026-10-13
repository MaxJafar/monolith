"""Supervise native llama.cpp engines and the private shared gateway."""
import json
import pathlib
import signal
import subprocess
import sys
import time
import urllib.request

root = pathlib.Path(__file__).resolve().parent
config = json.loads((root / "config.json").read_text())
children = []
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def stop(*_):
    for process in reversed(children):
        if process.poll() is None:
            process.terminate()
    for process in reversed(children):
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
    raise SystemExit(0)


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)

try:
    for role, engine in config["engines"].items():
        args = [config["llama_binary"], "--model", engine["model"], "--alias", engine["alias"],
            "--host", "127.0.0.1", "--port", str(engine["port"]),
            "--ctx-size", str(engine["context"]), "--batch-size", str(engine["batch"]),
            "--ubatch-size", str(engine["batch"]), "--parallel", "1",
            "--n-gpu-layers", str(engine["gpu_layers"]), "--threads", str(engine["threads"]),
            "--no-webui", "--log-disable", *engine["extra_args"]]
        process = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        children.append(process)
        for attempt in range(120):
            if process.poll() is not None:
                raise RuntimeError(role + " engine exited during startup")
            try:
                with opener.open(f'http://127.0.0.1:{engine["port"]}/health', timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError(role + " engine startup timeout")
        print(role + " native engine ready", flush=True)
    children.append(subprocess.Popen([sys.executable, str(root / "server.py")]))
    while all(child.poll() is None for child in children):
        time.sleep(1)
    raise RuntimeError("Inference process exited; restarting service")
finally:
    for child in reversed(children):
        if child.poll() is None:
            child.terminate()
    for child in reversed(children):
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
