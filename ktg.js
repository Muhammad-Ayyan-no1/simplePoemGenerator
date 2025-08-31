const { act } = require("react");

async function evolveGA(opts) {}

async function addPoeticLines(addLns, poemLns) {
  function fittness() {}
  // each line can be added before/after any other line  we encourge similar semantic lns to be added with similar semantic ls
  // we also want it to remain poetic
  let r = await evolveGA({
    specs: {
      populations: 250,
      generations: 55,
      objectives: 4,
      islands: 1,
    },
    fittness: fittness,
  });
}

async function atamptRhymeLine(ln1, ln2, opts) {
  ln1 = ln1.join(" ");
  ln2 = ln2.join(" ");
  let substitutions = opts.substitutions;
  let getSemanticSimilarity = opts.semanticSimilarity;
  let substitutionGA = (function () {
    function applyAtRandSubstitutionLn(ln, subs, reps) {
      let sI = 0;
      let possibles = [];
      for (let i = 0; i < ln.length; i++) {
        if (subs[sI] === ln[i]) {
          sI++;
        } else if (sI > subs.length - 1) {
          possibles.push([i, i - sI]);
        } else {
          sI = 0;
        }
      }
      // its proberbilistic not 100% acurate
      let proberbility = reps / possibles.length;
      let totalApplies = 0;
      for (let i = 0; i < possibles.length; i++) {
        if (proberbility > Math.random() && totalApplies < reps) {
          totalApplies++;
          let relJ = 0;
          for (let j = possibles[i][0]; j < possibles[i][1]; j++) {
            ln[j] = subs[relJ];
            relJ++;
          }
        }
      }
      return ln;
    }
    function applyRandSubstitution(ln1, ln2, maxSubs = 2, Prob = 0.25) {
      let subs = 0;
      let newLn1 = ln1;
      let newLn2 = ln2;
      for (const subs in substitutions) {
        if (Math.random() >= Prob) {
          let r = applyAtRandSubstitutionLn(newLn1, subs);
          if (r.success) {
            subs++;
            newLn1 = r.ln;
          }
        }
        if (Math.random() >= Prob) {
          let r = applyAtRandSubstitutionLn(newLn2, subs);
          if (r.success) {
            subs++;
            newLn2 = r.ln;
          }
        }
        if (subs >= maxSubs) break;
      }
      return [newLn1, newLn2];
    }
    // how well two lns rythm + rhyme and soo on
    function measurePoetism(ln1, ln2) {
      // we are dependent ofn RiTa for this fn
    }
    function semanticSimilarity(a, b) {
      let s = getSemanticSimilarity(a, b);
      return s;
    }
    function fittness(lnsSetARR) {
      let r = [];
      for (let i = 0; i < lnsSetARR.length; i++) {
        let lnsSet = lnsSetARR[i];
        // ga is multi objective, dynamic fittness confidence / weight based    (its a self implemented for this project idk a technical name)
        r[i] = [
          [measurePoetism(lnsSet.ln1, lnsSet.ln2), 0.95],
          [semanticSimilarity(ln1, lnsSet.ln1), 0.85],
          [semanticSimilarity(ln2, lnsSet.ln2), 0.85],
          [
            semanticSimilarity(
              `${ln1}
${ln2}`,
              `${lnsSet.ln1}
${lnsSet.ln2}`
            ),
            0.65,
          ],
        ];
      }
      return r;
    }
    function spawners(seed, amount) {
      let r = [];
      for (let i = 0; i < amount.length; i++) {
        r[i] = {
          ln1: applyRandSubstitution(ln1),
          ln2: applyRandSubstitution(ln2),
        };
      }
    }
    function getDescriteIndexd(continuesIndex, arr, resolution) {
      return continuesIndex * (arr.length - 1) * resolution;
    }

    //KNN type system to just predict the slope of fittness on each word  contains same complex math like mutators
    function formUpdateEffectivenessGredientMapMutator() {}

    function applyRandIndexControledSubstitution(
      tokens,
      vocabulary,
      proberbilities,
      selectedIndex
    ) {}

    // for N population it also grows it to 4*NM (M = avg line length)  and keeps only N   by shallow inverse guassion curve on fittness aproximation (subGA)
    // this is a beast of a mutator   has 2 subGAs  to make the best mutations
    // yes i should just inject to main ga  but this way on average our result is better (this is because we have population limit making our main ga saturated elsewise)
    async function mutators(lnsSetArr, getTopNfn, maxRep = 3) {
      let totalOrignalPopulation = lnsSetArr.length;
      let possibleLines = [[], []]; // a subGA will be runned to combine ln1,ln2 for best result, however yes these are correct in corresspondence
      // the generation of possibleLines
      for (let i = 0; i < lnsSetArr.length; i++) {
        let tokenized = [
          defaultTokenizer(lnsSetArr[i].ln1),
          defaultTokenizer(lnsSetArr[i].ln2),
        ];
        const updateEffectivenessGredient = [
          formUpdateEffectivenessGredientMapMutator(tokenized[0]),
          formUpdateEffectivenessGredientMapMutator(tokenized[1]),
        ];
        let newTokenized = [
          structuredClone(tokenized[0]),
          structuredClone(tokenized[1]),
        ]; // ln1,ln2
        let proberbilityMutate = [
          rep / newTokenized[0].length,
          rep / newTokenized[1].length,
        ];
        //  average of mutation proberbilities weighted as increase (+1) to the average of the length of arrays is our resolution
        const GlobalResolution =
          (((proberbilityMutate[0] + proberbilityMutate[1]) / 2 + 1) *
            (newTokenized[0].length + newTokenized[1].length)) /
          2;
        // globRes * a + len * b                more the a-b    less will be diverse generations but more it will be rhymed (convergence)
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

            // adjustment so it caps at a limit of steps to apply
            // its just a linear history interpolation averaged to actuall non linear result every itteration
            let requiredStepsPrediction = actualResolutionAVG * remaining;
            if (requiredStepsPrediction > maxSteps[0]) {
              // we just cap it to maximum we can get  minus the errorRate of our prediction on average  (error rate is a //TODO )
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
              newTokenized[lineIndex].push(
                applyRandIndexControledSubstitution(
                  newTokenized[lineIndex],
                  allTokness,

                  allEffectiveNessGredients,

                  getDescriteIndexd(
                    j,
                    newTokenized[lineIndex],
                    actualResolution
                  )
                )
              );
            }

            possibleLines[lineIndex].push(...newTokenized);
          }
        }
      }
      // formation of possible coherent groups (canidates)
      let PossibleCoherentGroup = [];
      // conventional relative indexes
      for (let i = 0; i < possibleLines[0].length; i++) {
        PossibleCoherentGroup[i] = {
          ln1: possibleLines[0][i],
          ln2: possibleLines[1][i],
        };
      }
      // exploration of random other coherent groups (subGA)
      let r = await evolveGA({
        specs: {
          generations: 55,
          populations: 25,
          objectives: 4,
          islands: 1,
        },
        fittness: fittnessAproximationLive,
        spawners: function () {
          return PossibleCoherentGroup;
        },
        mutators: function (groupsArr) {
          let r = [];
          for (let i = 0; i < groupsArr.length; i++) {
            r.push({
              ln1: groupsArr[i][0],
              ln2: groupsArr[i][1],
            });
            r.push({
              ln1: groupsArr[i][1],
              ln2: groupsArr[i][0],
            });
          }
          return r;
        },
      });
      PossibleCoherentGroup.push(r.finalPopulation);

      // eliminating rest of the PossibleCoherentGroup to get as many population as in orignal
      // TODO we can use another smaller GA this time muattor just returns the nearest worded other group instead of brute force
      // Pareto Dominace stuff
      let bestFittnesses = [];
      for (let i = 0; i < PossibleCoherentGroup.length; i++) {
        bestFittnesses[i] = fittnessAproximationLive(PossibleCoherentGroup[i]);
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
  evolveGA({
    specs: {
      generations: 1500,
      populations: 150,
      objectives: 4,
      islands: 1, // this feature is todo currently btw  (multi threading)
      ...opts.substitutionsGAspecs,
    },
    fittness: substitutionGA.fittness,
    spawners: substitutionGA.spawners,
    mutators: substitutionGA.mutators,
  });
}

function generatePoem(poemLns, opts, lastInstanceHLI) {
  let storg = {
    holdedLines: [],
  };
  let schematicOfRhyme = [1, 1];
  let rPoemLns = poemLns.forEach((le) => {
    return RiTa.tokenize(poemLns.join(" "));
  });
  let newPoemLns = [];
  for (let i = 0; i < poemLns.length; i++) {
    let rhymeWrd = rPoemLns[i].pop();
    let nextRhymeWrd = rPoemLns[i + schematicOfRhyme[i]].pop();
    if (!RiTa.isRhyme(rhymeWrd, nextRhymeWrd)) {
      let rhymedLns = atamptRhymeLine(
        poemLns[i],
        poemLns[i + schematicOfRhyme[i]],
        opts
      );
      if (!rhymedLns.success) {
        storg.holdedLines.push({
          ln: poemLns[i],
          matched: poemLns[i + schematicOfRhyme[i]],
          index: i,
          matchedIndex: i + schematicOfRhyme[i],
          rln: rPoemLns[i],
          rmatched: rPoemLns[i + schematicOfRhyme[i]],
        });
        continue;
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
    // TODO handel times when we have bi or N stabilities instea of uni stability of mistakes
    if (storg.holdedLines == lastInstanceHLI) {
      console.warn(
        "Poem unable to be generated without mistakes, unable to remove same mistakes",
        storg.holdedLines,
        lastInstanceHLI
      );
    } else {
      newPoemLns = addPoeticLines(storg.holdedLines, newPoemLns);
      return generatePoem(poemLns, opts, storg.holdedLines); // we recursively improve poem   however we keep track that we dont get same mistakes over and over again
    }
  }
  return newPoemLns;
}

console.log(
  generatePoem([
    ["js", "javascript", "typeless"],
    ["being", "a", "mess"],
  ])
);
