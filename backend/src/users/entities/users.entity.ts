import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
 
@Entity()
class User {
  @PrimaryGeneratedColumn('uuid')
  public id: string;
 
  @Column({ unique: true })
  public email: string;
 
  @Column()
  public name: string;
 
  @Column({ type: 'varchar', nullable: true })
  public password: string | null;
  
  @Column({ type: 'varchar', nullable: true })
  public avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  public googleId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  public githubId: string | null;

  @Column({ default: false })
  public isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  public emailVerificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  public emailVerificationCodeExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  public pendingEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  public pendingEmailVerificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  public pendingEmailVerificationCodeExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  public currentHashedRefreshToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  passwordChangeCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangeCodeExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  passwordResetCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetCodeExpiresAt: Date | null;
}
 
export default User;
