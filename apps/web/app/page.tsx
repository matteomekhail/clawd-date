"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function HomePage() {
  const users = useQuery(api.users.list);

  return (
    <main>
      <h1>clawd.date</h1>
      {users === undefined ? <p>Loading…</p> : <p>{users.length} devs</p>}
    </main>
  );
}
