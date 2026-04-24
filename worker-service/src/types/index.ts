import type { QUEUE_AND_JOB_NAMES, RESOURCES, SERVICES, STATUSES } from '@/constants';

type TQueue = typeof QUEUE_AND_JOB_NAMES;
export type TQueueKey = keyof TQueue;
export type TJobName<T extends TQueueKey> = TQueue[T][number];

export type TResourceType = (typeof RESOURCES)[number];

export type TService = (typeof SERVICES)[number];

export type TStatus = (typeof STATUSES)[number];

export interface IMedia {
  publicId: string;
  url: string;
  resourceType: TResourceType;
  uploadedBy: string;
  deletedBy: string;
  relatedTo: { service: TService; entity: string; entityId: string };
  expiresAt: Date;
  status: TStatus;
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  isUsed: boolean;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}
