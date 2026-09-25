// The city catalog is executable geometry, not just names in map metadata.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { serve, launch } = require('./helpers');

module.exports = async function () {
  // A later script must never silently replace another sourced building.
  const registrations = ['landmarks.js', 'wahrzeichen.js'].flatMap((file) =>
    Array.from(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8')
      .matchAll(/\b(?:register|World\.registerLandmark)\('([^']+)'/g), (match) => match[1]));
  assert.strictEqual(new Set(registrations).size, registrations.length, 'landmark registrations must have unique canonical IDs');
  const port = 9000 + Math.floor(Math.random() * 90), server = serve(port);
  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => { window.STUNTS_IDLE = 99999; });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => window.World && World.landmarkCatalog);
    const models = await page.evaluate(() => Object.entries(World.landmarkCatalog).map(([id, catalog]) => {
      const model = World.P[id](), issues = [];
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
      let meshes = 0, vertices = 0, triangles = 0;
      model.traverse((mesh) => {
        if (!mesh.isMesh) return;
        meshes++;
        if (!mesh.geometry || !mesh.geometry.attributes.position) { issues.push('missing mesh positions'); return; }
        const pos = mesh.geometry.attributes.position;
        vertices += pos.count;
        triangles += (mesh.geometry.index ? mesh.geometry.index.count : pos.count) / 3;
        if (!Array.from(pos.array).every(Number.isFinite)) issues.push('non-finite vertex');
        if (!mesh.matrixWorld.elements.every(Number.isFinite)) issues.push('non-finite mesh transform');
        if (!mesh.material) issues.push('missing material');
      });
      let sourceValid = false;
      try {
        const url = new URL(catalog.source);
        sourceValid = url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
      } catch (_) { /* Report malformed or missing provenance below. */ }
      return { id, catalog, metadata: model.userData, issues, sourceValid, meshes, vertices, triangles,
        min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray() };
    }));
    const ids = models.map((m) => m.id);
    assert.deepStrictEqual([...ids].sort(), [...registrations].sort(), 'every declared landmark must reach the runtime catalog');
    for (const id of ['agnes', 'gereon', 'synagoge', 'richmodisturm', 'melaten', 'bottmuehle',
      'overstolzenhaus', 'ursula', 'makk', 'altheribert', 'siebengebirge', 'butzweilerhof',
      'kreuzblume', 'stapelhaus', 'pegel', 'roemerturm', 'gereonsmuehle', 'eistuete', 'ulrepforte',
      'stseverin', 'lyskirchen', 'stclemens', 'oberlandesgericht', 'staatenhaus', 'hochbunker',
      'herkuleshochhaus', 'herkulesberg', 'janvonwerth', 'drehbruecke', 'pollerkoepfe', 'rheinboulevard']) {
      assert(ids.includes(id), id + ': the new real Cologne model must be registered');
    }
    assert(models.length >= 48, 'both city catalogs and the new landmarks must load');
    assert(!ids.includes('severin'), 'St. Severin has one canonical model, stseverin');
    for (const model of models) {
      assert.deepStrictEqual(model.issues, [], model.id + ': visible geometry must be finite and valid');
      assert(model.meshes > 0 && model.vertices > 0 && model.triangles > 0, model.id + ': must contain actual geometry');
      assert(model.sourceValid, model.id + ': must provide a valid HTTPS source page');
      assert.strictEqual(model.metadata.landmarkId, model.id, model.id + ': model identity must match the registry');
      assert.strictEqual(model.metadata.landmarkName, model.catalog.name, model.id + ': display name must match the registry');
      assert.strictEqual(model.metadata.landmarkSource, model.catalog.source, model.id + ': source metadata must survive construction');
      assert(model.catalog.name.length >= 3, model.id + ': must have a recognizable place name');
      assert([...model.min, ...model.max, ...model.size].every(Number.isFinite), model.id + ': world bounds must be finite');
      assert(model.size.every((n) => n > 0), model.id + ': model must have non-zero width, depth and height');
      assert(Math.abs(model.min[1]) < 0.05, model.id + ': model base must rest on the ground');
      assert(Math.abs(model.min[0] + model.max[0]) < 0.05 && Math.abs(model.min[2] + model.max[2]) < 0.05,
        model.id + ': complete horizontal footprint must be centered for safe map placement');
      const footprint = model.metadata.landmarkFootprint;
      assert(footprint && [footprint.width, footprint.height, footprint.depth].every((n) => Number.isFinite(n) && n > 0),
        model.id + ': must declare a finite placement footprint');
      for (const [dimension, sizeIndex] of [['width', 0], ['height', 1], ['depth', 2]]) {
        assert(Math.abs(footprint[dimension] - model.size[sizeIndex]) < 0.05, model.id + ': declared footprint must match visible geometry');
      }
    }
    assert.deepStrictEqual(errors, [], 'no browser exceptions constructing the complete catalog');
    return { name: 'landmarks', ok: true, lines: [models.length + ' sourced, grounded and centered real Cologne models; ' +
      models.reduce((sum, model) => sum + model.triangles, 0) + ' finite triangles checked'] };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
