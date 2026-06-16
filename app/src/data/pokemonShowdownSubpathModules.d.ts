declare module 'pokemon-showdown/dist/config/formats.js' {
  export const Formats: Record<string, unknown>[]
}

declare module 'pokemon-showdown/dist/data/abilities.js' {
  export const Abilities: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/aliases.js' {
  export const Aliases: Record<string, string>
}

declare module 'pokemon-showdown/dist/data/rulesets.js' {
  export const Rulesets: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/formats-data.js' {
  export const FormatsData: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/items.js' {
  export const Items: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/learnsets.js' {
  export const Learnsets: Record<string, { learnset?: Record<string, string[]> }>
}

declare module 'pokemon-showdown/dist/data/moves.js' {
  export const Moves: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/natures.js' {
  export const Natures: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/pokedex.js' {
  export const Pokedex: Record<string, { abilities?: Record<string, string>; baseSpecies?: string; exists?: boolean; name?: string }>
}

declare module 'pokemon-showdown/dist/data/scripts.js' {
  export const Scripts: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/conditions.js' {
  export const Conditions: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/typechart.js' {
  export const TypeChart: Record<string, unknown>
}

declare module 'pokemon-showdown/dist/data/pokemongo.js' {
  export const PokemonGoData: Record<string, unknown>
}
