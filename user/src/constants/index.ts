import { envs } from '@/envs';

export const ORIGINS = [
  envs.url.frontend.prod.client,
  envs.url.frontend.prod.admin,
  envs.url.frontend.prod.master,
  envs.url.frontend.dev.client,
  envs.url.frontend.dev.admin,
  envs.url.frontend.dev.master,
  envs.url.frontend.dev.public1,
  envs.url.frontend.dev.public2,
];
