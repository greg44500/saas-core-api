import { useState } from 'react';

function App() {
  const [verificationCount, setVerificationCount] = useState(0);

  return (
    <main>
      <p>SaaS Core</p>
      <h1>Frontend Core V1</h1>
      <p>Le socle React + Vite est initialisé.</p>

      <button
        type="button"
        onClick={() => setVerificationCount((count) => count + 1)}
      >
        Vérifier l’interaction ({verificationCount})
      </button>
    </main>
  );
}

export default App;
