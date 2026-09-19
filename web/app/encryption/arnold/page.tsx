import { redirect } from "next/navigation";

export default function ArnoldPage() {
  redirect("/encryption?algo=arnold");
}
