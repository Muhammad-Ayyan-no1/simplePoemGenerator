// central manager for knowledge items and proving
class CentralKnowledgeItemManager {
  constructor(config = {}) {
    this.saturationLevel = config.saturationLevel || 0.3; // fictional to non-fictional ratio
    this.maxKILimit = config.maxKILimit || 1000;
    this.externalProofFn = config.externalProofFn || null;
    this.allKIs = new Map();
    this.proofCache = new Map();
    this.iterationCount = 0;
  }

  registerKI(ki) {
    this.allKIs.set(ki.id, ki);
  }

  cleanupFictionalLeafs() {
    let removed = 0;
    for (let [id, ki] of this.allKIs) {
      if (ki.fictional && ki.children.length === 0) {
        this.allKIs.delete(id);
        removed++;
      }
    }
    return removed;
  }

  async requestExternalProof(statement) {
    if (!this.externalProofFn) return null;
    let cacheKey = JSON.stringify(statement);
    if (this.proofCache.has(cacheKey)) {
      return this.proofCache.get(cacheKey);
    }
    let proof = await this.externalProofFn(statement);
    this.proofCache.set(cacheKey, proof);
    return proof;
  }

  filterFictional() {
    this.iterationCount++;
    if (this.iterationCount % 10 === 0) {
      let currentRatio = this.getFictionalRatio();
      if (currentRatio > this.saturationLevel) {
        this.cleanupFictionalLeafs();
      }
    }
  }

  getFictionalRatio() {
    let fictional = 0;
    let total = this.allKIs.size;
    for (let ki of this.allKIs.values()) {
      if (ki.fictional) fictional++;
    }
    return total > 0 ? fictional / total : 0;
  }
}

class knowledgeItem {
  constructor(manager = null) {
    this.triplet = [];
    this.parents = [];
    this.children = [];
    this.id = Math.random().toString();
    this.name = "___default___";
    this.NOTtype = false;
    this.historyKI = {};
    this._cache = new Map();
    this._transitiveCacheHit = 0;
    this._transitiveCacheMiss = 0;

    // probabilistic system
    this.probability = 1.0; // confidence in this knowledge
    this.ambiguous = false; // has multiple possible interpretations
    this.fictional = false; // proven false but kept for creativity
    this.ambiguitySet = []; // other possible interpretations
    this.proofStatus = "unknown"; // unknown, proven, disproven, hypothetical
    this.manager = manager;

    if (this.manager) {
      this.manager.registerKI(this);
    }
  }

  combineKI(KI) {
    if (this.historyKI[KI.id] == 0) {
      let newID = "NOT___" + KI.id;
      if (this.historyKI[newID] >= 1) {
        console.info(
          "The knowledge item was already combined skipping it,    the knowledge tree might be saturated",
          KI,
          this,
          newID,
          KI.id
        );
        return;
      }
      let newKI = new knowledgeItem(this.manager);
      newKI.import(KI.export());
      newKI.NOTtype = !KI.NOTtype;
      newKI.id = newID;
      return this.combineKI(newKI);
    }

    let expanded = this._expandTwoKI(KI, this);
    if (expanded != false) {
      this.historyKI[KI.id] = 1;
    } else {
      this.historyKI[KI.id] = 2;
      return [];
    }

    let r = [];
    for (let i = 0; i < expanded.length; i++) {
      r[i] = new knowledgeItem(this.manager);
      r[i].triplet = expanded[i].triplet;
      r[i].parents = [this, KI];
      r[i].NOTtype = expanded[i].NOTtype;
      r[i].id = this._generateCombinedId(this.id, KI.id, i);
      r[i].name = this._generateInferredName(expanded[i].triplet);
      r[i].probability = this._calculateCombinedProbability(
        this,
        KI,
        expanded[i]
      );
      r[i].ambiguous = expanded[i].ambiguous || false;
      r[i].ambiguitySet = expanded[i].ambiguitySet || [];

      // add as child to parents
      this.children.push(r[i]);
      KI.children.push(r[i]);

      if (this.manager) {
        this.manager.filterFictional();
      }
    }
    return r;
  }

  _transitiveExpantionTriplets(t1, t2) {
    let cacheKey = JSON.stringify([t1, t2]);
    if (this._cache.has(cacheKey)) {
      this._transitiveCacheHit++;
      return this._cache.get(cacheKey);
    }

    let results = [];

    // A is letter, letter are alphabets -> A is/are alphabets (with ambiguity)
    if (t1[2] == t2[0]) {
      // create ambiguous predicates
      let ambiguousPredicates = this._combinePredicates(t1[1], t2[1]);
      for (let pred of ambiguousPredicates) {
        results.push({
          triplet: [t1[0], pred.predicate, t2[2]],
          ambiguous: pred.ambiguous,
          ambiguitySet: pred.alternatives,
          probability: pred.probability,
        });
      }
    }

    // reverse transitive with ambiguity
    if (t1[0] == t2[2]) {
      let ambiguousPredicates = this._combinePredicates(t2[1], t1[1]);
      for (let pred of ambiguousPredicates) {
        results.push({
          triplet: [t2[0], pred.predicate, t1[2]],
          ambiguous: pred.ambiguous,
          ambiguitySet: pred.alternatives,
          probability: pred.probability,
        });
      }
    }

    this._cache.set(cacheKey, results);
    this._transitiveCacheMiss++;
    return results;
  }

