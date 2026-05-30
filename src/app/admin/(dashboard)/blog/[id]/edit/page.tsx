import type { Metadata } from "next";
import EditBlogPost from "./page-client";

export const metadata: Metadata = {
  title: "Редактирование статьи — Блог",
};

export default function Page() {
  return <EditBlogPost />;
}
