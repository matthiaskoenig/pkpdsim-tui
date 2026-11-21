"""Compile an SBML model to the WebAssembly a table application runs.

The models of a table application come from their own repositories as SBML. This script is the
one step between them and the browser: it compiles the SBML with the installed release of
sbmlsim-core and writes the compiled model, its description and the browser runtime next to it,
exactly as `scripts/cardiovascular_examples.py` of pkpdsim does for its own examples.

Nothing here knows anything about a model. It compiles what it is given.

Usage:
    uv run python scripts/export_model.py --sbml <model.xml> --output apps/<app>/public/assets/solver
    uv run python scripts/export_model.py --sbml <model.xml> --output <dir> --no-runtime
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from importlib.metadata import distribution, version
from pathlib import Path

import sbmlsim_core
from sbmlsim_core import web as core_web


def export_model(sbml_path: Path, output: Path, *, runtime: bool = True) -> dict[str, object]:
    """Compile `sbml_path` into `output` and return the configuration that was written."""
    output.mkdir(parents=True, exist_ok=True)
    # Canonical LF text keeps the export and its fingerprint independent of the host operating
    # system, so the same model gives the same hash everywhere.
    sbml = sbml_path.read_text(encoding="utf-8")
    compiled = sbmlsim_core.compile_sbml(sbml)
    (output / "model.wasm").write_bytes(compiled.wasm)
    (output / "model.json").write_text(
        json.dumps(compiled.description, separators=(",", ":"), allow_nan=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    (output / "model.xml").write_text(sbml, encoding="utf-8", newline="\n")

    if runtime:
        for name, wasm in sbmlsim_core.runtime_wasm().items():
            (output / f"{name}.wasm").write_bytes(wasm)
        (output / "sbmlsim-core.js").write_text(
            core_web.script().replace("\r\n", "\n"), encoding="utf-8", newline="\n"
        )
        (output / "THIRD_PARTY.md").write_text(
            sbmlsim_core.THIRD_PARTY.replace("\r\n", "\n"), encoding="utf-8", newline="\n"
        )
        package = distribution("sbmlsim-core")
        license_file = next(
            file for file in package.files or () if str(file).endswith("licenses/LICENSE")
        )
        shutil.copyfile(str(package.locate_file(license_file)), output / "LICENSE")

    config: dict[str, object] = {
        "generated_by": "scripts/export_model.py",
        "engine": "SUNDIALS IDA",
        "sbmlsim_core_version": version("sbmlsim-core"),
        "sbml": sbml_path.name,
        "sbml_sha256": hashlib.sha256(sbml.encode("utf-8")).hexdigest(),
        "runtime": runtime,
    }
    (output / "config.json").write_text(
        json.dumps(config, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    return config


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sbml", type=Path, required=True, help="the SBML model to compile")
    parser.add_argument("--output", type=Path, required=True, help="the directory to write into")
    parser.add_argument(
        "--no-runtime",
        action="store_true",
        help="write only the compiled model, for an application that shares a runtime",
    )
    arguments = parser.parse_args()
    if not arguments.sbml.is_file():
        raise SystemExit(f"export_model: no SBML at {arguments.sbml}")
    config = export_model(arguments.sbml, arguments.output, runtime=not arguments.no_runtime)
    written = sorted(path.name for path in arguments.output.iterdir())
    size = sum(path.stat().st_size for path in arguments.output.iterdir()) / 1e6
    print(f"{arguments.sbml} -> {arguments.output} ({size:.1f} MB)")
    print(f"  sbmlsim-core {config['sbmlsim_core_version']}, sha256 {str(config['sbml_sha256'])[:12]}")
    print(f"  {', '.join(written)}")


if __name__ == "__main__":
    main()
