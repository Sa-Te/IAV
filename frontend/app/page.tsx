"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="flex flex-col gap-10">
        <Link href={"/login"}> Go to login </Link>
        <Link href={"/register"}> Register here</Link>
      </div>
    </main>
  );
}
