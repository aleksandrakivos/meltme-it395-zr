import { redirect } from "next/navigation";

export default function NewProductRedirect() {
  redirect("/products?new=1");
}
