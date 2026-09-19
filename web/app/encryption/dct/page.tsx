import { redirect } from "next/navigation";

export default function DCTPage() {
  redirect("/encryption?algo=dct");
}
