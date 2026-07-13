import { envs } from '../envs/index.js';

export const baseHtmlLayout = (title: string, description: string, content: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
        </head>
        <body
            style="
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #fdf2f8 0%, #fff7ed 100%);
            font-family: Arial, Helvetica, sans-serif;
            color: #2d1b2e;
            "
        >
            <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="padding: 32px 16px"
            >
            <tr>
                <td align="center">
                <table
                    role="presentation"
                    cellpadding="0"
                    cellspacing="0"
                    width="100%"
                    style="
                    max-width: 620px;
                    background: #ffffff;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 18px 45px rgba(104, 47, 74, 0.14);
                    "
                >
                    <tr>
                    <td
                        style="
                        padding: 40px 32px 24px;
                        text-align: center;
                        background: linear-gradient(135deg, #831843 0%, #be185d 100%);
                        color: #ffffff;
                        "
                    >
                        <p
                        style="
                            margin: 0;
                            font-size: 14px;
                            letter-spacing: 2px;
                            text-transform: uppercase;
                            opacity: 0.9;
                        "
                        >
                        Beautinique
                        </p>
                        <h1 style="margin: 14px 0 8px; font-size: 30px; line-height: 1.2">${title}</h1>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; opacity: 0.92">${description}</p>
                    </td>
                    </tr>

                    <tr>
                    <td style="padding: 32px">
                        ${content}
                        <p
                        style="
                            margin: 0;
                            font-size: 15px;
                            line-height: 1.7;
                            color: #5b4158;
                            font-style: italic;
                        "
                        >
                        If you did not request this code, you can safely ignore this email.
                        </p>
                    </td>
                    </tr>

                    <tr>
                    <td
                        style="
                        padding: 24px 32px 32px;
                        border-top: 1px solid #f5d0db;
                        background: #fffafc;
                        text-align: center;
                        "
                    >
                        <p style="margin: 0 0 8px; font-size: 14px; color: #6b4d63">
                        Need help? <a href="mailto:${envs.mail.user}">Contact</a> the Beautinique
                        support team.
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #9a7a8d">
                        This is an automated message. Please do not reply directly to this email.
                        </p>
                    </td>
                    </tr>
                </table>
                </td>
            </tr>
            </table>
        </body>
    </html>
  `;
};

export const getOtpHtmlMessage = (title: string, otp: string) => {
  return baseHtmlLayout(
    title,
    'Use the verification code below to continue securely.',
    `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7">Hello,</p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #5b4158">
    We received a request to verify your action. Please enter the OTP below to
    proceed.
    </p>

    <div
    style="
        margin: 0 auto 24px;
        max-width: 320px;
        padding: 20px 24px;
        border-radius: 18px;
        background: #fff1f2;
        border: 1px dashed #f9a8d4;
        text-align: center;
    "
    >
    <p
        style="
        margin: 0 0 10px;
        font-size: 13px;
        color: #9d174d;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        "
    >
        Your One-Time Password
    </p>
    <p
        style="
        margin: 0;
        font-size: 34px;
        font-weight: 700;
        letter-spacing: 10px;
        color: #831843;
        "
    >
        ${otp}
    </p>
    </div>
    <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.7; color: #5b4158">
    This code is valid for <b>10 minutes</b> and is intended for one-time use only.
    Please do not share it with anyone.
    </p>`,
  );
};
