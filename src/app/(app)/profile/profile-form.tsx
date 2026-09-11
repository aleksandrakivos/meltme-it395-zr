"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfile } from "@/actions/profile";
import { SectionTitle } from "@/components/section-title";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useReportDirty } from "@/hooks/use-report-dirty";
import { notifySuccess } from "@/lib/notify";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validation/profile";

type ProfileFormProps = {
  name: string;
  email: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
};

export function ProfileForm({
  name,
  email,
  onDirtyChange,
  onSuccess,
}: ProfileFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useReportDirty(form.formState.isDirty, onDirtyChange);

  function onSubmit(values: ProfileUpdateInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      notifySuccess("Profil je sačuvan");
      form.reset({
        name: values.name,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onSuccess?.();
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
          <Input value={email} disabled />
        </Field>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-name">Ime</FieldLabel>
              <Input {...field} id="profile-name" disabled={isPending} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <div className="space-y-2 border-t pt-4">
          <SectionTitle>Promena lozinke</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Ostavite prazno ako ne menjate lozinku.
          </p>
        </div>
        <Controller
          name="currentPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-current-password">
                Trenutna lozinka
              </FieldLabel>
              <Input
                {...field}
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                disabled={isPending}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="newPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-new-password">
                Nova lozinka
              </FieldLabel>
              <Input
                {...field}
                id="profile-new-password"
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
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-confirm-password">
                Potvrda nove lozinke
              </FieldLabel>
              <Input
                {...field}
                id="profile-confirm-password"
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
