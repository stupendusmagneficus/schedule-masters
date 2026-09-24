import {
  masterEmailSchema,
  masterPasswordSchema,
} from "@schedule-app/validation";

export type AuthField = "email" | "password";

export type AuthFieldTouchState = Readonly<Record<AuthField, boolean>>;

type AuthFormValues = {
  readonly email: string;
  readonly password: string;
};

export function getVisibleAuthFieldErrors(
  values: AuthFormValues,
  touched: AuthFieldTouchState,
): ReadonlyArray<AuthField> {
  const errors: AuthField[] = [];

  if (touched.email && !masterEmailSchema.safeParse(values.email).success) {
    errors.push("email");
  }

  if (
    touched.password &&
    !masterPasswordSchema.safeParse(values.password).success
  ) {
    errors.push("password");
  }

  return errors;
}
