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
import { Message } from './message.entity';

@Entity('chat_files')
export class ChatFile {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'uuid' })
    chatId!: string;

    @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatId' })
    chat!: Chat;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    messageId!: string | null;

    @ManyToOne(() => Message, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'messageId' })
    message!: Message | null;

    @Column({ type: 'varchar', length: 255 })
    originalName!: string;

    @Column({ type: 'varchar', length: 100 })
    mimeType!: string;

    @Column({ type: 'int' })
    size!: number;

    @Column({ type: 'int', default: 0 })
    chunksCount!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'varchar', length: 500, nullable: true })
    storageKey!: string | null;
}
