// src/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  // Immediately redirect anyone who visits "/" to "/sales-return"
  redirect("/returns/sales-return");
}
