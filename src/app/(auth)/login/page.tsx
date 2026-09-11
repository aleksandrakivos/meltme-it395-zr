import { BrandLockup } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-[linear-gradient(160deg,var(--wax-cream)_0%,var(--background)_55%,var(--wax-rose)_100%)] p-6">
      <BrandLockup size="lg" />
      <LoginForm />
    </main>
  );
}
