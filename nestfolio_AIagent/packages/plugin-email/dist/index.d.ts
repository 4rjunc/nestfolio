import { Service, Plugin } from '@elizaos/core';
import { EmailContent } from 'mail-notifier';

declare enum EmailOutgoingProvider {
    GMAIL = "gmail",
    SMTP = "smtp"
}
declare enum EmailIncomingProvider {
    IMAP = "imap"
}
interface BaseConfig {
    provider: EmailOutgoingProvider;
    user: string;
    pass: string;
}
interface GmailConfig extends BaseConfig {
    service: string;
}
interface SmtpConfig extends BaseConfig {
    host: string;
    port: number;
    secure: boolean;
}
interface ImapConfig {
    provider: EmailIncomingProvider;
    host: string;
    port: number;
    user: string;
    pass: string;
}
type OutgoingConfig = GmailConfig | SmtpConfig;
type IncomingConfig = ImapConfig;

interface EmailAttachment {
    filename: string;
    path: string;
    cid?: string;
}
interface SendEmailOptions {
    from?: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: EmailAttachment[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
}
interface EmailResponse {
    success: boolean;
    messageId?: string;
    response?: string;
    error?: string;
}
interface IEmailService extends Service {
    send(options: SendEmailOptions): Promise<EmailResponse>;
    receive(callback: (mail: EmailContent) => void): void;
}

declare const emailPlugin: Plugin;

export { EmailIncomingProvider, EmailOutgoingProvider, type EmailResponse, type GmailConfig, type IEmailService, type ImapConfig, type IncomingConfig, type OutgoingConfig, type SendEmailOptions, type SmtpConfig, emailPlugin as default, emailPlugin };
