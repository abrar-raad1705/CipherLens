import { redirect } from "next/navigation";

export default function FourierPage() {
  redirect("/encryption?algo=fourier");
}
