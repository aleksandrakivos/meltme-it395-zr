"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
import { updateUser } from "@/actions/users";
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
import { userUpdateSchema, type UserUpdateInput } from "@/lib/validation/user";

const ROLES = [Role.ADMIN, Role.MENADZER_PROIZVODNJE, Role.MENADZER_PRODAJE] as const;

type UserEditFormProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  isSelf: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

export function UserEditForm({
  user,
  isSelf,
  onDirtyChange,
  onSuccess,
}: UserEditFormProps) {
  const router = useRouter();
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  function onSubmit(values: UserUpdateInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateUser(values);
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
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={user.email} disabled />
        </Field>
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
          name="role"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Uloga</FieldLabel>
              <Select
                value={field.value ?? null}
                onValueChange={field.onChange}
                disabled={isPending || isSelf}
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
              {isSelf ? (
                <p className="text-sm text-muted-foreground">
                  Ne možete promeniti sopstvenu ulogu.
                </p>
              ) : null}
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
