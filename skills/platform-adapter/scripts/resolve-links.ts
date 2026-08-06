import { readFile } from 'node:fs/promises';

type Config = { site_url_template?: string };

export async function resolveLink(configPath: string, id: string): Promise<string | null> {
  const config = JSON.parse(await readFile(configPath, 'utf8')) as Config;
  return config.site_url_template?.replaceAll('{id}', encodeURIComponent(id)) ?? null;
}

if (process.argv[1]?.endsWith('resolve-links.ts')) {
  const [, , configPath, id] = process.argv;
  if (!configPath || !id) {
    console.error('Usage: corepack yarn tsx scripts/resolve-links.ts <config.json> <id>');
    process.exit(2);
  }
  console.log((await resolveLink(configPath, id)) ?? '');
}
