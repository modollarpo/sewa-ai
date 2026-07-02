import subprocess
import json
import base64

# Base64 encoded live Stripe key
live_key_b64 = "c2tfbGl2ZV81MVBhZjdsRTZRMmVlQ0c4aXZWeldseGU1WHhTd3RWazQwVDQxMG5WdHZOcWtaeG1XZVpuSnhuUGtEZmszVzR6eEhueUZ3NHJ0Y3FOa1dESnRyV29EN25iNjAwR1ZDaGEwdXk="

patch_data = {
    "data": {
        "STRIPE_SECRET_KEY": live_key_b64
    }
}

# Run patch command safely using subprocess list mapping
proc = subprocess.run(
    ["kubectl", "patch", "secret", "sewa-secrets", "-n", "sewa-ai", "-p", json.dumps(patch_data)],
    capture_output=True,
    text=True
)

print("STDOUT:", proc.stdout)
print("STDERR:", proc.stderr)
print("EXIT CODE:", proc.returncode)
