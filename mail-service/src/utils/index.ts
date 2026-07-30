import type {
  IContactAcknowledgementData,
  IContactAdminNotificationData,
} from '@beautinique/backend-bullmq';

import { envs } from '../envs/index.js';

const baseHtmlLayout = (
  title: string,
  description: string,
  content: string,
  footerNote = 'If you did not request this code, you can safely ignore this email.',
) => {
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
                            margin: 24px 0 0;
                            font-size: 15px;
                            line-height: 1.7;
                            color: #5b4158;
                            font-style: italic;
                        "
                        >
                        ${footerNote}
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
                        Need help? <a href="mailto:${envs.mail.from}">Contact</a> the Beautinique
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

/* -------------------------------------------------------------------------- */
/*                          Contact Query Notifications                       */
/* -------------------------------------------------------------------------- */

export const getContactAcknowledgementHtmlMessage = ({
  ticketId,
  queryType,
}: IContactAcknowledgementData) => {
  return baseHtmlLayout(
    'Query Received',
    "We've got your message, and our team is already on it.",
    `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7">Hello,</p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #5b4158">
    Thank you for reaching out to Beautinique. We've logged your query and our
    support team will get back to you within <b>24-48 hours</b>.
    </p>

    <div
    style="
        margin: 0 auto 24px;
        max-width: 380px;
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
        font-size: 12px;
        color: #9d174d;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        "
    >
        Your Ticket ID
    </p>
    <p
        style="
        margin: 0 0 14px;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #831843;
        font-family: 'Courier New', Courier, monospace;
        "
    >
        #${ticketId}
    </p>
    <span
        style="
        display: inline-block;
        padding: 6px 16px;
        border-radius: 999px;
        background: #ffffff;
        color: #831843;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid #f9a8d4;
        "
    >
        ${queryType}
    </span>
    </div>
    <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.7; color: #5b4158">
    Please keep this ticket ID handy - it helps our team find your query
    instantly if you ever need to follow up.
    </p>`,
    'This is a confirmation of your submitted query - no action is needed from you right now.',
  );
};

const detailRow = (label: string, valueHtml: string) => `
    <tr>
        <td
        style="
            padding: 10px 0;
            border-bottom: 1px solid #f5d0db;
            font-size: 13px;
            color: #9a7a8d;
            width: 110px;
            vertical-align: top;
            white-space: nowrap;
        "
        >
        ${label}
        </td>
        <td
        style="
            padding: 10px 0 10px 16px;
            border-bottom: 1px solid #f5d0db;
            font-size: 15px;
            color: #2d1b2e;
            font-weight: 600;
        "
        >
        ${valueHtml}
        </td>
    </tr>`;

export const getContactAdminNotificationHtmlMessage = ({
  ticketId,
  name,
  email,
  phoneNumber,
  queryType,
  message,
}: IContactAdminNotificationData) => {
  return baseHtmlLayout(
    'New Contact Query',
    `A new query has landed in the support inbox - Ticket #${ticketId}.`,
    `<table
    role="presentation"
    cellpadding="0"
    cellspacing="0"
    width="100%"
    style="margin: 0 0 24px; border-collapse: collapse"
    >
    ${detailRow('Ticket ID', `#${ticketId}`)}
    ${detailRow('Name', name)}
    ${detailRow(
      'Email',
      `<a href="mailto:${email}" style="color: #be185d; text-decoration: none">${email}</a>`,
    )}
    ${
      phoneNumber
        ? detailRow(
            'Phone',
            `<a href="tel:${phoneNumber}" style="color: #be185d; text-decoration: none">${phoneNumber}</a>`,
          )
        : ''
    }
    ${detailRow(
      'Query Type',
      `<span
        style="
        display: inline-block;
        padding: 4px 14px;
        border-radius: 999px;
        background: #fdf2f8;
        color: #831843;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid #f9a8d4;
        "
      >${queryType}</span>`,
    )}
    </table>

    <div
    style="
        margin: 0;
        padding: 20px 24px;
        border-radius: 16px;
        background: #fffafc;
        border-left: 4px solid #be185d;
    "
    >
    <p
        style="
        margin: 0 0 10px;
        font-size: 12px;
        color: #9d174d;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
        "
    >
        Message
    </p>
    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #2d1b2e; white-space: pre-wrap">${message}</p>
    </div>`,
    'This is an automated internal notification from the Beautinique contact form.',
  );
};
