import type {
  PokeApiAbilityResource,
  PokeApiCatalogSourceSnapshot,
  PokeApiFlavorTextEntry,
  PokeApiItemResource,
  PokeApiLanguageTextEntry,
  PokeApiMoveResource,
  PokeApiNamedResource,
  PokeApiNatureResource,
  PokeApiPokemonResource,
  PokeApiTypeResource,
} from "../types/pokeApiSource";
import { sampleCatalogFetchSectionNames } from "./catalogFetchFixtures";
import { samplePokeApiCatalogGeneratorSnapshot } from "./catalogGeneratorFixtures";

export type PokeApiSourceValidationSeverity = "error" | "warning";

export type PokeApiSourceValidationCode =
  | "empty-required-section"
  | "invalid-id"
  | "invalid-name"
  | "invalid-resource-url"
  | "missing-english-text"
  | "missing-required-field"
  | "missing-section-coverage"
  | "missing-sprite-candidate-note"
  | "missing-stat"
  | "missing-type-entry";

export interface PokeApiSourceValidationIssue {
  code: PokeApiSourceValidationCode;
  severity: PokeApiSourceValidationSeverity;
  message: string;
  path: string;
}

export interface PokeApiSourceValidationResult {
  isValid: boolean;
  issues: PokeApiSourceValidationIssue[];
}

const requiredSnapshotSections = ["pokemon", "moves", "abilities", "items", "types", "natures"] as const;
const requiredFetchSections = [...requiredSnapshotSections, "assets", "searchIndex"] as const;
const requiredPokemonStats = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

