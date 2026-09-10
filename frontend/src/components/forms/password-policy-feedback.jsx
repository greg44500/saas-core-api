function getCharacterClassCount(password) {
  return [
    /\p{Ll}/u.test(password),
    /\p{Lu}/u.test(password),
    /\p{N}/u.test(password),
    /[^\p{L}\p{N}\s]/u.test(password),
    /\s/u.test(password),
  ].filter(Boolean).length;
}

/**
 * Interprète le contrat déclaratif fourni par le backend. Les seuils et poids
 * ne sont jamais définis dans le frontend : il ne fait qu'exécuter le contrat
 * public pour fournir un retour immédiat sans envoyer le secret au serveur.
 */
function evaluateFromPolicy(password, policy) {
  if (!password || !policy?.scoring || !Array.isArray(policy.levels)) {
    return null;
  }

  let score = 0;

  for (const band of policy.scoring.lengthBands ?? []) {
    if (password.length >= band.minLength) score += band.points;
  }

  const classCount = getCharacterClassCount(password);
  for (const band of policy.scoring.characterClassBands ?? []) {
    if (classCount >= band.minClasses) score += band.points;
  }

  const characters = Array.from(password);
  const uniqueRatio = characters.length > 0
    ? new Set(characters).size / characters.length
    : 0;

  if (uniqueRatio >= (policy.scoring.uniqueRatio?.minRatio ?? Number.POSITIVE_INFINITY)) {
    score += policy.scoring.uniqueRatio?.points ?? 0;
  }

  return [...policy.levels]
    .sort((left, right) => right.minScore - left.minScore)
    .find((level) => score >= level.minScore) ?? policy.levels[0];
}

function PasswordPolicyFeedback({ password, policy }) {
  if (!policy) {
    return null;
  }

  const level = evaluateFromPolicy(password, policy);
  const levelClassName = {
    weak: 'bg-destructive',
    good: 'bg-warning',
    strong: 'bg-success',
  }[level?.key] ?? 'bg-muted';

  const levelIndex = level
    ? Math.max(0, policy.levels.findIndex((candidate) => candidate.key === level.key))
    : -1;

  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-xs text-muted-foreground">
        {policy.minLength} à {policy.maxLength} caractères. Lettres, chiffres, espaces et caractères spéciaux sont autorisés.
      </p>

      {password && level && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1" aria-hidden="true">
            {policy.levels.map((candidate, index) => (
              <span
                className={`h-1.5 rounded-full ${index <= levelIndex ? levelClassName : 'bg-muted'}`}
                key={candidate.key}
              />
            ))}
          </div>
          <p className="text-xs font-medium">
            Robustesse : {level.label}
          </p>
        </div>
      )}

      {Array.isArray(policy.guidance) && policy.guidance.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {policy.guidance.join(' ')}
        </p>
      )}
    </div>
  );
}

export { PasswordPolicyFeedback, evaluateFromPolicy };
