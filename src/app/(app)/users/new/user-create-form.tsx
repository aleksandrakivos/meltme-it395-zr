"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
import { createUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { roleLabel } from "@/lib/nav";
import { userCreateSchema, type UserCreateInput } from "@/lib/validation/user";

const ROLES = [Role.ADMIN, Role.MENADZER_PROIZVODNJE, Role.MENADZER_PRODAJE] as const;

type UserCreateFormProps = {
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

export function UserCreateForm({
  onDirtyChange,
  onSuccess,
}: UserCreateFormProps) {
  const router = useRouter();
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      role: Role.MENADZER_PRODAJE,
      password: "",
    },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  function onSubmit(values: UserCreateInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createUser(values);
      if (result && !result.ok) {
        setFormError(result.error);
        return;
      }
      if (result?.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-4"
      noValidate
    >
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-name`}>Ime</FieldLabel>
              <Input {...field} id={`${id}-name`} disabled={isPending} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
              <Input
                {...field}
                id={`${id}-email`}
                type="email"
                autoComplete="off"
                disabled={isPending}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="role"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Uloga</FieldLabel>
              <Select
                value={field.value ?? null}
                onValueChange={field.onChange}
                disabled={isPending}
                items={ROLES.map((role) => ({
                  value: role,
                  label: roleLabel(role),
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-password`}>Početna lozinka</FieldLabel>
              <Input
                {...field}
                id={`${id}-password`}
                type="password"
                autoComplete="new-password"
                disabled={isPending}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Čuvanje…" : "Sačuvaj"}
        </Button>
      </FieldGroup>
    </form>
  );
}
