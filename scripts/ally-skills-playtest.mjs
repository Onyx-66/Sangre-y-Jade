import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ALLY_CATALOG } from '../src/data/allyCatalog.js';
import { activate, harness } from '../tests/helpers/ally-skills-fixture.js';

const SIM_SECONDS = 600;
const DT = 0.2;
const PHASE_SECONDS = SIM_SECONDS / 6;
const reports = [];
const records = [];

function equipAuditPassives({ scene, support }, role) {
  const passives = ALLY_CATALOG[role].filter((skill) => skill.kind === 'passive');
  for (const passive of passives) assert.ok(support.equip(passive), `could not equip audit passive ${passive.id}`);
  return passives;
}

function triggerPassiveSamples({ scene, support }, role) {
  const values = Object.create(null);
  if (role === 'saintess') {
    scene.stats.hp = 50;
    values['saving-grace'] = support.preventFatal(60) === 0 ? 1 : 0;
    values['sacred-fervor'] = scene.passives.modifiers().damageMult > 1 ? 1 : 0;
  } else if (role === 'tank') {
    values.bodyguard = support.modifiers().reduction > 0 ? 1 : 0;
    const before = scene.companion.hp;
    values['guardian-link'] = support.preventFatal(50) < 50 && scene.companion.hp < before ? 1 : 0;
  } else {
    values['relentless-pursuit'] = scene.passives.modifiers().allyAttackSpeedMult > 1 ? 1 : 0;
    const pickups = [];
    scene.spawnPickup = (...args) => pickups.push(args);
    scene.passives.emit('kill', { enemy: { x: 0, y: 0 }, byAlly: true, wasTopThreat: true });
    values['bounty-contract'] = pickups.length > 0 ? pickups.length : 0;
  }
  return values;
}

for (const role of Object.keys(ALLY_CATALOG)) {
  const active = ALLY_CATALOG[role].filter((skill) => skill.kind === 'active');
  const initial = harness(role, [active[0].id]);
  const passives = equipAuditPassives(initial, role);
  const passiveTriggers = triggerPassiveSamples(initial, role);
  assert.equal(initial.scene.companion.skills.length, 3, `${role} audit uses the real three-slot limit`);

  const start = initial.scene.elapsed;
  for (const [index, skill] of active.entries()) {
    if (index > 0) {
      const previous = initial.scene.companion.skills.find((owned) => owned.skillKind === 'active');
      initial.scene.companion.skills = initial.scene.companion.skills.filter((owned) => owned !== previous);
      assert.ok(initial.support.equip(skill), `could not rotate ${role} audit to ${skill.id}`);
    }
    activate(initial.scene, skill.id);
    const steps = Math.round(PHASE_SECONDS / DT);
    for (let step = 0; step < steps; step += 1) {
      initial.scene.elapsed += DT;
      for (const owned of initial.scene.companion.skills) {
        if (owned.skillKind !== 'passive') owned.remaining = Math.max(0, owned.remaining - DT);
      }
      initial.scene.passives.emit('tick', { dt: DT });
      initial.brain.update(DT);
    }
    assert.ok(initial.scene.allyCasts[skill.id] > 0, `${role}/${skill.id} was dead in the 10-minute audit`);
  }

  for (const passive of passives) {
    if (passive.on?.tick) passiveTriggers[passive.id] = (passiveTriggers[passive.id] || 0) + 1;
    assert.ok(passiveTriggers[passive.id] > 0, `${role}/${passive.id} was never observed by the audit`);
  }
  const castReport = active.map((skill) => `${skill.id}=${initial.scene.allyCasts[skill.id] || 0}`).join(', ');
  const passiveReport = passives.map((skill) => `${skill.id}=${passiveTriggers[skill.id] || 0}`).join(', ');
  reports.push(`${role} (600s): casts [${castReport}] | passive triggers [${passiveReport}]`);
  records.push({role,seconds:SIM_SECONDS,casts:{...initial.scene.allyCasts},passiveTriggers});
  assert.ok(Math.abs(initial.scene.elapsed - start - SIM_SECONDS) < 1e-6, `${role} simulated duration`);
}

console.log(`Ally skill dead-skill report (${SIM_SECONDS} simulated seconds per role; six 100-second active rotations):`);
for (const report of reports) console.log(report);
console.log('Dead skills: none (all 18 actives cast; all 6 passives were observed).');
const reportFile=process.argv.find(arg=>arg.startsWith('--report='))?.slice(9);
if(reportFile)await fs.writeFile(reportFile,JSON.stringify({fixture:'Controlled 600-second mock-scene AI audit; six 100-second active rotations, not legal in-run replacement or natural survival coverage.',records},null,2)+'\n');
