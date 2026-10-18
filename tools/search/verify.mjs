import dotenv from 'dotenv'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

dotenv.config({
  path: new URL('../../env/.env.local', import.meta.url),
  quiet: true
})
const requireAPI = createRequire(
  new URL('../../apps/api/package.json', import.meta.url)
)
const postgres = requireAPI('postgres')
// This runner can only create synthetic fixtures in the isolated local cluster.
const adminURL = 'postgres://search_test_admin@127.0.0.1:55433/postgres'
const suffix = Date.now().toString(36)
const name = `search_verify_${suffix}`,
  role = `search_app_${suffix}`
const admin = postgres(adminURL, { max: 1, onnotice: () => {} })
let fixture, app
try {
  await admin.unsafe(`create database ${name}`)
  await admin.unsafe(`create role ${role} login nosuperuser nobypassrls`)
  fixture = postgres(`postgres://search_test_admin@127.0.0.1:55433/${name}`, {
    max: 1,
    onnotice: () => {}
  })
  process.env.DATABASE_URL = `postgres://${role}@127.0.0.1:55433/${name}`
  const actor = randomUUID(),
    other = randomUUID(),
    w1 = randomUUID(),
    w2 = randomUUID(),
    w3 = randomUUID(),
    b1 = randomUUID(),
    b2 = randomUUID(),
    b3 = randomUUID()
  const actorSQL = "nullif(current_setting('zillion.user_id',true),'')::uuid"
  await fixture.unsafe(`
    create table users(id uuid primary key);
    create table files(key text primary key,owner_id uuid not null,original_name text,mime_type text,size integer,module_id text,created timestamptz default now());
    create table notes__entries(id uuid primary key,owner_id uuid not null,name text,content text);
    create table zillion_databases__workspaces(id uuid primary key,owner_id uuid not null);
    create table zillion_databases__workspace_members(id uuid primary key,owner_id uuid not null,workspace_id uuid,user_id uuid,role text);
    create table zillion_databases__workspace_pages(id uuid primary key,owner_id uuid not null,workspace_id uuid,title text,route_key text,body jsonb);
    create table zillion_databases__bases(id uuid primary key,owner_id uuid not null,workspace_id uuid,name text);
    create table zillion_databases__records(id uuid primary key,owner_id uuid not null,base_id uuid,title text,content text,item_type text,values jsonb,done boolean,date timestamptz);
    create table zillion_databases__record_sources(id uuid primary key,owner_id uuid not null,record_id uuid,kind text,native_id uuid);
    create table search__documents(owner_id uuid not null,source_id text not null,fingerprint text not null,model text not null,content text not null,inferred boolean not null default false,warning text not null default '',chunk_count integer not null,updated timestamptz default now(),primary key(owner_id,source_id));
    create table search__chunks(owner_id uuid not null,source_id text not null,ordinal integer not null,fingerprint text not null,model text not null,vector jsonb not null,primary key(owner_id,source_id,ordinal));
  `)
  for (const table of [
    'files',
    'notes__entries',
    'zillion_databases__bases',
    'zillion_databases__records',
    'zillion_databases__record_sources',
    'search__documents',
    'search__chunks'
  ])
    await fixture.unsafe(
      `alter table ${table} enable row level security;alter table ${table} force row level security;create policy owner on ${table} using(owner_id=${actorSQL}) with check(owner_id=${actorSQL});`
    )
  await fixture.unsafe(`
    alter table zillion_databases__workspace_members enable row level security;alter table zillion_databases__workspace_members force row level security;create policy member on zillion_databases__workspace_members using(owner_id=${actorSQL} or user_id=${actorSQL});
    alter table zillion_databases__workspaces enable row level security;alter table zillion_databases__workspaces force row level security;create policy workspace on zillion_databases__workspaces using(owner_id=${actorSQL} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=zillion_databases__workspaces.id and m.user_id=${actorSQL}));
    alter table zillion_databases__workspace_pages enable row level security;alter table zillion_databases__workspace_pages force row level security;create policy pages on zillion_databases__workspace_pages using(exists(select 1 from zillion_databases__workspaces w where w.id=workspace_id));
    grant usage on schema public to ${role};grant select,insert,update,delete on all tables in schema public to ${role};
  `)
  const noteID = randomUUID(),
    privateID = randomUUID(),
    sharedID = randomUUID()
  await fixture`insert into notes__entries values(${noteID},${actor},'Aurora lens','The Aurora photography kit has a silver 50mm lens and a red carry bag.'),(${privateID},${other},'Private secret','Never share this other-account-secret.')`
  await fixture`insert into zillion_databases__workspaces values(${w1},${actor}),(${w2},${other}),(${w3},${other})`
  await fixture`insert into zillion_databases__workspace_members values(${randomUUID()},${other},${w2},${actor},'viewer')`
  await fixture`insert into zillion_databases__bases values(${b1},${actor},${w1},'Personal'),(${b2},${other},${w2},'Shared'),(${b3},${other},${w3},'Secret')`
  await fixture`insert into zillion_databases__records values(${randomUUID()},${actor},${b1},'Travel notebook','Aurora camera travels to Baku.','note','{}',false,null),(${sharedID},${other},${b2},'Shared handbook','Shared workshop begins on Tuesday.','page','{}',false,null),(${randomUUID()},${other},${b3},'Hidden document','Other workspace secret','page','{}',false,null)`
  const { collectSources } =
    await import('../../apps/api/src/lib/search/sources.ts')
  const { snapshot, indexBatch } =
    await import('../../apps/api/src/lib/search/store.ts')
  const { default: routes } =
    await import('../../apps/api/src/lib/search/index.ts')
  const { answer, embed, rank } =
    await import('../../apps/api/src/lib/search/inference.ts')
  app = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })
  const database = drizzle({ client: app })
  const as = (user, operation) =>
    database.transaction(async db => {
      await db.execute(sql`select set_config('zillion.user_id',${user},true)`)
      return operation(db)
    })
  const call = (db, key, body) =>
    routes[key]
      .getValue()
      .callback({
        db,
        res: { locals: { userId: actor } },
        body,
        query: {},
        req: {},
        core: {},
        media: {}
      })
      .then(r => {
        assert.equal(r.$status, 200)
        return r.payload
      })
  const sources = await as(actor, db => collectSources(db, actor))
  assert(sources.some(s => s.id === `record:${sharedID}`))
  assert(!sources.some(s => /secret/i.test(s.text)))
  await as(actor, async db => {
    await collectSources(db, actor)
    const [s] = await db.execute(
      sql`select current_setting('zillion.user_id') as actor`
    )
    assert.equal(s.actor, actor)
  })
  await assert.rejects(
    as(actor, db => collectSources(db, actor, { workspace_id: w3 }))
  )
  console.log(
    'PASS: own/shared sources, hidden workspace rejection, actor restoration'
  )
  const keyword = await as(actor, db =>
    call(db, 'query', { query: 'Aurora lens', mode: 'keyword', answer: false })
  )
  assert(keyword.hits.some(h => h.title === 'Aurora lens'))
  assert(!keyword.hits.some(h => /secret/i.test(h.text)))
  const token = await readFile(process.env.SHARED_AI_TOKEN_FILE, 'utf8')
  const health = await fetch(process.env.SHARED_AI_URL + '/health', {
    headers: { Authorization: `Bearer ${token.trim()}` }
  }).then(r => r.json())
  assert(health.ready)
  let indexed
  for (let i = 0; i < 10; i++) {
    indexed = await as(actor, db => indexBatch(db, actor, {}))
    if (!indexed.pending) break
  }
  assert.equal(indexed.pending, 0)
  const snap = await as(actor, db => snapshot(db, actor))
  assert(snap.passages.every(p => p.vector?.length === 768))
  const queryVector = await embed(['camera lens'], 'query')
  assert.equal(queryVector[0].length, 768)
  const decision = await rank('What lens is in the Aurora photography kit?', [
    'The Aurora photography kit includes a silver 50mm lens.',
    'The workshop starts Tuesday.'
  ])
  assert.equal(decision.length, 2)
  assert(decision[0].relevance > decision[1].relevance)
  const generated = await answer(
    'What lens is in the Aurora photography kit?',
    [
      {
        title: 'Aurora lens',
        text: 'The Aurora photography kit has a silver 50mm lens and a red carry bag.',
        inferred: false
      }
    ]
  )
  assert(generated.length)
  assert(generated.every(s => s.citations.every(id => id === 1)))
  const hybrid = await as(actor, db =>
    call(db, 'query', {
      query: 'What lens is in the Aurora photography kit?',
      mode: 'hybrid',
      answer: true
    })
  )
  assert(
    hybrid.stages.includes('embedding') &&
      hybrid.stages.includes('laya') &&
      hybrid.stages.includes('llm')
  )
  assert(hybrid.answer.length)
  assert(hybrid.hits.some(h => h.text.includes('50mm')))
  console.log(
    'PASS: live Mac embedding, Laya ranking, cited LLM answer, full hybrid query'
  )
  const longID = randomUUID()
  await fixture`insert into notes__entries values(${longID},${actor},'Long field journal',${'Photography in the Caucasus mountains with a camera and tripod. '.repeat(320)})`
  const first = await as(actor, db =>
    indexBatch(db, actor, { module: 'notes' })
  )
  assert.equal(first.processed, 8)
  assert(first.pending > 0)
  const partial = await as(actor, db =>
    snapshot(db, actor, { module: 'notes' })
  )
  assert.equal(
    partial.passages.filter(
      p => p.source.id === `notes__entries:${longID}` && p.vector
    ).length,
    8
  )
  let resumed = first
  for (let i = 0; i < 8 && resumed.pending; i++)
    resumed = await as(actor, db => indexBatch(db, actor, { module: 'notes' }))
  assert.equal(resumed.pending, 0)
  await fixture`delete from notes__entries where id=${longID}`
  console.log(
    'PASS: eight-passage batches resume without repeating completed vectors'
  )
  const sharp = requireAPI('sharp')
  const image = await sharp(
    Buffer.from(
      '<svg width="420" height="240"><rect width="420" height="240" fill="white"/><rect x="30" y="30" width="100" height="100" fill="red"/><text x="30" y="190" font-size="28">AURORA 50mm</text></svg>'
    )
  )
    .png()
    .toBuffer()
  const fileKey = 'monolith--idea-box/' + randomUUID() + '.png'
  await fixture`insert into files(key,owner_id,original_name,mime_type,size,module_id) values(${fileKey},${actor},'Aurora visual.png','image/png',${image.length},'monolith--idea-box'),(${'monolith--idea-box/' + randomUUID() + '.png'},${other},'Private image.png','image/png',100,'monolith--idea-box')`
  const { storageProvider } = await import('../../apps/api/src/core/storage.ts')
  const originalGet = storageProvider.get
  storageProvider.get = async key => {
    assert.equal(key, fileKey)
    return {
      stream: Readable.from(image),
      size: image.length,
      mimeType: 'image/png'
    }
  }
  try {
    const imageBatch = await as(actor, db =>
      indexBatch(db, actor, { module: 'idea-box' })
    )
    assert.equal(imageBatch.pending, 0)
    const indexedImage = await as(actor, db =>
      snapshot(db, actor, { module: 'idea-box' })
    )
    assert(
      indexedImage.passages.some(
        p =>
          p.inferred &&
          p.vector?.length === 768 &&
          p.source.file?.key === fileKey
      )
    )
    assert(!indexedImage.sources.some(s => s.title === 'Private image.png'))
  } finally {
    storageProvider.get = originalGet
  }
  console.log(
    'PASS: owned image → live Mac vision → embedding; other-account files excluded'
  )
  const { pushSchemaFiles } =
    await import('../src/commands/db/functions/pushSchema.ts')
  process.env.DATABASE_ADMIN_URL = `postgres://search_test_admin@127.0.0.1:55433/${name}`
  const schema = new URL(
    '../../apps/api/src/lib/search/schema.drizzle.ts',
    import.meta.url
  )
  const migration = await pushSchemaFiles([
    decodeURIComponent(schema.pathname).replace(/^\/([A-Z]:)/, '$1')
  ])
  assert.equal(migration.failures.length, 0)
  assert.equal(
    (await fixture`select count(*)::integer as count from notes__entries`)[0]
      .count,
    2
  )
  console.log('PASS: scoped Drizzle migration preserves existing content')
  await fixture`update notes__entries set content='Changed text with a blue tripod only.' where id=${noteID}`
  const stale = await as(actor, db => snapshot(db, actor))
  assert(
    stale.passages
      .filter(p => p.source.id === `notes__entries:${noteID}`)
      .every(p => !p.vector && p.text.includes('blue tripod'))
  )
  await fixture`delete from zillion_databases__workspace_members where workspace_id=${w2}`
  const revoked = await as(actor, db => snapshot(db, actor))
  assert(!revoked.passages.some(p => p.source.id === `record:${sharedID}`))
  const otherCache = await as(other, db =>
    db.execute(sql`select source_id from search__documents`)
  )
  assert.equal(otherCache.length, 0)
  console.log(
    'PASS: edited text rejects stale vectors; revoked membership excludes cached evidence; cache RLS isolates actors'
  )
  const saved = process.env.SHARED_AI_URL
  process.env.SHARED_AI_URL = 'http://127.0.0.1:1'
  const offline = await as(actor, db =>
    call(db, 'query', { query: 'blue tripod', mode: 'hybrid', answer: true })
  )
  process.env.SHARED_AI_URL = saved
  assert(offline.hits.some(h => h.text.includes('blue tripod')))
  assert(offline.warnings.some(w => w.code === 'laya-unavailable'))
  assert.equal(offline.answer.length, 0)
  console.log('PASS: offline AI preserves current keyword evidence')
} finally {
  await app?.end()
  await fixture?.end()
  await admin.unsafe(`drop database if exists ${name} with (force)`)
  await admin.unsafe(`drop role if exists ${role}`)
  await admin.end()
}
process.exit(0)
