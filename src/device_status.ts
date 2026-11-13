export type DeviceStatus = "online" | "offline" | "attention";

export type DeviceObservation = {
  deviceId: string;
  courseId: string;
  learnerId: string;
  deadline: string;
  observedAt: string;
  connected: boolean;
  batteryPercent: number;
};

export function decideDeviceStatus(observation: DeviceObservation, now: Date): DeviceStatus {
  const overdue = new Date(observation.deadline).getTime() < now.getTime();
  if (!observation.connected) return overdue ? "attention" : "offline";
  if (observation.batteryPercent < 15 || overdue) return "attention";
  return "online";
}

export function dashboardEvent(observation: DeviceObservation, now: Date) {
  return {
    deviceId: observation.deviceId,
    courseId: observation.courseId,
    learnerId: observation.learnerId,
    deadline: observation.deadline,
    status: decideDeviceStatus(observation, now),
    observedAt: observation.observedAt
  };
}
