import { redirect } from "next/navigation";

export default function EditCustomerRedirect() {
  redirect("/customers");
}
