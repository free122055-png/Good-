import subprocess

passwords = [
    'almayadin', 'almayadin123', 'Almayadin123', 'almayadin@123', 'AlMayadin123',
    'almayadinbazar', 'almayadinbazar123', 'AlMayadinBazar', 'AlMayadinBazar123',
    '123456', '12345678', '123456789', 'admin123', 'android', 'password',
    'free122055', 'free122055@gmail.com', '122055', 'Almayadin', 'AlMayadin',
    'almayadin2026', 'almayadin2024', 'almayadin2025', 'codemagic', 'Codemagic',
    'secret', 'test', 'release', 'key', 'store', 'bazar', 'Bazar123'
]

# In older openjdk or with legacy pkcs12, let's try with -legacy flag if available
for pw in passwords:
    p = subprocess.run(['openssl', 'pkcs12', '-in', 'release.keystore', '-legacy', '-passin', f'pass:{pw}', '-nodes', '-noout'], capture_output=True, text=True)
    if p.returncode == 0:
        print('FOUND with -legacy:', pw)
        break
    p2 = subprocess.run(['openssl', 'pkcs12', '-in', 'release.keystore', '-passin', f'pass:{pw}', '-nodes', '-noout'], capture_output=True, text=True)
    if p2.returncode == 0:
        print('FOUND standard:', pw)
        break
else:
    print('Not found')