  _combinePredicates(pred1, pred2) {
    // probabilistic predicate combination
    let combinations = [
      {
        predicate: `${pred1}/${pred2}`,
        ambiguous: true,
        alternatives: [pred1, pred2],
        probability: 0.8,
      },
      {
        predicate: pred1,
        ambiguous: true,
        alternatives: [`${pred1}/${pred2}`, pred2],
        probability: 0.6,
      },
      {
        predicate: pred2,
        ambiguous: true,
        alternatives: [pred1, `${pred1}/${pred2}`],
        probability: 0.6,
      },
    ];
    return combinations;
  }

  _expandTwoKI(KI1, KI2) {
    let PossibleTriplets = [];

    if (KI1.triplet.length > 0 && KI2.triplet.length > 0) {
      let transitives = this._transitiveExpantionTriplets(
        KI1.triplet,
        KI2.triplet
      );
      for (let t of transitives) {
        PossibleTriplets.push({
          triplet: t.triplet,
          NOTtype: KI1.NOTtype || KI2.NOTtype,
          ambiguous: t.ambiguous,
          ambiguitySet: t.ambiguitySet,
          probability: t.probability,
        });
      }
    }

    // contradiction handling with probabilistic resolution
    if (KI1.NOTtype !== KI2.NOTtype) {
      if (this._areTripletsSimilar(KI1.triplet, KI2.triplet)) {
        // create hypothetical scenarios instead of hard rejection
        PossibleTriplets.push({
          triplet: KI1.triplet,
          NOTtype: false,
          ambiguous: true,
          ambiguitySet: [KI2.triplet],
          probability: 0.5,
          proofStatus: "hypothetical",
        });
        return PossibleTriplets;
      }
    }

    return PossibleTriplets.length > 0 ? PossibleTriplets : false;
  }

  _calculateCombinedProbability(ki1, ki2, expanded) {
    let baseProbability = ki1.probability * ki2.probability;
    if (expanded.ambiguous) {
      baseProbability *= 0.7; // reduce confidence for ambiguous results
    }
    return Math.max(0.1, Math.min(1.0, baseProbability));
  }

  async proveStatement(method = "external") {
    if (this.proofStatus === "proven" || this.proofStatus === "disproven") {
      return this.proofStatus;
    }

    switch (method) {
      case "external":
        return await this._externalProof();
      case "graph":
        return this._graphProof();
      case "edge":
        return this._edgeDetectionProof();
      default:
        return "unknown";
    }
  }

  async _externalProof() {
    if (!this.manager) return "unknown";
    let proof = await this.manager.requestExternalProof(this.triplet);
    if (proof === null) return "unknown";

    this.proofStatus = proof.isTrue ? "proven" : "disproven";
    if (!proof.isTrue) {
      this.fictional = true;
      this.probability = Math.max(0.1, this.probability * 0.3);
    } else {
      this.fictional = false;
      this.probability = Math.min(1.0, this.probability * 1.2);
    }
    return this.proofStatus;
  }

  _graphProof() {
    // constraint solving through knowledge graph
    let supportingEvidence = 0;
    let contradictingEvidence = 0;

    for (let parent of this.parents) {
      if (parent.proofStatus === "proven") supportingEvidence++;
      if (parent.proofStatus === "disproven") contradictingEvidence++;
    }

    if (supportingEvidence > contradictingEvidence) {
      this.proofStatus = "proven";
      return "proven";
    } else if (contradictingEvidence > supportingEvidence) {
      this.proofStatus = "disproven";
      this.fictional = true;
      return "disproven";
    }

    return "hypothetical";
  }

  _edgeDetectionProof() {
    // if no new knowledge can be derived, likely false
    if (this.children.length === 0 && this.parents.length > 2) {
      this.proofStatus = "disproven";
      this.fictional = true;
      return "disproven";
    }
    return "unknown";
  }

  _areTripletsSimilar(t1, t2) {
    if (t1.length !== 3 || t2.length !== 3) return false;
    return t1[0] === t2[0] && t1[1] === t2[1] && t1[2] === t2[2];
  }

  _generateCombinedId(id1, id2, index) {
    return `${id1}+${id2}#${index}`;
  }

  _generateInferredName(triplet) {
    if (triplet.length === 3) {
      return `inferred_${triplet[0]}_${triplet[1]}_${triplet[2]}`;
    }
    return "inferred_complex";
  }

  export() {
    return {
      triplet: [...this.triplet],
      parents: this.parents.map((p) => p.id),
      id: this.id,
      name: this.name,
      NOTtype: this.NOTtype,
      historyKI: { ...this.historyKI },
      probability: this.probability,
      ambiguous: this.ambiguous,
      fictional: this.fictional,
      ambiguitySet: [...this.ambiguitySet],
      proofStatus: this.proofStatus,
    };
  }

