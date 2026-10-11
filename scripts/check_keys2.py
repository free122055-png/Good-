import subprocess, base64

# Extract cert from Admin.tsx
content = open('src/pages/Admin.tsx').read()
# Find start and end of CERT_TEXT
idx1 = content.find('MIIDrDCCApS')
idx2 = content.find('=', idx1) + 1
cert_b64 = content[idx1:idx2]
print('cert_b64 length:', len(cert_b64))

pem = '-----BEGIN CERTIFICATE-----\n' + cert_b64 + '\n-----END CERTIFICATE-----\n'
open('/tmp/cert.pem', 'w').write(pem)

p1 = subprocess.run(['openssl', 'x509', '-in', '/tmp/cert.pem', '-modulus', '-noout'], capture_output=True, text=True)
p2 = subprocess.run(['openssl', 'rsa', '-in', 'upload_key.key', '-modulus', '-noout'], capture_output=True, text=True)

print('Cert modulus: ', p1.stdout.strip())
print('Key modulus:  ', p2.stdout.strip())
print('MATCH:', p1.stdout.strip() == p2.stdout.strip())

# Also verify fingerprint
p3 = subprocess.run(['openssl', 'x509', '-in', '/tmp/cert.pem', '-fingerprint', '-sha1', '-noout'], capture_output=True, text=True)
print('Cert SHA1:', p3.stdout.strip())
