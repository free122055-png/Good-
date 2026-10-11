import base64, hashlib, hmac

raw = base64.b64decode(open('public/keystore_b64.txt').read().strip())

# Find tag A0 inside ContentInfo
# ContentInfo is sequence at index 7 to 2686
# Inside is 06 09 2A 86 48 86 F7 0D 01 07 01 (id-data)
# then A0 82 0A 69 04 82 0A 65 ...
# The data that gets MACed is the OCTET STRING content of the authSafe!
# Let's find tag 04 after A0:
a0_pos = raw.find(b'\xa0\x82')
len_a0 = int.from_bytes(raw[a0_pos+2:a0_pos+4], 'big')
tag_04 = a0_pos + 4
len_04 = int.from_bytes(raw[tag_04+2:tag_04+4], 'big')
authSafe_data = raw[tag_04+4 : tag_04+4+len_04]
print('authSafe_data length:', len(authSafe_data))

# MacData at the end:
salt = bytes.fromhex('d0cae4b6ea399ca8')
iterations = 2048
target_mac = bytes.fromhex('050628f8a4295ae4761a19d1b5c5b460319b227b19a19f111deb80d8cdf0722c')

# In PKCS#12, there are TWO ways to encode password for KDF:
# Method 1: BMPString (UTF-16BE + 0x00 0x00)
# Method 2: UTF-8 / ASCII + 0x00
# Method 3: UTF-16BE without trailing null
# Method 4: standard PBKDF2 (if pkcs12 was created by OpenSSL 3 with -nomacver or standard pbkdf2)

def pkcs12_kdf(P_bytes, salt, iterations, u=32, v=64):
    D = bytes([3] * v)
    S = (salt * ((v + len(salt) - 1) // len(salt)))[:v * ((len(salt) + v - 1) // v)]
    p_len = len(P_bytes)
    P_ext = (P_bytes * ((v + p_len - 1) // p_len))[:v * ((p_len + v - 1) // v)]
    I = S + P_ext
    A = hashlib.sha256(D + I).digest()
    for _ in range(1, iterations):
        A = hashlib.sha256(A).digest()
    return A[:u]

for pw in ['almayadin123', 'almayadin', '123456', '']:
    # Try BMPString
    p1 = pw.encode('utf-16-be') + b'\x00\x00'
    k1 = pkcs12_kdf(p1, salt, iterations)
    m1 = hmac.new(k1, authSafe_data, hashlib.sha256).digest()
    if m1 == target_mac:
        print('MATCH with BMPString:', pw)

    # Try BMPString without null
    p2 = pw.encode('utf-16-be')
    k2 = pkcs12_kdf(p2, salt, iterations)
    m2 = hmac.new(k2, authSafe_data, hashlib.sha256).digest()
    if m2 == target_mac:
        print('MATCH with BMPString no-null:', pw)

    # Try UTF-8
    p3 = pw.encode('utf-8') + b'\x00'
    k3 = pkcs12_kdf(p3, salt, iterations)
    m3 = hmac.new(k3, authSafe_data, hashlib.sha256).digest()
    if m3 == target_mac:
        print('MATCH with UTF8:', pw)

    # Try PBKDF2-HMAC-SHA256
    k4 = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt, iterations, 32)
    m4 = hmac.new(k4, authSafe_data, hashlib.sha256).digest()
    if m4 == target_mac:
        print('MATCH with PBKDF2-HMAC-SHA256:', pw)

print('Done test.')
