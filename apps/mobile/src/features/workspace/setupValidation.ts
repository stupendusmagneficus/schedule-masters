export type SetupValidationError = "required" | "slug" | "price";

type SetupValues = {
  readonly name: string;
  readonly price: string;
  readonly serviceName: string;
  readonly slug: string;
};

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

  return null;
}
