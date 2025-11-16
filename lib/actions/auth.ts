"use server";

import { signIn } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import ratelimit from "../ratelimit";
import { redirect } from "next/navigation";

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, password, universityId, universityCard } = params;
  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) return redirect("/too-fast");

  // Check if user already exists
  const exsistingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (exsistingUser.length > 0) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);
  try {
    // Ensure universityId is converted to a number
    await db.insert(users).values({
      fullName,
      email,
      password: hashedPassword,
      universityId: Number(universityId),
      universityCard,
    });

    // await signInWithCredentials({ email, password });
    return { success: true };
  } catch (error) {
    console.error("Error during user sign up:", error);
    return { success: false, error: "Internal server error" };
  }
};

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">
) => {
  const { email, password } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) return redirect("/too-fast");

  try {
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      return { success: false, error: res.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error during user sign in:", error);
    return { success: false, error: "Internal server error" };
  }
};
