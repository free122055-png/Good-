import subprocess, re, base64

p = subprocess.run(['openssl', 'rsa', '-in', 'upload_key.key', '-modulus', '-noout'], capture_output=True, text=True)
print('upload_key modulus:', p.stdout[:60])

b = open('src/pages/Admin.tsx').read()
m = re.search(r'const CERT_TEXT = `([^`]+)`', b)
cert_b64 = ''.join(m.group(1).split())
open('/tmp/cert.der', 'wb').write(base64.b64decode(cert_b64))

# Convert der to pem
subprocess.run(['openssl', 'x509', '-inform', 'DER', '-in', '/tmp/cert.der', '-out', '/tmp/cert.pem'])

p2 = subprocess.run(['openssl', 'x509', '-in', '/tmp/cert.pem', '-modulus', '-noout'], capture_output=True, text=True)
print('cert modulus:      ', p2.stdout[:60])

p_fp = subprocess.run(['openssl', 'x509', '-in', '/tmp/cert.pem', '-fingerprint', '-sha1', '-noout'], capture_output=True, text=True)
print('cert SHA1:', p_fp.stdout)
