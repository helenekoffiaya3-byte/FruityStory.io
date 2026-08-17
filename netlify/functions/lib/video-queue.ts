import { assertVideoProviderAllowed, type SubscriptionTier } from "./video-quota";

type VideoProvider = "veo" | "pixverse";

export type VideoQueueJob = {
  id: string;
  userId: string;
  subscription: SubscriptionTier;
  provider: VideoProvider;
  prompt: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
};

const queue: VideoQueueJob[] = [];

export function enqueueVideoJob(input: Omit<VideoQueueJob, "id" | "status" | "createdAt">) {
  assertVideoProviderAllowed(input.subscription, input.provider);

  const job: VideoQueueJob = {
    ...input,
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  queue.push(job);
  return job;
}

export function getVideoQueueJob(id: string) {
  return queue.find((job) => job.id === id) || null;
}

export function claimNextVideoJob() {
  const job = queue.find((item) => item.status === "queued");
  if (!job) return null;
  job.status = "processing";
  return job;
}

export function completeVideoJob(id: string) {
  const job = getVideoQueueJob(id);
  if (job) job.status = "completed";
  return job;
}

export function failVideoJob(id: string) {
  const job = getVideoQueueJob(id);
  if (job) job.status = "failed";
  return job;
}
