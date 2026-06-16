declare module 'pokemon-showdown/dist/data/aliases.js' {
  export const Aliases: Record<string, string>
}

declare module 'pokemon-showdown/dist/data/learnsets.js' {
  export const Learnsets: Record<string, { learnset?: Record<string, string[]> }>
}

declare module 'pokemon-showdown/dist/data/pokedex.js' {
  export const Pokedex: Record<string, { abilities?: Record<string, string>; baseSpecies?: string; exists?: boolean; name?: string }>
}
