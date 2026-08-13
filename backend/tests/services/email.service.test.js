import { beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';

const sendMailMock = vi.fn();

vi.mock('nodemailer', () => ({
    default: {
        createTransport: vi.fn(() => ({
            sendMail: sendMailMock,
        })),
    },
}));

vi.mock('../../config/smtp.config.js', () => ({
    smtpConfig: {
        host: 'smtp.test.local',
        port: 587,
        secure: false,
        auth: {
            user: 'test-user',
            pass: 'test-password',
        },
    },
    emailSender: {
        address: 'no-reply@example.com',
        name: 'SAAS Core',
    },
}));

const { sendEmail } = await import('../../services/email.service.js');

describe('email.service', () => {
    beforeEach(() => {
        sendMailMock.mockReset();
    });

    it('envoie un email avec les données attendues', async () => {
        sendMailMock.mockResolvedValue({
            messageId: 'message-id',
        });

        const result = await sendEmail({
            to: 'user@example.com',
            subject: 'Sujet de test',
            text: 'Version texte',
            html: '<p>Version HTML</p>',
        });

        expect(sendMailMock).toHaveBeenCalledTimes(1);

        expect(sendMailMock).toHaveBeenCalledWith({
            from: {
                name: 'SAAS Core',
                address: 'no-reply@example.com',
            },
            to: 'user@example.com',
            subject: 'Sujet de test',
            text: 'Version texte',
            html: '<p>Version HTML</p>',
        });

        expect(result).toEqual({
            messageId: 'message-id',
        });
    });
    it('configure le transport SMTP avec les protections d’accès externes', () => {
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: 'smtp.test.local',
            port: 587,
            secure: false,
            auth: {
                user: 'test-user',
                pass: 'test-password',
            },
            disableFileAccess: true,
            disableUrlAccess: true,
        });
    });
});