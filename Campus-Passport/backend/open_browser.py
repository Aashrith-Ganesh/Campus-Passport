"""
Background helper for Campus Passport launcher.
Polls http://127.0.0.1:8000/health until the server is ready,
then automatically opens http://localhost:8000/ in the user's default browser.
"""

import sys
import time
import urllib.request
import webbrowser

HEALTH_URL = "http://127.0.0.1:8000/health"
APP_URL = "http://localhost:8000/"
MAX_ATTEMPTS = 60
POLL_INTERVAL = 0.5


def wait_and_open():
    for _ in range(MAX_ATTEMPTS):
        time.sleep(POLL_INTERVAL)
        try:
            req = urllib.request.Request(HEALTH_URL)
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    webbrowser.open(APP_URL)
                    return True
        except Exception:
            pass
    return False


if __name__ == "__main__":
    wait_and_open()
    sys.exit(0)
