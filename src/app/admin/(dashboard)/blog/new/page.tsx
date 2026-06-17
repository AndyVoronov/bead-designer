import type { Metadata } from "next";
import NewBlogPost from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новая статья — Блог",
};

export default function Page() {
  return <NewBlogPost />;
}
