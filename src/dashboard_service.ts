import { dashboardEvent, type DeviceObservation } from "./device_status.ts";
import { infraiFromEnvironment } from "./infrai_client.ts";
import { z } from "zod";

const observationSchema = z.object({
  deviceId: z.string().min(1),
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  deadline: z.string().datetime(),
  observedAt: z.string().datetime(),
  connected: z.boolean(),
  batteryPercent: z.number().min(0).max(100)
});

const observation = observationSchema.parse({
  deviceId: process.env.DEVICE_ID ?? "lab-tablet-01",
  courseId: process.env.COURSE_ID ?? "algebra-101",
  learnerId: process.env.LEARNER_ID ?? "learner-001",
  deadline: process.env.LEARNER_DEADLINE ?? "2099-01-01T00:00:00.000Z",
  observedAt: new Date().toISOString(),
  connected: true,
  batteryPercent: 82
}) as DeviceObservation;

async function main() {
  const infrai = infraiFromEnvironment();
  const channel = `course-${observation.courseId}`;
  const event = dashboardEvent(observation, new Date());
  // The copyable capability idiom is infrai.realtime.channel.create.
  await infrai.realtimeChannelCreate({ channel, type: "private" });
  await infrai.realtimeTokenIssue({
    client_id: observation.learnerId,
    channels: [channel],
    capabilities: ["publish"],
    ttl_seconds: 3600
  });
  await infrai.realtimePresenceGet(channel);
  await infrai.realtimePublish({ channel, event: "device.status", data: event, account_id: observation.courseId });
  await infrai.metricsReport({
    name: "edtech.device.status",
    value: event.status === "online" ? 1 : 0,
    type: "gauge",
    tags: { course_id: event.courseId, status: event.status },
    idempotency_key: `${event.deviceId}:${event.observedAt}`
  });
  const metric = await infrai.metricsQuery({ name: "edtech.device.status", agg: "count", window: "1h" });
  console.log(JSON.stringify({ channel, event, metric }));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
