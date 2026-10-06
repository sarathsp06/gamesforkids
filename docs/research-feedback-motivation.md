# Feedback & Motivation Research Brief (ages 4–8)

Grounding for graded "closeness" scoring, feedback, and reward design.

## Graded vs binary feedback
- Feedback that carries *information* beats bare verification. Hattie's meta-analyses place feedback among the strongest influences on learning; the updated meta-analysis (Wisniewski, Zierer & Hattie 2020) shows high-information feedback (what was right, what was wrong, how to improve) far outperforms simple reinforcement/correctness marks. [PubMed](https://pubmed.ncbi.nlm.nih.gov/32038429)
- Elaborated feedback (explaining the correct answer) yields larger effects (d≈0.49) than mere right/wrong verification in computer-based learning (Van der Kleij, Feskens & Eggen 2015 meta-analysis). [ResearchGate](https://www.researchgate.net/publication/272923307_Effects_of_Feedback_in_a_Computer-Based_Learning_Environment_on_Students'_Learning_Outcomes_A_Meta-Analysis)
- For young children specifically, feedback giving the correct answer (not just "wrong") improves math performance and persistence (Byrd et al. 2024). [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10923023)
- Developmental note: children under ~11 learn better from positive than negative feedback; the neural circuitry for using negative feedback matures late (van Duijvenvoorde et al. 2008, *J. Neuroscience*). Grade "near-misses" as partial success, not failure. [JNeurosci](https://www.jneurosci.org/content/28/38/9495)

## Immediate vs delayed feedback
- Kulik & Kulik's (1988) meta-analysis: in applied/classroom settings immediate feedback outperforms delayed. [Sage](https://journals.sagepub.com/doi/10.3102/00346543058001079)
- Metcalfe, Kornell & Finn (2009): children benefit more from immediate feedback than adults — delayed feedback gains seen in adults did not hold for grade-schoolers. For ages 4–8: feedback right after the response, every time. [Columbia PDF](http://www.columbia.edu/cu/psychology/metcalfe/PDFs/MetcalfeKornellFinn2009.pdf)

## Praise: process, not person
- Mueller & Dweck (1998): praising intelligence/ability ("you're so smart") undermines motivation after setbacks; praising effort/strategy ("you worked hard", "good way to sound it out") sustains persistence and challenge-seeking. Effects replicated in children as young as 4 (Dweck 2007, "Perils and Promises of Praise"). [Mueller & Dweck PDF](https://www.columbia.edu/cu/psychology/courses/3615/Readings/Mueller_Dweck.pdf) · [Dweck PDF](https://teaching.temple.edu/sites/teaching/files/resource/pdf/Dweck-Perils%20%26%20Promises%20of%20Praise.pdf)
- Parent process praise predicts children's learning goals; person criticism predicts fixed mindsets (Gunderson et al. 2018). [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5986600)

## Error tolerance & productive failure
- Kapur's "productive failure": letting learners generate (wrong) attempts before instruction deepens later learning — errors activate prior knowledge (Kapur 2014, *Cognitive Science*; Kapur 2016). Evidence is strongest for older students; for 4–8 the takeaway is error-as-information, not error-as-punishment. [Kapur 2014 PDF](https://www.cse.iitk.ac.in/users/se367/14/Readings/papers/kapur-14_productive-failure-in-learning-math.pdf)
- Errors are inevitable by-products of appropriately hard tasks; learning environments should normalize them (Metcalfe; integrated model of learning from errors, 2023). [NSF](https://par.nsf.gov/servlets/purl/10429504)
- Young children's fear of mistakes drops when self-worth is protected — never show streak-breaking or loss animations on errors (BJEP special issue 2024). [Wiley](https://bpspsychub.onlinelibrary.wiley.com/doi/full/10.1111/bjep.12716)

## Rewards: stickers/stars/badges and overjustification
- Lepper, Greene & Nisbett (1973): preschoolers promised a reward for drawing later drew ~half as much in free play — expected, task-contingent tangible rewards undermine intrinsic interest ("overjustification"). [MIT PDF](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Motivation/Lepper_et_al_Undermining_Childrens_Intrinsic_Interest.pdf)
- Deci, Koestner & Ryan (1999) meta-analysis (128 studies): expected tangible rewards undermine intrinsic motivation, **especially in children**; but *verbal praise* and *unexpected* rewards do not undermine (praise can enhance). [SDT PDF](http://www.selfdeterminationtheory.org/SDT/documents/1999_DeciKoestnerRyan_Meta.pdf)
- Safe pattern: performance-feedback rewards (stars that *mean* "you nailed it") and occasional surprise rewards; avoid "do X trials, get a prize" contracts.

## Optimal challenge (~85% rule) and flow
- Wilson, Shenhav, Straccia & Cohen (2019, *Nature Communications*): learning is fastest when training accuracy sits near 85% (optimal error rate ≈15.9%). Too easy or too hard both stall learning. [Nature](https://www.nature.com/articles/s41467-019-12552-4)
- Converges with Csikszentmihalyi's flow (challenge slightly above skill) and Vygotsky's zone of proximal development.

## Repetition of missed items
- Successive relearning (retrieve until correct, then again in spaced sessions) produces durable gains (Rawson & Dunlosky 2022; Dunlosky & Rawson 2015). [Sage](https://journals.sagepub.com/doi/10.1177/09637214221100484)
- Elementary children need *guided* retrieval — re-show the item with support, don't just re-ask cold (Karpicke, Blunt & Smith 2014). [Purdue PDF](https://learninglab.psych.purdue.edu/downloads/2014/2014_Karpicke_etal_JARMAC.pdf)
- For preschool word learning, spaced retrieval schedules (equal or expanding) both beat massed (Gordon et al. 2024, *JSLHR*). [ASHA](https://pubs.asha.org/doi/10.1044/2024_JSLHR-23-00528)

## Pre-reader UI
- Hirsh-Pasek et al. (2015, *PSPI*) "Four Pillars" for educational apps: active (minds-on), engaged (no distracting bells/whistles), meaningful, socially interactive — plus scaffolded, leveled content. For pre-readers: audio instructions, icons over text, one goal per screen. [PDF](https://kathyhirshpasek.com/wp-content/uploads/sites/9/2019/06/HirshPasek_ScienceofLearningApps.pdf)

## Implications for our games (design lever → finding → rule)
- **Closeness scoring** → graded/elaborated feedback beats binary (Van der Kleij; Hattie) → score answers in tiers: exact = 3★, phonetic/near match (KAT↔CAT, off-by-one in math) = 2★ + show the correct answer, unrelated = 1 try-again. Never 0 stars with an animation of loss.
- **Positive framing** → children <11 learn poorly from negative feedback (van Duijvenvoorde) → near-miss feedback says what was *right* ("Sounds just like it!") before showing the fix; wrong answers get neutral "let's look together", never buzzer/red X shake.
- **Feedback timing** → immediate beats delayed for kids (Metcalfe; Kulik) → show graded result + correct answer within ~300ms of the answer, with audio.
- **Praise copy** → process praise (Mueller & Dweck) → praise lines reference effort/strategy ("You sounded it out!" / "Goed geprobeerd!"), never "slim"/"smart"; randomize from a process-praise pool.
- **Stars/badges** → verbal praise & surprise rewards safe; expected task-contingent prizes risky (Deci et al.; Lepper et al.) → stars = performance information per item/round; occasional *unannounced* celebration (confetti) after good rounds; no "answer 10 to win a sticker" contracts, no streak counters that break.
- **Difficulty adaptation** → 85% rule (Wilson et al.) → track rolling accuracy over last 10 items (count 2★ as 0.5 correct); >90% → level up (longer words, bigger numbers, shorter timer); <70% → level down; target band 75–90%.
- **Repeating missed items** → successive relearning + guided retrieval (Rawson & Dunlosky; Karpicke) → a <3★ item re-enters the queue: first 2–3 items later *with* scaffold (audio replay / first letter shown), then once more near end of session unscaffolded; retire after one unscaffolded 3★.
- **Pre-reader UI** → Four Pillars (Hirsh-Pasek) → every prompt has audio; feedback is spoken + iconic (stars, faces), not text; no mid-round popups or decorative animations during a question.
