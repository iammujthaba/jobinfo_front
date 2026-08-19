"""JobInfo Local Development Server with custom 404 handling.

Usage:
    python serve.py 5500
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class CustomHandler(SimpleHTTPRequestHandler):

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            # Check for 404.html in the current directory
            not_found_path = os.path.join(self.directory, "404.html")
            if os.path.exists(not_found_path):
                try:
                    with open(not_found_path, "rb") as f:
                        content = f.read()
                    self.send_response(404)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
                except Exception:
                    pass
        # Fallback to standard error message if 404.html is missing
        super().send_error(code, message, explain)


def run(port=5500):
    server_address = ("", port)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"🚀 JobInfo Dev Server running at http://localhost:{port}/")
    print(f"   - Serving directory: {os.getcwd()}")
    print("   - Custom 404 handling: Active (serving 404.html)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    run(port)
