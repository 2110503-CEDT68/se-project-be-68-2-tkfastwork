const nodemailer = require('nodemailer');
const sendEmail = require('../utils/email');

jest.mock('nodemailer');

describe('Email Utility', () => {
    let sendMailMock;

    beforeEach(() => {
        sendMailMock = jest.fn().mockResolvedValue(true);
        nodemailer.createTransport.mockReturnValue({
            sendMail: sendMailMock
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should send email successfully', async () => {
        const mailOptions = {
            to: 'test@test.com',
            subject: 'Test',
            html: '<p>Test</p>'
        };

        await sendEmail(mailOptions);

        expect(nodemailer.createTransport).toHaveBeenCalled();
        expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@test.com',
            subject: 'Test',
            html: '<p>Test</p>'
        }));
    });

    test('should handle errors silently (non-fatal)', async () => {
        sendMailMock = jest.fn().mockRejectedValue(new Error('SMTP Error'));
        nodemailer.createTransport.mockReturnValue({
            sendMail: sendMailMock
        });
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await sendEmail({ to: 'test@test.com' });

        expect(consoleSpy).toHaveBeenCalledWith('Email send failed (non-fatal):', 'SMTP Error');
        consoleSpy.mockRestore();
    });
});