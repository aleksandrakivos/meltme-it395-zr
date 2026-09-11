import { redirect } from "next/navigation";

export default function NewSupplierRedirect() {
  redirect("/suppliers?new=1");
}
