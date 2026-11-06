"""Pytest configuration and environment sanitization for OFCL test suite."""
import os

# httpx bug workaround: httpx parses NO_PROXY with URLPattern which fails on bracketed IPv6 '[::1]'
for key in ("NO_PROXY", "no_proxy"):
    val = os.environ.get(key)
    if val and "[::1]" in val:
        os.environ[key] = val.replace(",[::1]", "").replace("[::1]", "")
