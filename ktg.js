const { RiTa } = require("rita");

RiTa.SILENT = true;

const allowedRange = [0, 25];
const logMaxFrequency = 5000; // ms
let logStack = [];
let maxLogStack = 5;
let lastLogCall = 0;
function log(type, priority, data, igFreq = true) {
  if (priority < allowedRange[0] || priority > allowedRange[1]) return false;

  if (typeof data != "string") data = JSON.stringify(data, null, 2);

  function createMessage(type, data) {
    if (data.includes("\n"))
      return `[${type}] :: \n ${data}  \n  --- :: ${type} :: ---`;
    else return `[${type}] || ${data}`;
  }

  let message = createMessage(type, data);

  if (!igFreq) {
    let currentCall = performance.now ? performance.now() : Date.now();
    if (currentCall - lastLogCall < logMaxFrequency) {
      logStack.push(message);
      while (logStack.length > maxLogStack) logStack.shift();
      return true;
    } else {
      lastLogCall = currentCall;
      for (let i = 0; i < logStack.length; i++) {
        console.log(logStack[i]);
      }
      logStack = [];
      console.log(message);
      return true;
    }
  }

  console.log(message);
  return true;
}

class GA {
  constructor() {
    this.seed = Math.random();
    this.population = [];
    this.fittness = [];
    this.avgFittness = [0, 0, 0];
    this.specs = {};
    this.states = { generation: 0 };
    this.fns = {
      fittness: function () {
        log(
          "ga err",
          19,
          "Fittness fn not defined of ga, this is the heart of ga at least define this fn"
        );
        return [];
      },
    };
  }
  async step() {
    this.states.generation++;
    if (this.states.generation % 2 == 0)
      log(
        "ga info",
        2,
        `Generation: ${this.states.generation} avg fittness ${
          this.avgFittness[0] / this.avgFittness[1] || "N/A"
        }`
      );
    log("ga info", -1, "GA step started");
    this.evaluateFittness();
    this.orignalPopulation = this.population.length;
    await this.applyCrossOver();
    this.updateSpecs();
    log("ga info", -2, "GA step stopped");
    // console.log(this.population[0]);
  }

  evaluateFittness() {
    let r = this.fns.fittness(this.population);
    for (let i = 0; i < r.length; i++) {
      for (let j = 0; j < r[i].length; j++) {
        r[i][j] = -Math.log(Math.max(r[i][j], 1e-10)); // Avoid log(0)
        r[i][j] = this.shallowInverseGussionCurve(r[i][j]) * 25 + r[i][j] * 75;
      }
    }
    this.fittness = r;
    this.population = this.filterBadPopulation();
  }

  filterBadPopulation(fittness = this.fittness, population = this.population) {
    let points = [];
    for (let i = 0; i < fittness.length; i++) {
      // console.log(this.population[i]);
      let point = 0;
      for (let k = 0; k < fittness[i].length; k++) {
        for (let j = 0; j < fittness.length; j++) {
          if (i !== j) {
            point += fittness[i][k] - fittness[j][k]; // Compare against others
          }
        }
      }
      let score = -Math.log(Math.max(point, 1e-10));
      this.avgFittness[0] += score;
      this.avgFittness[1]++;
      points[i] = {
        score: score,
        ...population[i],
      }; // Avoid log(0)
    }
    return points
      .sort((a, b) => b.score - a.score)
      .slice(0, this.orignalPopulation); // Use slice to keep top N
  }

  shallowInverseGussionCurve(a) {
    let r = a - 0.5;
    r = -4 * r * r + 1;
    return r;
  }

  async applyCrossOver() {
    this.population.push(
      ...(await this.fns.mutators(
        this.population,
        this.filterBadPopulation.bind(this)
      ))
    );
  }

  updateSpecs() {
    this.specs.mutationRate = this.specs.mutationRate || 0.2;
    this.specs.crossoverRate = this.specs.crossoverRate || 0.8;
    log(
      "ga info",
      0,
      `Updated specs: mutationRate=${this.specs.mutationRate}, crossoverRate=${this.specs.crossoverRate}`
    );
  }

  init() {
    this.population = this.fns.spawners(this.seed, this.specs.populations);
  }

  async runGA(gens) {
    this.init();
    for (let i = 0; i < gens; i++) {
      await this.step();
      log("ga info", -2, "awaiting frame in ga");
      if (i % 25 === 0) {
        await new Promise((res) => {
          if (typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(res);
          } else {
            setTimeout(res, 3);
          }
        });
      }
    }
    return this.population;
  }
}

