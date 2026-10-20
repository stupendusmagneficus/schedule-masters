const sharedPilotRef = "jakksxrebisudkecednm";

function isServerKey(key) {
  if (key.startsWith("sb_secret_")) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    );
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export function validateReleaseConfig(config) {
  const {
    environment,
    projectRef,
    mobileUrl,
    bookingUrl,
    mobileKey,
    bookingKey,
    demoMode,
  } = config;
  if (!["pilot", "production"].includes(environment))
    throw new Error("Unknown release environment");
  if (!/^[a-z]{20}$/.test(projectRef ?? ""))
    throw new Error("Invalid Supabase project ref");
  if (environment === "pilot" && projectRef !== sharedPilotRef)
    throw new Error("Pilot must target the documented shared project");
  if (environment === "production" && projectRef === sharedPilotRef)
    throw new Error("Production requires a separate project");
  const expectedUrl = `https://${projectRef}.supabase.co`;
  if (
    [mobileUrl, bookingUrl].some(
      (url) => url?.replace(/\/$/, "") !== expectedUrl,
    )
  ) {
    throw new Error(
      "Both clients must use the same project HTTPS URL matching the release target",
    );
  }
  if (!mobileKey || !bookingKey)
    throw new Error("Both client public keys are required");
  if ([mobileKey, bookingKey].some(isServerKey))
    throw new Error("A server credential cannot be used as a client key");
  if (demoMode && demoMode !== "false")
    throw new Error("Release cannot use demo mode");
  return { environment, projectRef, supabaseUrl: expectedUrl };
}
