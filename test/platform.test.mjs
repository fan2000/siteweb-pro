import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('workspace is wired to Next, Nest and Prisma/PostgreSQL', async () => {
  const rootPackage = await readJson('package.json');
  const web = await readJson('apps/web/package.json');
  const api = await readJson('apps/api/package.json');
  const schema = await readFile(new URL('apps/api/prisma/schema.prisma', root), 'utf8');
  assert.deepEqual(rootPackage.workspaces, ['apps/web', 'apps/api']);
  assert.ok(web.dependencies.next && web.dependencies.react);
  assert.ok(api.dependencies['@nestjs/core'] && api.dependencies['@prisma/client']);
  assert.match(schema, /provider\s*=\s*"postgresql"/);
});

test('catalogue seeds are labelled demo and cannot be mistaken for active offers in source', async () => {
  const offers = await readJson('data/offers.json');
  assert.equal(offers.length, 8);
  assert.ok(offers.every((offer) => offer.demo === true));
  assert.ok(offers.filter((offer) => offer.kind === 'affiliate').every((offer) => offer.affiliateUrl === null));
});
