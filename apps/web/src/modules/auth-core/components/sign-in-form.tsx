import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation, type Location } from "react-router-dom";
import { Button, Field, Input } from "@paz/ui";
import { toAppError } from "@paz/types";
import { signInSchema, type SignInInput } from "../schemas";
import { useSignIn } from "../api/use-sign-in";

interface LocationState {
  from?: Location;
}

export function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit((values) => {
    signIn.mutate(values, {
      onSuccess: () => {
        const state = location.state as LocationState | null;
        navigate(state?.from?.pathname ?? "/admin", { replace: true });
      },
    });
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>
      {signIn.isError && (
        <p role="alert" className="text-destructive text-sm">
          {toAppError(signIn.error).message}
        </p>
      )}
      <Button type="submit" loading={signIn.isPending}>
        Sign in
      </Button>
    </form>
  );
}
