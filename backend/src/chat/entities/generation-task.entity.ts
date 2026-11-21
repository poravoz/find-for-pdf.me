
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import User from '../../users/entities/users.entity';

export type GenerationTaskStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled';

@Entity('generation_tasks')
export class GenerationTask {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    chatId!: string;

    @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatId' })
    chat!: Chat;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'text' })
    question!: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pending',
    })
    status!: GenerationTaskStatus;

    @Column({ type: 'uuid', nullable: true })
    regenerateMessageId!: string | null;

    @Column({ type: 'text', nullable: true })
    error!: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
