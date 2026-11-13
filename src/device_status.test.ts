import assert from "node:assert/strict";
import { dashboardEvent, decideDeviceStatus, type DeviceObservation } from "./device_status.ts";

const now = new Date("2026-10-28T10:00:00.000Z");
const observation: DeviceObservation = {
  deviceId: "tablet-7",
  courseId: "course-4",
  learnerId: "learner-9",
  deadline: "2026-10-28T09:00:00.000Z",
  observedAt: now.toISOString(),
  connected: true,
  batteryPercent: 80
};

assert.equal(decideDeviceStatus(observation, now), "attention");
assert.equal(dashboardEvent(observation, now).status, "attention");
console.log("deadline decision: attention");
