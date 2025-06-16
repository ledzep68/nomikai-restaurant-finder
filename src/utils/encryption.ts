import crypto from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt?: string;
  algorithm: string;
  keyVersion: string;
}

interface KeyRotationConfig {
  rotationInterval: number; // milliseconds
  keyRetentionPeriod: number; // milliseconds
}

export class AdvancedEncryptionService {
  private readonly config: EncryptionConfig;
  private readonly keyRotation: KeyRotationConfig;
  private masterKey: Buffer;
  private currentKeyVersion: string;
  private keyStore = new Map<string, { key: Buffer; created: Date; expires: Date }>();

  constructor() {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16,  // 128 bits
      tagLength: 16, // 128 bits
      saltLength: 32, // 256 bits
    };

    this.keyRotation = {
      rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      keyRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.initializeMasterKey();
    this.startKeyRotation();
  }

  // Encrypt sensitive data with key rotation support
  async encryptData(plaintext: string, context?: string): Promise<EncryptedData> {
    const dataKey = this.generateDataKey();
    const iv = crypto.randomBytes(this.config.ivLength);
    const salt = crypto.randomBytes(this.config.saltLength);

    // Derive key with salt and context
    const derivedKey = this.deriveKey(dataKey, salt, context);

    const cipher = crypto.createCipher(this.config.algorithm, derivedKey);
    cipher.setAAD(Buffer.from(context || 'default')); // Additional Authenticated Data

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Encrypt the data key with current master key
    const encryptedDataKey = this.encryptDataKey(dataKey);

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: this.config.algorithm,
      keyVersion: this.currentKeyVersion,
    };
  }

  // Decrypt data with support for multiple key versions
  async decryptData(encryptedData: EncryptedData, context?: string): Promise<string> {
    try {
      // Get the correct key version
      const keyInfo = this.keyStore.get(encryptedData.keyVersion);
      if (!keyInfo) {
        throw new Error('Encryption key not found or expired');
      }

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      const salt = Buffer.from(encryptedData.salt || '', 'hex');

      // Decrypt data key
      const dataKey = this.decryptDataKey(encryptedData.keyVersion);
      
      // Derive the same key used for encryption
      const derivedKey = this.deriveKey(dataKey, salt, context);

      const decipher = crypto.createDecipher(encryptedData.algorithm, derivedKey);
      decipher.setAAD(Buffer.from(context || 'default'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Hash sensitive data for searching while maintaining privacy
  hashForSearch(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(this.config.saltLength).toString('hex');
    const hash = crypto.createHash('sha256');
    hash.update(data + actualSalt);
    return hash.digest('hex');
  }

  // Create secure hash for passwords with salt
  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = crypto.randomBytes(this.config.saltLength).toString('hex');
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve({
          hash: derivedKey.toString('hex'),
          salt: salt,
        });
      });
    });
  }

  // Verify password against hash
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey));
      });
    });
  }

  // Generate cryptographically secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Create HMAC for data integrity
  createHMAC(data: string, secret?: string): string {
    const actualSecret = secret || this.masterKey;
    return crypto.createHmac('sha256', actualSecret).update(data).digest('hex');
  }

  // Verify HMAC
  verifyHMAC(data: string, hmac: string, secret?: string): boolean {
    const actualSecret = secret || this.masterKey;
    const expectedHmac = crypto.createHmac('sha256', actualSecret).update(data).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
  }

  // Key derivation function
  private deriveKey(key: Buffer, salt: Buffer, context?: string): Buffer {
    const info = Buffer.from(context || 'nomikai-app');
    return crypto.hkdfSync('sha256', key, salt, info, this.config.keyLength);
  }

  // Generate new data key
  private generateDataKey(): Buffer {
    return crypto.randomBytes(this.config.keyLength);
  }

  // Encrypt data key with master key
  private encryptDataKey(dataKey: Buffer): string {
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipher(this.config.algorithm, this.masterKey);
    
    let encrypted = cipher.update(dataKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  // Decrypt data key with master key
  private decryptDataKey(keyVersion: string): Buffer {
    const keyInfo = this.keyStore.get(keyVersion);
    if (!keyInfo) {
      throw new Error('Key version not found');
    }

    // In a real implementation, encrypted data keys would be stored
    // For now, we'll return the stored key directly
    return keyInfo.key;
  }

  // Initialize master key from environment or generate new one
  private initializeMasterKey(): void {
    const envKey = process.env.MASTER_ENCRYPTION_KEY;
    
    if (envKey) {
      this.masterKey = Buffer.from(envKey, 'hex');
    } else {
      // Generate new master key (in production, this should be stored securely)
      this.masterKey = crypto.randomBytes(this.config.keyLength);
      console.warn('Generated new master key. Store this securely:', this.masterKey.toString('hex'));
    }

    // Initialize first key version
    this.currentKeyVersion = this.generateKeyVersion();
    this.keyStore.set(this.currentKeyVersion, {
      key: this.masterKey,
      created: new Date(),
      expires: new Date(Date.now() + this.keyRotation.keyRetentionPeriod),
    });
  }

  // Start automatic key rotation
  private startKeyRotation(): void {
    setInterval(() => {
      this.rotateKeys();
    }, this.keyRotation.rotationInterval);
  }

  // Rotate encryption keys
  private rotateKeys(): void {
    // Generate new key version
    const newKeyVersion = this.generateKeyVersion();
    const newKey = crypto.randomBytes(this.config.keyLength);
    
    // Store new key
    this.keyStore.set(newKeyVersion, {
      key: newKey,
      created: new Date(),
      expires: new Date(Date.now() + this.keyRotation.keyRetentionPeriod),
    });

    // Update current key version
    this.currentKeyVersion = newKeyVersion;
    this.masterKey = newKey;

    // Clean up expired keys
    this.cleanupExpiredKeys();

    console.log(`Key rotated to version: ${newKeyVersion}`);
  }

  // Generate unique key version identifier
  private generateKeyVersion(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}`;
  }

  // Clean up expired keys
  private cleanupExpiredKeys(): void {
    const now = new Date();
    for (const [version, keyInfo] of this.keyStore.entries()) {
      if (keyInfo.expires < now) {
        this.keyStore.delete(version);
        console.log(`Cleaned up expired key version: ${version}`);
      }
    }
  }

  // Get current key information for monitoring
  getKeyInfo(): { version: string; created: Date; totalKeys: number } {
    const currentKey = this.keyStore.get(this.currentKeyVersion);
    return {
      version: this.currentKeyVersion,
      created: currentKey?.created || new Date(),
      totalKeys: this.keyStore.size,
    };
  }

  // Secure key deletion
  private secureKeyDeletion(key: Buffer): void {
    // Overwrite key memory with random data multiple times
    for (let i = 0; i < 3; i++) {
      crypto.randomFillSync(key);
    }
  }
}