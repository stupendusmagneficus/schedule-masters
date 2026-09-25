export type SetupValidationError =
  | "required"
  | "slug"
  | "price"
  | "duration"
  | "workingDays"
  | "schedule";

type SetupValues = {
  readonly name: string;
  readonly price: string;
  readonly serviceName: string;
  readonly slug: string;
  readonly duration: string;
  readonly workingDays: ReadonlyArray<number>;
  readonly startTime: string;
  readonly endTime: string;
};

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateSetupValues(
  values: SetupValues,
): SetupValidationError | null {
  if (
    !values.name.trim() ||
    !values.slug.trim() ||
    !values.serviceName.trim()
  ) {
    return "required";
  }

  if (!values.slug.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) return "slug";

  const price = Number(values.price);
  if (!values.price.trim() || !Number.isFinite(price) || price < 0) {
    return "price";
  }

  const duration = Number(values.duration);
  if (
    !values.duration.trim() ||
    !Number.isInteger(duration) ||
    duration <= 0 ||
    duration > 1440
  ) {
    return "duration";
  }

  if (!values.workingDays.length) return "workingDays";

  if (
    !timePattern.test(values.startTime.trim()) ||
    !timePattern.test(values.endTime.trim()) ||
    timeToMinutes(values.endTime) <= timeToMinutes(values.startTime)
  ) {
    return "schedule";
  }

  return null;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
}
