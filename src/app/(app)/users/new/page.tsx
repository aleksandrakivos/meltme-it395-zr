import { redirect } from "next/navigation";

export default function NewUserRedirect() {
  redirect("/users?new=1");
}
