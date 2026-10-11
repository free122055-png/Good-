import base64, hashlib
from Crypto.Cipher import AES

# If pycryptodome is not installed, install it or write AES CBC decryption in python
try:
    from Crypto.Cipher import AES
    print('Crypto available')
except ImportError:
    import subprocess
    subprocess.run(['pip', 'install', 'pycryptodome'])
    from Crypto.Cipher import AES
    print('Pycryptodome installed and ready!')