async function evolveGA(opts) {
  log("ga info", 1, "Evolving GA started");
  const ga = new GA();
  ga.specs = opts.specs;
  ga.fns.fittness = opts.fittness;
  ga.fns.spawners = opts.spawners;
  ga.fns.mutators = opts.mutators;
  const result = await ga.runGA(opts.specs.generations);
  log("ga info", 1, "Evolving GA ended");
  return result;
}

async function addPoeticLines(addLns, poemLns) {
  function measurePoetism(ln1, ln2) {
    if (Array.isArray(ln1)) ln1 = ln1.join(" ");
    if (Array.isArray(ln2)) ln2 = ln2.join(" ");
    let score = 0;
    if (RiTa.isRhyme(ln1.split(" ").pop(), ln2.split(" ").pop())) score += 0.5;
    let syl1 = RiTa.syllables(ln1).split("/").length;
    let syl2 = RiTa.syllables(ln2).split("/").length;
    score += 0.5 / (1 + Math.abs(syl1 - syl2));
    return score;
  }

  function semanticSimilarity(a, b) {
    if (Array.isArray(a)) a = a.join(" ");
    if (Array.isArray(b)) b = b.join(" ");
    // Simple heuristic: count common words
    const wordsA = new Set(a.toLowerCase().split(" "));
    const wordsB = new Set(b.toLowerCase().split(" "));
    const common = [...wordsA].filter((word) => wordsB.has(word)).length;
    return common / Math.max(wordsA.size, wordsB.size, 1);
  }

  function buildPoem(poemLns, addLns, positions) {
    let newPoem = [...poemLns];
    let sortedAdds = positions
      .map((pos, idx) => ({ pos, ln: addLns[idx].ln }))
      .sort((a, b) => a.pos - b.pos);
    let offset = 0;
    for (let add of sortedAdds) {
      newPoem.splice(add.pos + offset, 0, add.ln);
      offset++;
    }
    return newPoem;
  }

  function fittness(population) {
    let r = [];
    for (let i = 0; i < population.length; i++) {
      let config = population[i];
      let newPoem = buildPoem(poemLns, addLns, config.positions);
      let poetScore = 0;
      let semScore = 0;
      for (let j = 0; j < newPoem.length - 1; j++) {
        poetScore += measurePoetism(newPoem[j], newPoem[j + 1]);
        semScore += semanticSimilarity(newPoem[j], newPoem[j + 1]);
      }
      let avgPoet = poetScore / (newPoem.length - 1 || 1);
      let avgSem = semScore / (newPoem.length - 1 || 1);
      r[i] = [avgPoet, avgSem, Math.random(), Math.random()];
    }
    return r;
  }

  function spawners(seed, amount) {
    let r = [];
    for (let i = 0; i < amount; i++) {
      let positions = addLns.map(() =>
        Math.floor(Math.random() * (poemLns.length + 1))
      );
      r[i] = { positions };
    }
    return r;
  }

  function mutators(population, getTopNfn) {
    let newPop = [];
    for (let i = 0; i < population.length; i++) {
      let config = structuredClone(population[i]);
      for (let k = 0; k < config.positions.length; k++) {
        if (Math.random() < 0.2) {
          config.positions[k] = Math.floor(
            Math.random() * (poemLns.length + 1)
          );
        }
      }
      newPop.push(config);
    }
    return newPop;
  }

  let r = await evolveGA({
    specs: {
      populations: 5,
      generations: 55,
      objectives: 4,
      islands: 1,
    },
    fittness: fittness,
    spawners: spawners,
    mutators: mutators,
  });
  return buildPoem(poemLns, addLns, r[0].positions);
}

