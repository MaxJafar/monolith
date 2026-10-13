"""Add stdin JSON serving to the pinned llama.cpp multilingual Laya CLI.

Run on the Mac with: python3.12 prepare-multilingual.py /path/to/pinned/source
The model and tokenizer stay loaded; the upstream inference graph is unchanged.
"""
import pathlib
import subprocess
import sys

source = pathlib.Path(sys.argv[1]).resolve(strict=True)
file = source / "tools/laya/laya-cli.cpp"
code = file.read_text()
if "LIFEFORGE_JSON_DAEMON" not in code:
    edits = [
        ('#include "laya.h"', '#include "laya.h"\n#include <iostream> // LIFEFORGE_JSON_DAEMON'),
        ('int n_threads = 1;', 'bool daemon = false;\n    int n_threads = 1;'),
        ('if (arg == "-m" || arg == "--model") {',
         'if (arg == "--daemon") {\n            daemon = true;\n        } else if (arg == "-m" || arg == "--model") {'),
        ('if (model_path.empty() || input_path.empty()) {',
         'if (model_path.empty() || (!daemon && input_path.empty())) {'),
        ('    // read input JSON\n',
         '    while (true) {\n    std::string text;\n    if (daemon) {\n        if (!std::getline(std::cin, text)) break;\n    } else {\n    // read input JSON\n'),
        ("    std::string text((size_t) fsize, '\\0');", "    text.assign((size_t) fsize, '\\0');"),
        ('    text.resize(nread);', '    text.resize(nread);\n    }'),
        ('    printf("%s\\n", out.dump(2).c_str());',
         '    printf("%s\\n", out.dump(daemon ? -1 : 2).c_str());\n    fflush(stdout);'),
        ('    laya_free(ctx);\n    laya_model_free(model);\n    return 0;',
         '    laya_free(ctx);\n    if (!daemon) break;\n    }\n    laya_model_free(model);\n    return 0;')
    ]
    for before, after in edits:
        if code.count(before) != 1:
            raise ValueError("Pinned CLI source no longer matches: " + before[:50])
        code = code.replace(before, after)
    file.write_text(code)
subprocess.run(["/opt/homebrew/bin/cmake", "--build", str(source / "build"),
                "--target", "llama-laya-cli", "-j", "4"], check=True)
