import { Outlet } from 'react-router';

function OnboardingLayout() {
  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-1">
          <p className="text-sm font-medium text-primary">SaaS Core</p>
          <p className="text-sm text-muted-foreground">Configuration de votre espace de travail</p>
        </header>
        <Outlet />
      </div>
    </main>
  );
}

export { OnboardingLayout };
