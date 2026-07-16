import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadYamlFile } from '../lib/yaml-load.mjs';
import { EVALS_DIR } from '../lib/paths.mjs';
import { planRun, scoreRouting } from '../lib/planner.mjs';

const fixtures = loadYamlFile(path.join(EVALS_DIR, 'routing-cases.yaml'));

describe('deterministic routing fixtures', () => {
  const scores = [];

  for (const c of fixtures.cases) {
    it(`routes: ${c.id}`, () => {
      const plan = planRun({ files: c.changedFiles });
      const actual = plan.activatedAgents.map((a) => a.id);
      const expected = c.expectedAgents;

      for (const id of expected) {
        assert.ok(actual.includes(id), `${c.id}: expected agent ${id}, got [${actual.join(', ')}]`);
      }
      for (const id of c.excludedAgents || []) {
        assert.ok(!actual.includes(id), `${c.id}: excluded agent ${id} was activated`);
      }

      // quality always last in execution order among activated
      const orderAgents = plan.executionOrder.map((tid) => {
        const t = plan.tasks.find((x) => x.id === tid);
        return t?.agent;
      });
      const lastQuality = orderAgents.lastIndexOf('quality');
      assert.equal(lastQuality, orderAgents.length - 1, `${c.id}: quality must be last`);

      if (c.expectedOrderTail) {
        const tail = c.expectedOrderTail;
        // testing before quality when both present
        if (tail.includes('testing') && actual.includes('testing')) {
          const ti = orderAgents.indexOf('testing');
          const qi = orderAgents.indexOf('quality');
          assert.ok(ti < qi, `${c.id}: testing before quality`);
        }
      }

      if (c.expectedRisk) {
        assert.equal(plan.riskClassification.level, c.expectedRisk, `${c.id}: risk`);
      }
      if (c.expectedPattern) {
        assert.equal(plan.orchestrationPattern, c.expectedPattern, `${c.id}: pattern`);
      }
      if (c.expectSplit) {
        assert.equal(plan.splitRecommendation.recommend, true, `${c.id}: expected split`);
      }

      scores.push(scoreRouting(expected, actual));
    });
  }

  it('reports aggregate precision/recall', () => {
    // recompute across all cases
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const c of fixtures.cases) {
      const plan = planRun({ files: c.changedFiles });
      const s = scoreRouting(
        c.expectedAgents,
        plan.activatedAgents.map((a) => a.id),
      );
      tp += s.tp;
      fp += s.fp;
      fn += s.fn;
    }
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const f1 = (2 * precision * recall) / (precision + recall);
    console.log(
      JSON.stringify(
        {
          cases: fixtures.cases.length,
          precision: Number(precision.toFixed(4)),
          recall: Number(recall.toFixed(4)),
          f1: Number(f1.toFixed(4)),
          tp,
          fp,
          fn,
        },
        null,
        2,
      ),
    );
    assert.ok(precision >= 0.75, `precision ${precision} < 0.75`);
    assert.ok(recall >= 0.85, `recall ${recall} < 0.85`);
  });
});
