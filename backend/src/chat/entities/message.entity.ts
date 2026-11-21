import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Chat } from './chat.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'uuid' })
    chatId!: string;

    @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatId' })
    chat!: Chat;

    @Column({ type: 'varchar', length: 20 })
    role!: 'user' | 'assistant';

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'jsonb', nullable: true })
    sources!: string[] | null;

    @CreateDateColumn()
    createdAt!: Date;
}
