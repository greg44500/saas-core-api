import nodemailer from 'nodemailer';

import { emailSender, smtpConfig } from '../config/smtp.config.js';

const transporter = nodemailer.createTransport({
    ...smtpConfig,
    disableFileAccess: true,
    disableUrlAccess: true,
});

const sendEmail = async ({
    to,
    subject,
    text,
    html,
}) => {
    return transporter.sendMail({
        from: {
            name: emailSender.name,
            address: emailSender.address,
        },
        to,
        subject,
        text,
        html,
    });
};

export { sendEmail };