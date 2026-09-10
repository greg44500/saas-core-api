function getCharacterClassCount(password) {
  return [
    /\p{Ll}/u.test(password),
    /\p{Lu}/u.test(password),
    /\p{N}/u.test(password),
    /[^\p{L}\p{N}\s]/u.test(password),
    /\s/u.test(password),
  ].filter(Boolean).length;
}

function normalizeForWeakPasswordDetection(password, rejection) {
  const leetspeakMap = rejection?.leetspeakMap ?? {};

  return password
    .toLocaleLowerCase('fr-FR')
    .split('')
    .map((character) => leetspeakMap[character] ?? character)
    .join('')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function hasRepeatedPattern(password, rejection) {
  const repeatedCharacterMinimum = rejection?.repeatedCharacterMinimum ?? 6;
  const repeatedPatternMaximumLength = rejection?.repeatedPatternMaximumLength ?? 8;
  const repeatedPatternMinimumRepeats = rejection?.repeatedPatternMinimumRepeats ?? 3;
  const normalized = password.toLocaleLowerCase('fr-FR');

  const sameCharacter = new RegExp(
    `^(.)\\1{${Math.max(1, repeatedCharacterMinimum - 1)},}$`,
    'u',
  );

  if (sameCharacter.test(normalized)) {
    return true;
  }

  for (let patternLength = 1; patternLength <= repeatedPatternMaximumLength; patternLength += 1) {
    if (normalized.length < patternLength * repeatedPatternMinimumRepeats) {
      continue;
    }

    if (normalized.length % patternLength !== 0) {
      continue;
    }

    const pattern = normalized.slice(0, patternLength);
    const repeatCount = normalized.length / patternLength;

    if (
      repeatCount >= repeatedPatternMinimumRepeats
      && pattern.repeat(repeatCount) === normalized
    ) {
      return true;
    }
  }

  return false;
}

function isAscendingOrDescendingSequence(value, minimumLength) {
  if (value.length < minimumLength) {
    return false;
  }

  const codePoints = Array.from(value, (character) => character.codePointAt(0));
  const direction = Math.sign(codePoints[1] - codePoints[0]);

  if (![1, -1].includes(direction)) {
    return false;
  }

  return codePoints.slice(1).every((codePoint, index) =>
    codePoint - codePoints[index] === direction);
}

function isRepeatedSequencePrefix(value, sequence, minimumLength) {
  if (value.length < minimumLength) {
    return false;
  }

  const repeated = sequence.repeat(
    Math.ceil(value.length / sequence.length),
  );

  return repeated.startsWith(value);
}

function hasTrivialSequence(password, rejection) {
  const minimumLength = rejection?.minimumSequenceLength ?? 6;
  const knownSequences = rejection?.knownSequences ?? [];
  const compact = password
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]/g, '');

  if (isAscendingOrDescendingSequence(compact, minimumLength)) {
    return true;
  }

  if (compact.length < minimumLength) {
    return false;
  }

  return knownSequences.some((sequence) =>
    sequence.includes(compact)
    || isRepeatedSequencePrefix(compact, sequence, minimumLength));
}

function isRejectedByPublicPolicy(password, policy) {
  const rejection = policy?.rejection;

  if (!password || !rejection) {
    return false;
  }

  const normalized = normalizeForWeakPasswordDetection(password, rejection);
  const containsWeakTerm = (rejection.weakTerms ?? [])
    .some((term) => normalized.includes(term));

  return containsWeakTerm
    || hasRepeatedPattern(password, rejection)
    || hasTrivialSequence(password, rejection);
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

  if (isRejectedByPublicPolicy(password, policy)) {
    return policy.levels.find((level) => level.key === 'weak') ?? policy.levels[0];
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
  const rejected = isRejectedByPublicPolicy(password, policy);
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
          {rejected && (
            <p className="text-xs text-destructive">
              Ce mot de passe est trop prévisible et sera refusé.
            </p>
          )}
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

export {
  PasswordPolicyFeedback,
  evaluateFromPolicy,
  isRejectedByPublicPolicy,
};
