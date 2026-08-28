import subprocess
from pathlib import Path

vcvars = r"C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cpp_dir = r"c:\Users\vkmuk\OneDrive\Documents\Project\SIH 2026\cpp_core"

cmd = f'call "{vcvars}" && cd /d "{cpp_dir}" && cl.exe /O2 /openmp /EHsc /LD solver_2d.cpp optical_flow.cpp routing.cpp physics_engine.cpp /Fe:libufns_physics.dll'

res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Returncode:", res.returncode)
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
