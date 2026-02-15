# Email Encryption Setup

## Quick Start

### 1. Install cryptography package

```bash
pip install cryptography
```

### 2. Generate encryption key

Run this command to generate a secure encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

This will output something like:
```
xK8vN2mP9qR5sT7uV1wX3yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0=
```

### 3. Add to .env file

Add the generated key to your `backend/.env` file:

```env
ENCRYPTION_KEY=xK8vN2mP9qR5sT7uV1wX3yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0=
```

**⚠️ IMPORTANT**: 
- Keep this key secret and secure
- Never commit it to version control
- Use different keys for development and production
- If you lose this key, you won't be able to decrypt existing passwords

### 4. Verify setup

Test that encryption is working:

```bash
python -c "
from utils.encryption import is_encryption_available, encrypt_credential, decrypt_credential

if is_encryption_available():
    print('✅ Encryption is properly configured!')
    
    # Test encryption
    test = 'test_password'
    encrypted = encrypt_credential(test)
    decrypted = decrypt_credential(encrypted)
    
    if decrypted == test:
        print('✅ Encryption/decryption working correctly!')
    else:
        print('❌ Encryption test failed!')
else:
    print('❌ Encryption not available. Check ENCRYPTION_KEY in .env')
"
```

## Production Deployment

### Environment Variables

Make sure to set `ENCRYPTION_KEY` in your production environment:

**Vercel/Netlify**: Add to environment variables in dashboard  
**Heroku**: `heroku config:set ENCRYPTION_KEY=your_key_here`  
**Railway**: Add to environment variables in project settings  
**Docker**: Add to docker-compose.yml or pass as environment variable  

### Security Best Practices

1. **Use different keys per environment**
   - Development: One key
   - Staging: Different key
   - Production: Different key

2. **Rotate keys periodically**
   - Generate new key
   - Update environment variable
   - Re-save all email credentials (they'll be re-encrypted with new key)

3. **Backup your key securely**
   - Store in password manager
   - Store in secure secrets management system (AWS Secrets Manager, HashiCorp Vault, etc.)

## Troubleshooting

### "Encryption not available" warning

**Cause**: `ENCRYPTION_KEY` not set in environment  
**Solution**: Follow steps 2-3 above

### "Error decrypting credential"

**Cause**: Encryption key changed or credential corrupted  
**Solution**: Re-save the email credentials in admin panel

### Credentials stored in plain text

**Cause**: Encryption key was not set when credentials were saved  
**Solution**: 
1. Set up encryption key (steps 2-3)
2. Re-save email credentials in admin panel
3. Verify in database that password is now encrypted

## Migration from Plain Text

If you already have plain text passwords in the database:

1. Set up encryption key (steps 2-3)
2. Go to admin panel → Settings → Email tab
3. Re-enter and save all email credentials
4. Old plain text passwords will be replaced with encrypted versions

## Key Rotation

To rotate encryption keys:

1. Generate new key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
2. Update `ENCRYPTION_KEY` in environment
3. Restart application
4. Re-save all tenant email credentials in admin panel
5. Old encrypted values will be replaced with new encryption

---

**Need Help?** Check the main testing guide: `TENANT_EMAIL_TESTING_GUIDE.md`