async function atamptRhymeLine(ln1, ln2, opts, recursionDepth = 0) {
  if (recursionDepth > 5) {
    log("ga err", 10, "Max recursion depth reached in atamptRhymeLine");
    return { success: false, newLns: [ln1, ln2] };
  }

  ln1 = ln1.join(" ");
  ln2 = ln2.join(" ");
  let substitutions = opts.substitutions || {};
  let getSemanticSimilarity =
    opts.semanticSimilarity || ((a, b) => semanticSimilarity(a, b));
  let substitutionGA = (function () {
    function applyAtRandSubstitutionLn(ln, pattern, replacement, reps) {
      let sI = 0;
      let possibles = [];
      for (let i = 0; i < ln.length; i++) {
        if (pattern === ln[i]) {
          possibles.push(i);
        }
      }
      let proberbility = reps / possibles.length;
      let totalApplies = 0;
      for (let i = 0; i < possibles.length; i++) {
        if (proberbility > Math.random() && totalApplies < reps) {
          totalApplies++;
          ln[possibles[i]] = replacement;
        }
      }
      return { success: totalApplies > 0, ln };
    }
    function applyRandSubstitution(ln1, ln2, maxSubs = 2, Prob = 0.25) {
      let subs = 0;
      let newLn1 = ln1;
      let newLn2 = ln2;
      for (const pattern in substitutions) {
        let replacement = substitutions[pattern];
        if (Math.random() >= Prob) {
          continue;
        }
        let r = applyAtRandSubstitutionLn(newLn1, pattern, replacement, 1);
        if (r.success) {
          subs++;
          newLn1 = r.ln;
        }
        if (subs >= maxSubs) break;
        if (Math.random() >= Prob) {
          continue;
        }
        r = applyAtRandSubstitutionLn(newLn2, pattern, replacement, 1);
        if (r.success) {
          subs++;
          newLn2 = r.ln;
        }
        if (subs >= maxSubs) break;
      }
      return [newLn1, newLn2];
    }
    function measurePoetism(ln1, ln2) {
      if (Array.isArray(ln1)) ln1 = ln1.join(" ");
      if (Array.isArray(ln2)) ln2 = ln2.join(" ");
      let score = 0;
      if (RiTa.isRhyme(ln1.split(" ").pop(), ln2.split(" ").pop()))
        score += 0.5;
      let syl1 = RiTa.syllables(ln1).split("/").length;
      let syl2 = RiTa.syllables(ln2).split("/").length;
      score += 0.5 / (1 + Math.abs(syl1 - syl2));
      return score;
    }
    function semanticSimilarity(a, b) {
      if (Array.isArray(a)) a = a.join(" ");
      if (Array.isArray(b)) b = b.join(" ");
      const wordsA = new Set(a.toLowerCase().split(" "));
      const wordsB = new Set(b.toLowerCase().split(" "));
      const common = [...wordsA].filter((word) => wordsB.has(word)).length;
      return common / Math.max(wordsA.size, wordsB.size, 1);
    }
    function fittness(lnsSetARR) {
      let r = [];
      for (let i = 0; i < lnsSetARR.length; i++) {
        let lnsSet = lnsSetARR[i];
        r[i] = [
          measurePoetism(lnsSet.ln1, lnsSet.ln2),
          semanticSimilarity(ln1, lnsSet.ln1),
          semanticSimilarity(ln2, lnsSet.ln2),
          semanticSimilarity(`${ln1}\n${ln2}`, `${lnsSet.ln1}\n${lnsSet.ln2}`),
        ];
      }
      return r;
    }
    function spawners(seed, amount) {
      let r = [];
      for (let i = 0; i < amount; i++) {
        let [newLn1, newLn2] = applyRandSubstitution(
          ln1.split(" "),
          ln2.split(" "),
          2,
          0.25
        );
        r[i] = {
          ln1: newLn1,
          ln2: newLn2,
        };
      }
      return r;
    }
    function getDescriteIndexd(continuesIndex, arr, resolution) {
      return (
        Math.floor(continuesIndex * (arr.length - 1) * resolution) % arr.length
      );
    }

    let formUpdateEffectivenessGredientMapMutator =
      opts.effectiveMapOfLines ||
      ((tokens) => tokens.map((_, idx) => (idx + 1) / tokens.length));

    function applyRandIndexControledSubstitution(
      tokens,
      vocabulary,
      proberbilities,
      selectedIndex
    ) {
      selectedIndex = Math.floor(selectedIndex) % tokens.length;
      const randIdx = Math.floor(Math.random() * vocabulary.length);
      return vocabulary[randIdx];
    }

    async function mutators(lnsSetArr, getTopNfn, maxRep = 3) {
      let totalOrignalPopulation = lnsSetArr.length;
      let possibleLines = [[], []];
      for (let i = 0; i < lnsSetArr.length; i++) {
        let tokenized = [
          RiTa.tokenize(
            lnsSetArr[i].ln1.join
              ? lnsSetArr[i].ln1.join(" ")
              : lnsSetArr[i].ln1
          ),
          RiTa.tokenize(
            lnsSetArr[i].ln2.join
              ? lnsSetArr[i].ln2.join(" ")
              : lnsSetArr[i].ln2
          ),
        ];
        const updateEffectivenessGredient = [
          formUpdateEffectivenessGredientMapMutator(tokenized[0]),
          formUpdateEffectivenessGredientMapMutator(tokenized[1]),
        ];
        let newTokenized = [
          structuredClone(tokenized[0]),
          structuredClone(tokenized[1]),
        ];
        let proberbilityMutate = [
          maxRep / newTokenized[0].length,
          maxRep / newTokenized[1].length,
        ];
        const GlobalResolution =
          (((proberbilityMutate[0] + proberbilityMutate[1]) / 2 + 1) *
            (newTokenized[0].length + newTokenized[1].length)) /
          2;
        const linesResolution = [
          GlobalResolution * 0.852 + newTokenized[0].length * 0.13,
          GlobalResolution * 0.852 + newTokenized[1].length * 0.13,
        ];
        const maxSteps = [
          2.5 * newTokenized[0].length,
          2.5 * newTokenized[1].length,
        ];
        let prevActualResolution = 0;
        let remainingS = 0;
        let totalStepsDone = 0;
        let actualResolutionS = 0;

        let allEffectiveNessGredients = [
          ...new Set([
            ...updateEffectivenessGredient[0],
            ...updateEffectivenessGredient[1],
          ]),
        ];

        let allTokness = [...new Set([...newTokenized[1], ...newTokenized[0]])];

        for (let lineIndex = 0; lineIndex <= 1; lineIndex++) {
          for (let j = 0; j < newTokenized[lineIndex].length; j += 0) {
            totalStepsDone++;
            if (totalStepsDone >= maxSteps[lineIndex]) break;
            let actualResolution =
              linesResolution[lineIndex] /
              updateEffectivenessGredient[lineIndex][
                getDescriteIndexd(
                  j,
                  newTokenized[lineIndex].length,
                  prevActualResolution
                )
              ];
            actualResolutionS += actualResolution;
            const actualResolutionAVG = actualResolutionS / totalStepsDone;
            let remaining =
              (remainingS / totalStepsDone +
                actualResolutionAVG * newTokenized[lineIndex]) /
              2;

            remainingS += remaining;

            let requiredStepsPrediction = actualResolutionAVG * remaining;
            if (requiredStepsPrediction > maxSteps[0]) {
              actualResolutionAVG =
                (maxSteps[lineIndex] - requiredStepsPrediction) / remaining;
            }
            j += actualResolution;
            prevActualResolution = actualResolution;
            if (
              Math.random() *
                (1 +
                  updateEffectivenessGredient[lineIndex][
                    getDescriteIndexd(
                      j,
                      updateEffectivenessGredient[lineIndex],
                      actualResolution
                    )
                  ]) >
              proberbilityMutate
            ) {
              let newToken = applyRandIndexControledSubstitution(
                newTokenized[lineIndex],
                allTokness,
                allEffectiveNessGredients,
                getDescriteIndexd(j, newTokenized[lineIndex], actualResolution)
              );
              let insertIdx = Math.floor(
                getDescriteIndexd(j, newTokenized[lineIndex], actualResolution)
              );
              newTokenized[lineIndex].splice(insertIdx, 0, newToken);
            }

            possibleLines[lineIndex].push(...newTokenized);
          }
        }
      }
      let PossibleCoherentGroup = [];
      for (
        let i = 0;
        i < Math.min(possibleLines[0].length, possibleLines[1].length);
        i++
      ) {
        PossibleCoherentGroup[i] = {
          ln1: possibleLines[0][i],
          ln2: possibleLines[1][i],
        };
      }
      // Run a lightweight sub-GA
      let subr = await evolveGA({
        specs: {
          generations: 5,
          populations: 50,
          objectives: 4,
          islands: 1,
        },
        fittness: fittness,
        spawners: function () {
          return structuredClone(PossibleCoherentGroup);
        },
        mutators: function (groupsArr) {
          let r = [];
          for (let i = 0; i < groupsArr.length; i++) {
            let newLn1 = structuredClone(groupsArr[i].ln1);
            let newLn2 = structuredClone(groupsArr[i].ln2);
            if (Math.random() < 0.2) {
              let idx1 = Math.floor(Math.random() * newLn1.length);
              let idx2 = Math.floor(Math.random() * newLn2.length);
              let vocab = [...new Set([...newLn1, ...newLn2])];
              if (vocab.length > 0) {
                newLn1[idx1] = vocab[Math.floor(Math.random() * vocab.length)];
                newLn2[idx2] = vocab[Math.floor(Math.random() * vocab.length)];
              }
            }
            r.push({
              ln1: newLn1,
              ln2: newLn2,
            });
          }
          return r;
        },
      });
      PossibleCoherentGroup.push(...subr);
      let bestFittnesses = [];
      for (let i = 0; i < PossibleCoherentGroup.length; i++) {
        bestFittnesses[i] = fittness([PossibleCoherentGroup[i]])[0];
      }
      return getTopNfn(
        bestFittnesses,
        PossibleCoherentGroup,
        totalOrignalPopulation
      );
    }
    return {
      fittness: fittness,
      spawners: spawners,
      mutators: mutators,
    };
  })();
  let result = await evolveGA({
    specs: {
      generations: 5,
      populations: 100,
      objectives: 4,
      islands: 1,
      ...opts.substitutionsGAspecs,
    },
    fittness: substitutionGA.fittness,
    spawners: substitutionGA.spawners,
    mutators: substitutionGA.mutators,
  });
  let best = result[0];
  let newLns = [best.ln1, best.ln2];
  let success = RiTa.isRhyme(
    newLns[0].join(" ").split(" ").pop(),
    newLns[1].join(" ").split(" ").pop()
  );
  if (!success) {
    return atamptRhymeLine(newLns[0], newLns[1], opts, recursionDepth + 1);
  }
  return { success, newLns };
}

