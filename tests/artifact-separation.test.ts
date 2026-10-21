import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('public entry and router have no private Studio imports or routes',()=>{
  const app=fs.readFileSync('src/App.tsx','utf8')
  const routes=fs.readFileSync('src/lib/routes.ts','utf8')
  assert.doesNotMatch(app,/StudioPage|studio\.css|VITE_STUDIO_ENABLED/)
  assert.doesNotMatch(routes,/['"]studio['"]|\/admin/)
})

test('deployable function trees are disjoint',()=>{
  const publicFiles=fs.readdirSync('functions-public/api',{recursive:true}).map(String)
  const privateFiles=fs.readdirSync('functions-private',{recursive:true}).map(String)
  assert.equal(publicFiles.some(file=>file.includes('admin')),false)
  assert.equal(privateFiles.some(file=>file.includes('comments.ts')||file.includes('waitlist.ts')),false)
})

test('private Studio repository cannot fall back to demo fixtures',()=>{
  const repository=fs.readFileSync('src/lib/contentRepository.ts','utf8')
  assert.doesNotMatch(repository,/DemoRepository|VITE_CMS_API_ENABLED|import\s*\{[^}]*studioFixtures/)
  assert.match(repository,/new ApiRepository\(\)/)
})
