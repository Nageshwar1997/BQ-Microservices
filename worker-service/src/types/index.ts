import type { QUEUE_AND_JOB_NAMES } from '@/constants';

type TQueue = typeof QUEUE_AND_JOB_NAMES;
export type TQueueKey = keyof TQueue;
export type TJobName<T extends TQueueKey> = TQueue[T][number];

