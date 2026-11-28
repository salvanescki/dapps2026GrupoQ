export function esRedisHabilitado(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const override = env.REDIS_ENABLED?.trim().toLowerCase();
  if (override === 'false') {
    return false;
  }
  if (override === 'true') {
    return true;
  }

  if (env.NODE_ENV === 'production') {
    return Boolean(env.REDIS_URL?.trim() || env.REDIS_HOST?.trim());
  }

  return true;
}
