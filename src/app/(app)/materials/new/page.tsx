import { redirect } from "next/navigation";

export default function NewMaterialRedirect() {
  redirect("/materials?new=1");
}
