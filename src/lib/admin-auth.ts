import { NextRequest } from "next/server";

export async function isAdmin(request: NextRequest): Promise<boolean> {
  return true;
}
