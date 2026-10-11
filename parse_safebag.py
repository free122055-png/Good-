import base64

raw = base64.b64decode(open('public/keystore_b64.txt').read().strip())

# Let's search for PBES2 OID: 1.2.840.113549.1.5.13 -> 2A 86 48 86 F7 0D 01 05 0D
# or pbeWithSHAAnd3-KeyTripleDES-CBC: 1.2.840.113549.1.12.1.3 -> 2A 86 48 86 F7 0D 01 0C 01 03
pbes2 = bytes.fromhex('2a864886f70d01050d')
pbe_3des = bytes.fromhex('2a864886f70d010c0103')
pbe_rc2 = bytes.fromhex('2a864886f70d010c0106')

print('pbes2 found:', raw.find(pbes2))
print('pbe_3des found:', raw.find(pbe_3des))
print('pbe_rc2 found:', raw.find(pbe_rc2))

# Let's print all OIDs found in raw
import re
# OID tag is 0x06
for m in re.finditer(b'\x06([\x01-\x1f])', raw):
    l = m.group(1)[0]
    oid_bytes = raw[m.end():m.end()+l]
    print('OID found:', oid_bytes.hex())
