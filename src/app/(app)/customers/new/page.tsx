import { redirect } from "next/navigation";

export default function NewCustomerRedirect() {
  redirect("/customers?new=1");
}
