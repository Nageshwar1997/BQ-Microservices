import { NotFoundError } from '@beautinique/backend-classes';
import { CONTACT_QUERY_STATUS_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type {
  IListContactQueriesQuery,
  TContactQueryTicketIdZodSchema,
  TCreateContactQueryZodSchema,
  TUpdateContactQueryStatusZodSchema,
} from '@beautinique/backend-types';
import type { Request, Response } from 'express';

import { jobProducer, logger } from '../../configs/index.js';
import { CONTACT_QUERY_RETENTION_MS_MAP, SUPPORT_INBOX_EMAIL } from '../../constants/index.js';
import { ContactQuery } from '../../models/index.js';
import type { TContactQuery } from '../../types/index.js';

export const createContactQueryController = async (req: Request, res: Response) => {
  const { name, email, phoneNumber, queryType, message } = req.body as TCreateContactQueryZodSchema;

  const contactQuery = await ContactQuery.create({
    name,
    email,
    phoneNumber,
    queryType,
    message,
    status: CONTACT_QUERY_STATUS_MAP.OPENED,
  });

  const ticketId = contactQuery._id.toString();

  try {
    await Promise.all([
      jobProducer.addJob('mail-queue', 'send-contact-acknowledgement', {
        to: email,
        subject: `[Ticket #${ticketId}] Your query has been received`,
        data: { ticketId, queryType },
      }),
      jobProducer.addJob('mail-queue', 'send-contact-admin-notification', {
        to: SUPPORT_INBOX_EMAIL,
        subject: `[Ticket #${ticketId}] New Contact Query — ${queryType}`,
        data: { ticketId, name, email, phoneNumber, queryType, message },
      }),
    ]);
  } catch (error) {
    // The ticket is already saved - a queue hiccup shouldn't fail the
    // request, the admin can still see the query via the dashboard listing.
    logger.error(
      `❌ Failed to enqueue contact query emails for ticket ${ticketId}: ${String(error)}`,
    );
  }

  res.success({
    message: 'Query submitted successfully',
    data: { ticketId, status: contactQuery.status },
    statusCode: 201,
  });
};

export const getContactQueriesController = async (req: Request, res: Response) => {
  const { page = '1', limit = '10', status, queryType } = req.query as IListContactQueriesQuery;

  const currentPage = Math.max(Number(page), 1);
  const pageSize = Math.max(Number(limit), 1);

  const filter: Partial<Pick<TContactQuery, 'status' | 'queryType'>> = {};

  if (status) filter.status = status;
  if (queryType) filter.queryType = queryType;

  const [queries, total] = await Promise.all([
    ContactQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ContactQuery.countDocuments(filter),
  ]);

  res.success({
    message: 'Contact queries fetched successfully',
    data: {
      queries,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
};

export const updateContactQueryStatusController = async (req: Request, res: Response) => {
  const { ticketId } = req.params as TContactQueryTicketIdZodSchema;
  const { status } = req.body as TUpdateContactQueryStatusZodSchema;

  // CLOSED/REJECTED get a TTL deadline (see `CONTACT_QUERY_RETENTION_MS_MAP`);
  // any other status clears it, so reopening a query cancels its auto-delete.
  const retentionMs = CONTACT_QUERY_RETENTION_MS_MAP[status];
  const expiresAt = retentionMs ? new Date(Date.now() + retentionMs) : null;

  const contactQuery = await ContactQuery.findByIdAndUpdate(
    getObjId(ticketId),
    { status, expiresAt },
    { new: true },
  ).lean();

  if (!contactQuery) {
    throw new NotFoundError('Contact query not found');
  }

  res.success({ message: 'Contact query updated successfully', data: contactQuery });
};
