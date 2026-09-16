import { redirect } from "next/navigation";

export default function DeconvolutionRedirectPage() {
  redirect("/processing/convolution");
}
