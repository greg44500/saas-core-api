import { Outlet } from 'react-router';

function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground">
        <Outlet />
      </section>
    </main>
  );
}

export { AuthLayout };
