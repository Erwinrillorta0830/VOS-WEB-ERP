import { redirect } from "next/navigation";

export default function RootPage() {
    // Root URL "/" will always go to the ERP apps home (/app)
    redirect("/app");
}
