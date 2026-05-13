import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@localhost";

export async function requireUserId(): Promise<string> {
  let user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!user) {
    user = await prisma.user.create({ data: { email: ADMIN_EMAIL, name: "Admin" } });
  }
  return user.id;
}
