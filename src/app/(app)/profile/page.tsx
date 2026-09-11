import { requireUser } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
      />
      <ProfileForm name={user.name} email={user.email} />
    </div>
  );
}
