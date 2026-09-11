import { redirect } from "next/navigation";

export default function EditUserRedirect() {
  redirect("/users");
}
