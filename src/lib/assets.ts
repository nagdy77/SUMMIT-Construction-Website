export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

export function assetSrcSet(srcSet: string): string {
  return srcSet
    .split(',')
    .map((candidate) => {
      const [path, ...descriptors] = candidate.trim().split(/\s+/)
      return `${assetUrl(path)} ${descriptors.join(' ')}`
    })
    .join(', ')
}