const addIssue = (issues: PokeApiSourceValidationIssue[], issue: PokeApiSourceValidationIssue) => {
  issues.push(issue);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;

const isPokeApiResourceUrl = (url: string) => /^https:\/\/pokeapi\.co\/api\/v2\/[^/]+\/[^/]+\/$/.test(url);

const validateIdAndName = (
  issues: PokeApiSourceValidationIssue[],
  record: { id: number; name: string },
  path: string,
) => {
  if (!isPositiveInteger(record.id)) {
    addIssue(issues, {
      code: "invalid-id",
      severity: "error",
      path: `${path}.id`,
      message: "PokeAPI source records must include a positive integer id.",
    });
  }

  if (!isNonEmptyString(record.name)) {
    addIssue(issues, {
      code: "invalid-name",
      severity: "error",
      path: `${path}.name`,
      message: "PokeAPI source records must include a non-empty name.",
    });
  }
};

const validateNamedResource = (
  issues: PokeApiSourceValidationIssue[],
  resource: PokeApiNamedResource | null | undefined,
  path: string,
) => {
  if (!resource) {
    addIssue(issues, {
      code: "missing-required-field",
      severity: "error",
      path,
      message: "Expected a PokeAPI named resource.",
    });
    return;
  }

  if (!isNonEmptyString(resource.name)) {
    addIssue(issues, {
      code: "invalid-name",
      severity: "error",
      path: `${path}.name`,
      message: "Named resources must include a non-empty name.",
    });
  }

  if (!isNonEmptyString(resource.url) || !isPokeApiResourceUrl(resource.url)) {
    addIssue(issues, {
      code: "invalid-resource-url",
      severity: "error",
      path: `${path}.url`,
      message: "Named resource URLs must be PokeAPI API resource URLs.",
    });
  }
};

const hasEnglishFlavorText = (entries: PokeApiFlavorTextEntry[]) =>
  entries.some((entry) => entry.language.name === "en" && isNonEmptyString(entry.flavor_text));

const hasEnglishText = (entries: PokeApiLanguageTextEntry[]) =>
  entries.some((entry) => entry.language.name === "en" && isNonEmptyString(entry.text));

const validatePokemon = (
  issues: PokeApiSourceValidationIssue[],
  pokemon: PokeApiPokemonResource,
  index: number,
) => {
  const path = `pokemon.${index}`;
  validateIdAndName(issues, pokemon, path);

  requiredPokemonStats.forEach((statName) => {
    const stat = pokemon.stats.find((entry) => entry.stat.name === statName);

    if (!stat) {
      addIssue(issues, {
        code: "missing-stat",
        severity: "error",
        path: `${path}.stats`,
        message: `Pokemon source record is missing stat "${statName}".`,
      });
      return;
    }

    validateNamedResource(issues, stat.stat, `${path}.stats.${statName}.stat`);
  });

  if (!pokemon.types.length) {
    addIssue(issues, {
      code: "missing-type-entry",
      severity: "error",
      path: `${path}.types`,
      message: "Pokemon source records must include at least one type entry.",
    });
  }

  pokemon.types.forEach((entry, typeIndex) => {
    if (!isPositiveInteger(entry.slot)) {
      addIssue(issues, {
        code: "missing-type-entry",
        severity: "error",
        path: `${path}.types.${typeIndex}.slot`,
        message: "Pokemon type entries must include a positive slot.",
      });
    }

    validateNamedResource(issues, entry.type, `${path}.types.${typeIndex}.type`);
  });

  const hasSpriteCandidate =
    Boolean(pokemon.sprites.front_default) ||
    Boolean(pokemon.sprites.other?.["official-artwork"]?.front_default) ||
    Boolean(pokemon.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default);

  if (!hasSpriteCandidate) {
    addIssue(issues, {
      code: "missing-sprite-candidate-note",
      severity: "warning",
      path: `${path}.sprites`,
      message: "Sprite metadata is optional candidate metadata, but this record has no sprite candidate fields.",
    });
  }
};

const validateMove = (
  issues: PokeApiSourceValidationIssue[],
  move: PokeApiMoveResource,
  index: number,
) => {
  const path = `moves.${index}`;
  validateIdAndName(issues, move, path);
  validateNamedResource(issues, move.damage_class, `${path}.damage_class`);
  validateNamedResource(issues, move.target, `${path}.target`);
  validateNamedResource(issues, move.type, `${path}.type`);

  if (!hasEnglishFlavorText(move.flavor_text_entries)) {
    addIssue(issues, {
      code: "missing-english-text",
      severity: "error",
      path: `${path}.flavor_text_entries`,
      message: "Move source records must include English flavor text for generator descriptions.",
    });
  }
};

const validateAbility = (
  issues: PokeApiSourceValidationIssue[],
  ability: PokeApiAbilityResource,
  index: number,
) => {
  const path = `abilities.${index}`;
  validateIdAndName(issues, ability, path);

  if (!hasEnglishFlavorText(ability.flavor_text_entries)) {
    addIssue(issues, {
      code: "missing-english-text",
      severity: "error",
      path: `${path}.flavor_text_entries`,
      message: "Ability source records must include English flavor text for generator descriptions.",
    });
  }
};

const validateItem = (
  issues: PokeApiSourceValidationIssue[],
  item: PokeApiItemResource,
  index: number,
) => {
  const path = `items.${index}`;
  validateIdAndName(issues, item, path);

  if (!hasEnglishText(item.flavor_text_entries)) {
    addIssue(issues, {
      code: "missing-english-text",
      severity: "error",
      path: `${path}.flavor_text_entries`,
      message: "Item source records must include English text for generator descriptions.",
    });
  }
};

const validateType = (
  issues: PokeApiSourceValidationIssue[],
  type: PokeApiTypeResource,
  index: number,
) => {
  validateIdAndName(issues, type, `types.${index}`);
};

const validateNature = (
  issues: PokeApiSourceValidationIssue[],
  nature: PokeApiNatureResource,
  index: number,
) => {
  const path = `natures.${index}`;
  validateIdAndName(issues, nature, path);

  if (nature.increased_stat) validateNamedResource(issues, nature.increased_stat, `${path}.increased_stat`);
  if (nature.decreased_stat) validateNamedResource(issues, nature.decreased_stat, `${path}.decreased_stat`);
};

export function validatePokeApiSourceSnapshot(
  snapshot: PokeApiCatalogSourceSnapshot = samplePokeApiCatalogGeneratorSnapshot,
): PokeApiSourceValidationResult {
  const issues: PokeApiSourceValidationIssue[] = [];

  if (!isNonEmptyString(snapshot.fetchedAt)) {
    addIssue(issues, {
      code: "missing-required-field",
      severity: "error",
      path: "fetchedAt",
      message: "PokeAPI source snapshots must include fetchedAt metadata.",
    });
  }

  if (!isNonEmptyString(snapshot.sourceVersion)) {
    addIssue(issues, {
      code: "missing-required-field",
      severity: "error",
      path: "sourceVersion",
      message: "PokeAPI source snapshots must include sourceVersion metadata.",
    });
  }

  requiredSnapshotSections.forEach((section) => {
    if (!Array.isArray(snapshot[section]) || snapshot[section].length === 0) {
      addIssue(issues, {
        code: "empty-required-section",
        severity: "error",
        path: section,
        message: `PokeAPI source snapshot must include at least one ${section} record.`,
      });
    }
  });

  requiredFetchSections.forEach((section) => {
    if (!sampleCatalogFetchSectionNames.includes(section)) {
      addIssue(issues, {
        code: "missing-section-coverage",
        severity: "error",
        path: "catalogFetchFixtures.sampleCatalogFetchSectionNames",
        message: `Fetch fixture section coverage is missing "${section}".`,
      });
    }
  });

  snapshot.pokemon.forEach((pokemon, index) => validatePokemon(issues, pokemon, index));
  snapshot.moves.forEach((move, index) => validateMove(issues, move, index));
  snapshot.abilities.forEach((ability, index) => validateAbility(issues, ability, index));
  snapshot.items.forEach((item, index) => validateItem(issues, item, index));
  snapshot.types.forEach((type, index) => validateType(issues, type, index));
  snapshot.natures.forEach((nature, index) => validateNature(issues, nature, index));

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export const samplePokeApiSourceSnapshotValidation = validatePokeApiSourceSnapshot();
