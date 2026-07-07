import { getInitialData } from "@/lib/data";
import { requireUser } from "@/lib/auth/session";
import { AppStoreProvider } from "@/store/AppStore";
import { AppShell } from "@/components/shell/AppShell";

/** Authenticated shell: redirects to /login if there's no session, then
 * seeds the client store from the (now Prisma-backed) data layer. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  const initial = await getInitialData();

  return (
    <AppStoreProvider initial={initial}>
      <AppShell>{children}</AppShell>
    </AppStoreProvider>
  );
}
