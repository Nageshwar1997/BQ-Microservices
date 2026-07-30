import { jobProducer } from '../configs/index.js';
import type { TContactQueryType } from '../types/index.js';

interface IContactMailJob {
  to: string;
  subject: string;
  htmlOrText: string;
}

/**
 * `@beautinique/backend-bullmq`'s `QUEUE_SCHEMA` doesn't declare a
 * contact-mail queue/job yet, so `JobProducer.addJob` can't type-check
 * this call. Using placeholder queue/job names (`contact-queue` /
 * `send-contact-mail`) until that's added upstream and `mail-service`
 * grows a matching handler - swap this cast out for a real `addJob` call
 * once it exists.
 */
export const enqueueContactMail = (data: IContactMailJob) =>
  (
    jobProducer.addJob as unknown as (
      queueName: string,
      jobName: string,
      data: IContactMailJob,
    ) => Promise<unknown>
  )('contact-queue', 'send-contact-mail', data);

export const buildContactAcknowledgementEmail = (options: {
  to: string;
  ticketId: string;
  queryType: TContactQueryType;
}): IContactMailJob => {
  const { to, ticketId, queryType } = options;

  return {
    to,
    subject: `[Ticket #${ticketId}] Your query has been received`,
    htmlOrText: `
      <p>Hi,</p>
      <p>We've received your <strong>${queryType}</strong> query and a member of our support team will reply to this email shortly.</p>
      <p>Your ticket reference is <strong>#${ticketId}</strong> - please keep it for any follow-up.</p>
      <p>Thanks,<br/>Beautinique Support</p>
    `,
  };
};

export const buildContactAdminNotificationEmail = (options: {
  to: string;
  ticketId: string;
  name: string;
  email: string;
  phoneNumber: string;
  queryType: TContactQueryType;
  message: string;
}): IContactMailJob => {
  const { to, ticketId, name, email, phoneNumber, queryType, message } = options;

  return {
    to,
    subject: `[Ticket #${ticketId}] New Contact Query — ${queryType}`,
    htmlOrText: `
      <p><strong>Ticket:</strong> #${ticketId}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phoneNumber}</p>
      <p><strong>Query type:</strong> ${queryType}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <hr/>
      <p>Reply directly to this email (${email}) to respond to the customer.</p>
    `,
  };
};