async function generatePoem(
  poemLns,
  opts = {},
  lastInstanceHLI = null,
  depth = 0
) {
  if (depth > 10) {
    console.warn("Maximum recursion depth reached in generatePoem");
    return poemLns;
  }
  let storg = {
    holdedLines: [],
  };
  let schematicOfRhyme = [1, 1];
  let rPoemLns = poemLns.map((line) => RiTa.tokenize(line.join(" ")));
  // console.log(rPoemLns);
  let newPoemLns = [];
  for (let i = 0; i < poemLns.length; i++) {
    if (i + schematicOfRhyme[i] >= poemLns.length) continue;
    let rhymeWrd = rPoemLns[i].pop();
    let nextRhymeWrd = rPoemLns[i + schematicOfRhyme[i]].pop();
    if (!RiTa.isRhyme(rhymeWrd, nextRhymeWrd)) {
      let rhymedLns = await atamptRhymeLine(
        poemLns[i],
        poemLns[i + schematicOfRhyme[i]],
        opts
      );
      // console.log(rhymedLns);
      if (Math.random() > 0.75)
        rhymedLns.success =
          rhymedLns.success &&
          RiTa.isRhyme(
            rhymedLns.newLns[0][rhymedLns.newLns[0].length - 1],
            rhymedLns.newLns[1][rhymedLns.newLns[1].length - 1]
          );
      if (!rhymedLns.success) {
        // console.log(rhymedLns);
        // console.log(storg.holdedLines);
        storg.holdedLines.push({
          ln: poemLns[i],
          matched: poemLns[i + schematicOfRhyme[i]],
          index: i,
          matchedIndex: i + schematicOfRhyme[i],
          rln: rPoemLns[i],
          rmatched: rPoemLns[i + schematicOfRhyme[i]],
        });

        // console.log(storg.holdedLines);
        // continue;
      }
      poemLns[i] = rhymedLns.newLns[0];
      poemLns[i + schematicOfRhyme[i]] = rhymedLns.newLns[1];
      rPoemLns[i] = RiTa.tokenize(poemLns[i].join(" "));
      rPoemLns[i + schematicOfRhyme[i]] = RiTa.tokenize(
        poemLns[i + schematicOfRhyme[i]].join(" ")
      );
    }
    newPoemLns[i] = [...poemLns[i]];
  }
  if (storg.holdedLines.length > 0) {
    if (JSON.stringify(storg.holdedLines) === JSON.stringify(lastInstanceHLI)) {
      console.warn(
        "Poem unable to be generated without mistakes, unable to remove same mistakes",
        storg.holdedLines,
        lastInstanceHLI
      );
      return newPoemLns;
    } else {
      log(
        "poem generation info",
        3,
        "Refining mistake from previous atampts of poem generation"
      );
      newPoemLns = await addPoeticLines(storg.holdedLines, newPoemLns);
      return generatePoem(newPoemLns, opts, storg.holdedLines, depth + 1);
    }
  }
  return newPoemLns;
}

async function main() {
  const poem = await generatePoem(
    [
      ["He", "gave", "us", "independence"],
      ["Who", "made", "us", "servents", "of", "goverment"],
    ],
    {
      substitutions: {
        independence: "freedom",
        goverment: "nation",
        servents: "servants",
      },
    }
  );
  console.log("Generated Poem:");
  // console.log(poem);
  console.log(poem.map((line) => line.join(" ")).join("\n"));
}

main();
