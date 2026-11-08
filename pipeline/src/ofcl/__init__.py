"""
OFCL - Osservatorio Finanze Comunali del Locarnese
Pipeline Dati MCA2, Connettori Albi e Validazione Contabile
"""

import os

# Sanitizza NO_PROXY/no_proxy per prevenire il bug di httpcore su voci IPv6 (es. ::1 o [::1])
for _k in ("NO_PROXY", "no_proxy"):
    _val = os.environ.get(_k)
    if _val and ("::" in _val or "[" in _val):
        _cleaned = [e.strip() for e in _val.split(",") if "::" not in e and "[" not in e and e.strip()]
        os.environ[_k] = ",".join(_cleaned)

__version__ = "0.1.0"

