import { sql } from '../db/client';
import crypto from 'crypto';

// A real app would use a proper KMS or environment variable for the encryption key.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // For AES, this is always 16

export class ConnectionService {
  
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  async addConnection(ownerId: string, provider: string, token: string): Promise<void> {
    const encryptedToken = this.encrypt(token);
    
    // Upsert the connection
    await sql`
      INSERT INTO secure_connections (owner_id, provider, encrypted_token)
      VALUES (${ownerId}, ${provider}, ${encryptedToken})
      ON CONFLICT (owner_id, provider) DO UPDATE 
      SET encrypted_token = EXCLUDED.encrypted_token, updated_at = now()
    `;
  }

  async getToken(ownerId: string, provider: string): Promise<string | null> {
    const rows = await sql`
      SELECT encrypted_token FROM secure_connections 
      WHERE owner_id = ${ownerId} AND provider = ${provider}
    `;
    if (rows.length === 0) return null;
    return this.decrypt(rows[0].encrypted_token);
  }

  async removeConnection(ownerId: string, provider: string): Promise<void> {
    await sql`
      DELETE FROM secure_connections 
      WHERE owner_id = ${ownerId} AND provider = ${provider}
    `;
  }

  async listConnections(ownerId: string): Promise<string[]> {
    const rows = await sql`
      SELECT provider FROM secure_connections 
      WHERE owner_id = ${ownerId}
    `;
    return rows.map(r => r.provider);
  }
}
