import { redirect } from "next/navigation";

export default function DRPEBenchPage() {
  redirect("/encryption?algo=drpe");
}