  import(data) {
    this.triplet = [...data.triplet];
    this.id = data.id;
    this.name = data.name;
    this.NOTtype = data.NOTtype;
    this.historyKI = { ...data.historyKI };
    this.probability = data.probability || 1.0;
    this.ambiguous = data.ambiguous || false;
    this.fictional = data.fictional || false;
    this.ambiguitySet = [...(data.ambiguitySet || [])];
    this.proofStatus = data.proofStatus || "unknown";
  }

  setTriplet(subject, predicate, object) {
    this.triplet = [subject, predicate, object];
    return this;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  toString() {
    let tripletStr =
      this.triplet.length === 3
        ? `${this.triplet[0]} ${this.triplet[1]} ${this.triplet[2]}`
        : JSON.stringify(this.triplet);
    let prefix = this.NOTtype ? "NOT(" : "";
    let suffix = this.NOTtype ? ")" : "";
    let prob = `(${this.probability.toFixed(2)})`;
    let status = this.ambiguous ? "[AMB]" : "";
    status += this.fictional ? "[FIC]" : "";
    return `${prefix}${tripletStr}${suffix} ${prob}${status} [${this.name}]`;
  }

  getCacheStats() {
    return {
      hits: this._transitiveCacheHit,
      misses: this._transitiveCacheMiss,
      ratio:
        this._transitiveCacheHit /
          (this._transitiveCacheHit + this._transitiveCacheMiss) || 0,
    };
  }
}
(async function () {
  // Example usage with probabilistic system
  console.log("=== Probabilistic Knowledge System Demo ===");

  // external proof function example
  const externalProofFn = async (statement) => {
    // simulate external proof system
    await new Promise((r) => setTimeout(r, 10)); // simulate network delay

    // mock proofs
    if (statement[0] === "A" && statement[2] === "words") {
      return {
        isTrue: false,
        confidence: 0.9,
        reason: "A is a letter, not a word former",
      };
    }
    if (statement[0] === "dog" && statement[2] === "care") {
      return {
        isTrue: false,
        confidence: 0.8,
        reason: "dogs need care, they dont IS care",
      };
    }
    return null; // unknown
  };

  let manager = new CentralKnowledgeItemManager({
    saturationLevel: 0.4,
    maxKILimit: 10000,
    externalProofFn: externalProofFn,
  });

  // create knowledge items with manager
  let ki1 = new knowledgeItem(manager);
  ki1.setTriplet("A", "is", "letter").setName("letterA");

  let ki2 = new knowledgeItem(manager);
  ki2.setTriplet("letter", "are", "alphabets").setName("letterDef");

  let ki3 = new knowledgeItem(manager);
  ki3.setTriplet("alphabets", "form", "words").setName("alphabetDef");

  console.log("Initial knowledge items:");
  console.log("KI1:", ki1.toString());
  console.log("KI2:", ki2.toString());
  console.log("KI3:", ki3.toString());

  console.log("\n=== Probabilistic Combining KI1 and KI2 ===");
  let combined12 = ki1.combineKI(ki2);
  if (combined12 && combined12.length > 0) {
    combined12.forEach((ki, i) => {
      console.log(`Combined${i + 1}:`, ki.toString());
      if (ki.ambiguous) {
        console.log(`  Alternatives: ${ki.ambiguitySet.join(", ")}`);
      }
    });
  }

  console.log("\n=== Chaining with KI3 ===");
  if (combined12 && combined12.length > 0) {
    let chained = combined12[0].combineKI(ki3);
    if (chained && chained.length > 0) {
      chained.forEach(async (ki, i) => {
        console.log(`Chained${i + 1}:`, ki.toString());

        // test external proof
        let proof = await ki.proveStatement("external");
        console.log(`  Proof result: ${proof}`);
        console.log(`  Updated:`, ki.toString());
      });
    }
  }

  console.log("\n=== Manager Stats ===");
  console.log(`Total KIs: ${manager.allKIs.size}`);
  console.log(`Fictional ratio: ${manager.getFictionalRatio().toFixed(2)}`);

  // complex reasoning with ambiguity
  console.log("\n=== Complex Ambiguous Reasoning ===");
  let animals = new knowledgeItem(manager)
    .setTriplet("dog", "is", "animal")
    .setName("dogAnimal");
  let pets = new knowledgeItem(manager)
    .setTriplet("animal", "can_be", "pet")
    .setName("animalPet");
  let care = new knowledgeItem(manager)
    .setTriplet("pet", "needs", "care")
    .setName("petCare");

  let step1 = animals.combineKI(pets);
  if (step1?.length > 0) {
    console.log("Step1 results:");
    step1.forEach((ki) => console.log("  ", ki.toString()));

    let final = step1[0].combineKI(care);
    if (final?.length > 0) {
      console.log("Final inferences:");
      final.forEach(async (ki) => {
        console.log("  Before proof:", ki.toString());
        await ki.proveStatement("external");
        console.log("  After proof:", ki.toString());
      });
    }
  }
})();
