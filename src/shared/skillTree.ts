import type {
  Achievement,
  Difficulty,
  GoalInput,
  ProgressEntry,
  SkillEdge,
  SkillNode,
  SkillTree,
  TreePalette,
} from './types.js';

const difficultyXp: Record<Difficulty, number> = {
  starter: 50,
  apprentice: 90,
  adept: 140,
  expert: 220,
  legendary: 420,
};

const normalize = (value: string) => value.toLowerCase().trim();

type BlueprintNode = {
  id: string;
  title: string;
  description: string;
  children: string[];
  branch: string;
  identity: string;
  tradeoff?: string;
  difficulty?: Difficulty;
  proofPrompt?: string;
  tips?: string[];
  hidden?: boolean;
  unlockCondition?: string;
};

type DomainBlueprint = {
  domain: string;
  root: BlueprintNode;
  nodes: BlueprintNode[];
};

const chessBlueprint: DomainBlueprint = {
  domain: 'chess',
  root: {
    id: 'start_chess',
    title: 'Start Chess Journey',
    description: 'Learn the basics of chess and choose whether your game grows through tactics, strategy, or practical play.',
    children: ['rules_basic', 'play_first_games'],
    branch: 'origin',
    identity: 'Chess Explorer',
    proofPrompt: 'Play or review one game and write the biggest rule or pattern you noticed.',
  },
  nodes: [
    {
      id: 'rules_basic',
      title: 'Learn Rules & Piece Movement',
      description: 'Understand legal movement, check, checkmate, stalemate, castling, promotion, and en passant.',
      children: ['tactics_intro', 'opening_fundamentals'],
      branch: 'foundation',
      identity: 'Rules Builder',
      tradeoff: 'Theory clarity vs game volume',
      proofPrompt: 'Explain three special rules and identify them in a real position.',
    },
    {
      id: 'play_first_games',
      title: 'Play 10 Casual Games',
      description: 'Build comfort with real positions before optimizing every move.',
      children: ['blunder_reduction', 'pattern_recognition'],
      branch: 'practical-play',
      identity: 'Practical Player',
      tradeoff: 'Experience volume vs analysis depth',
      proofPrompt: 'Log 10 games and the most common mistake you repeated.',
    },
    {
      id: 'tactics_intro',
      title: 'Basic Tactics (Forks, Pins, Skewers)',
      description: 'Train the forcing patterns that win material and create threats.',
      children: ['tactics_specialist', 'positional_basics'],
      branch: 'tactical',
      identity: 'Tactical Initiate',
      tradeoff: 'Calculation speed vs positional patience',
      proofPrompt: 'Solve 20 beginner tactics and tag the pattern type.',
    },
    {
      id: 'opening_fundamentals',
      title: 'Opening Principles (Center, Development, King Safety)',
      description: 'Learn why openings work before memorizing long move orders.',
      children: ['opening_specialist', 'balanced_player'],
      branch: 'opening',
      identity: 'Opening Architect',
      tradeoff: 'Prepared lines vs flexible principles',
      proofPrompt: 'Review three games and mark whether you controlled the center and developed cleanly.',
    },
    {
      id: 'blunder_reduction',
      title: 'Reduce Blunders (Hanging Pieces Awareness)',
      description: 'Build a scan routine before every move to stop giving away material.',
      children: ['defensive_player', 'calculated_player'],
      branch: 'practical-play',
      identity: 'Solid Defender',
      tradeoff: 'Safety vs initiative',
      proofPrompt: 'Review five games and count hanging-piece blunders.',
    },
    {
      id: 'pattern_recognition',
      title: 'Recognize Common Patterns',
      description: 'Spot recurring motifs like back-rank threats, overloaded defenders, and weak squares.',
      children: ['attacking_style', 'strategic_style'],
      branch: 'pattern',
      identity: 'Pattern Hunter',
      tradeoff: 'Instinctive recognition vs explicit calculation',
      proofPrompt: 'Collect five positions where you recognized a repeated pattern.',
    },
    {
      id: 'tactics_specialist',
      title: 'Tactical Specialist Path',
      description: 'Lean into forcing moves, combinations, and concrete calculation.',
      children: ['sacrifice_master', 'speed_calculation'],
      branch: 'tactical',
      identity: 'Tactical Specialist',
      tradeoff: 'Sharp attacks vs structural risk',
      difficulty: 'adept',
      proofPrompt: 'Complete a timed tactic set and annotate missed forcing moves.',
    },
    {
      id: 'positional_basics',
      title: 'Positional Understanding',
      description: 'Learn pawn structure, piece activity, weak squares, and improving moves.',
      children: ['endgame_focus', 'grandmaster_thinking'],
      branch: 'positional',
      identity: 'Strategic Builder',
      tradeoff: 'Long-term pressure vs immediate tactics',
      difficulty: 'adept',
      proofPrompt: 'Annotate one game where you improved a piece without an immediate tactic.',
    },
    {
      id: 'opening_specialist',
      title: 'Opening Specialist',
      description: 'Choose a small repertoire and learn common plans from those structures.',
      children: ['repertoire_builder', 'prep_traps'],
      branch: 'opening',
      identity: 'Prepared Player',
      tradeoff: 'Memorized comfort vs adaptability',
      difficulty: 'adept',
      proofPrompt: 'Create a two-opening repertoire with plans, not just moves.',
    },
    {
      id: 'balanced_player',
      title: 'Balanced Player',
      description: 'Keep openings, tactics, endgames, and review in rotation.',
      children: ['tournament_ready', 'rating_climb'],
      branch: 'balanced',
      identity: 'All-Rounder',
      tradeoff: 'Broad growth vs deep specialization',
      difficulty: 'adept',
      proofPrompt: 'Run one weekly cycle with tactics, game review, and endgame practice.',
    },
    {
      id: 'sacrifice_master',
      title: 'Sacrifice Master',
      description: 'Learn when material sacrifice creates decisive attack or compensation.',
      children: [],
      branch: 'tactical',
      identity: 'Attacker',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated tactic/combinations proof or sacrifice tags.',
      proofPrompt: 'Annotate three sacrifices and explain the compensation.',
    },
    {
      id: 'speed_calculation',
      title: 'Speed Calculation',
      description: 'Train candidate moves and forcing lines under time pressure.',
      children: [],
      branch: 'tactical',
      identity: 'Fast Calculator',
      difficulty: 'expert',
      hidden: true,
      unlockCondition: 'Unlock after repeated timed tactics or blitz review signals.',
      proofPrompt: 'Complete timed calculation drills and record accuracy.',
    },
    {
      id: 'endgame_focus',
      title: 'Endgame Focus',
      description: 'Convert advantages with king activity, pawn races, and basic theoretical endings.',
      children: [],
      branch: 'positional',
      identity: 'Converter',
      difficulty: 'expert',
      proofPrompt: 'Win or annotate three simplified endgames.',
    },
    {
      id: 'grandmaster_thinking',
      title: 'Grandmaster Thinking',
      description: 'Compare candidate plans and evaluate positions before calculating moves.',
      children: [],
      branch: 'positional',
      identity: 'Strategist',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated positional review and annotation signals.',
      proofPrompt: 'Annotate a master game by plans, imbalances, and turning points.',
    },
    {
      id: 'defensive_player',
      title: 'Defensive Player',
      description: 'Survive pressure, simplify danger, and force opponents to prove attacks.',
      children: [],
      branch: 'defense',
      identity: 'Defender',
      difficulty: 'expert',
      proofPrompt: 'Save two worse positions and explain the defensive resource.',
    },
    {
      id: 'calculated_player',
      title: 'Calculated Player',
      description: 'Use a repeatable blunder-check and candidate-move routine.',
      children: [],
      branch: 'calculation',
      identity: 'Calculator',
      difficulty: 'expert',
      proofPrompt: 'Review five critical positions with candidate moves.',
    },
    {
      id: 'attacking_style',
      title: 'Attacking Style',
      description: 'Coordinate pieces toward the king and learn attack timing.',
      children: [],
      branch: 'attacking',
      identity: 'Attacker',
      difficulty: 'expert',
      proofPrompt: 'Annotate two attacks and identify the breakthrough move.',
    },
    {
      id: 'strategic_style',
      title: 'Strategic Style',
      description: 'Win through pawn breaks, weak squares, and slow pressure.',
      children: [],
      branch: 'strategic',
      identity: 'Strategist',
      difficulty: 'expert',
      proofPrompt: 'Annotate a game where a long-term plan mattered more than tactics.',
    },
    {
      id: 'repertoire_builder',
      title: 'Repertoire Builder',
      description: 'Build a compact opening system with typical middlegame plans.',
      children: [],
      branch: 'opening',
      identity: 'Prepared Player',
      difficulty: 'expert',
      proofPrompt: 'Write a repertoire note for both colors.',
    },
    {
      id: 'prep_traps',
      title: 'Opening Trap Awareness',
      description: 'Learn common traps without becoming dependent on opponent mistakes.',
      children: [],
      branch: 'opening',
      identity: 'Trap Spotter',
      difficulty: 'expert',
      proofPrompt: 'Identify five traps and the correct defensive response.',
    },
    {
      id: 'tournament_ready',
      title: 'Tournament Ready Routine',
      description: 'Prepare time control, review cadence, openings, and tilt management.',
      children: [],
      branch: 'balanced',
      identity: 'Competitor',
      difficulty: 'expert',
      proofPrompt: 'Run a mock tournament block and review every game.',
    },
    {
      id: 'rating_climb',
      title: 'Rating Climb System',
      description: 'Create a measured loop for study, games, review, and weakness targeting.',
      children: [],
      branch: 'balanced',
      identity: 'Climber',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after a stable game-review habit.',
      proofPrompt: 'Track rating, mistakes, and study focus for two weeks.',
    },
  ],
};

const boxingBlueprint: DomainBlueprint = {
  domain: 'boxing',
  root: {
    id: 'boxing_start',
    title: 'Begin Boxing Journey',
    description: 'Build from gym fundamentals toward style discovery, sparring confidence, and fight readiness.',
    children: ['basic_conditioning', 'stance_foundation'],
    branch: 'origin',
    identity: 'New Boxer',
    proofPrompt: 'Log your first boxing session and baseline conditioning.',
  },
  nodes: [
    {
      id: 'basic_conditioning',
      title: 'Basic Conditioning (Jump Rope, Cardio)',
      description: 'Build the engine that lets technique survive fatigue.',
      children: ['fight_stamina_path', 'speed_focus'],
      branch: 'conditioning',
      identity: 'Engine Builder',
      tradeoff: 'Endurance vs explosiveness',
      proofPrompt: 'Record a jump-rope or cardio baseline.',
    },
    {
      id: 'stance_foundation',
      title: 'Learn Boxing Stance & Guard',
      description: 'Create stable balance, guard recovery, foot alignment, and safe movement.',
      children: ['jab_focus', 'defense_focus'],
      branch: 'foundation',
      identity: 'Technician',
      tradeoff: 'Mobility vs defensive shell',
      proofPrompt: 'Upload or describe three rounds of stance and guard practice.',
    },
    {
      id: 'fight_stamina_path',
      title: 'Build Fight Stamina (3R Spar Simulation)',
      description: 'Train round-based effort with controlled fatigue.',
      children: ['sparring_beginner', 'pressure_tolerance'],
      branch: 'conditioning',
      identity: 'Pressure Athlete',
      tradeoff: 'Pace control vs output volume',
      difficulty: 'apprentice',
      proofPrompt: 'Complete a three-round bag or shadowboxing simulation.',
    },
    {
      id: 'speed_focus',
      title: 'Hand Speed Development',
      description: 'Improve fast starts, relaxed punches, and snap without wasting energy.',
      children: ['combo_building', 'counterpunch_path'],
      branch: 'speed',
      identity: 'Speed Fighter',
      tradeoff: 'Speed vs punch selection',
      difficulty: 'apprentice',
      proofPrompt: 'Record a speed drill and note when form breaks.',
    },
    {
      id: 'jab_focus',
      title: 'Jab Mastery',
      description: 'Use the jab to measure, interrupt, score, and set traps.',
      children: ['outboxing_style', 'range_control'],
      branch: 'jab',
      identity: 'Outboxer',
      tradeoff: 'Range control vs inside pressure',
      proofPrompt: 'Complete jab-only rounds and note accuracy.',
    },
    {
      id: 'defense_focus',
      title: 'Defense Basics (Slip, Block, Roll)',
      description: 'Layer basic defensive reactions before heavy sparring.',
      children: ['counterfighter_path', 'defensive_sparring'],
      branch: 'defense',
      identity: 'Defensive Fighter',
      tradeoff: 'Safety vs counter timing',
      proofPrompt: 'Drill slips, blocks, and rolls for three rounds.',
    },
    {
      id: 'sparring_beginner',
      title: 'Begin Sparring (Light Contact)',
      description: 'Enter controlled contact with composure and clear constraints.',
      children: ['first_real_spar', 'style_discovery'],
      branch: 'sparring',
      identity: 'Composed Beginner',
      tradeoff: 'Learning under pressure vs injury risk',
      difficulty: 'adept',
      proofPrompt: 'Log a light spar with one thing you handled well and one thing to fix.',
    },
    {
      id: 'pressure_tolerance',
      title: 'Handle Pressure & Fatigue',
      description: 'Stay defensively responsible when tired, crowded, or rushed.',
      children: ['fight_readiness', 'amateur_fight_prep'],
      branch: 'pressure',
      identity: 'Pressure-Ready Fighter',
      tradeoff: 'Composure vs aggression',
      difficulty: 'adept',
      proofPrompt: 'Record a fatigue round and describe defensive choices.',
    },
    {
      id: 'combo_building',
      title: 'Combination Building',
      description: 'Chain punches into purposeful entries, exits, and angle changes.',
      children: ['style_discovery', 'ring_strategy'],
      branch: 'speed',
      identity: 'Combination Puncher',
      difficulty: 'adept',
      proofPrompt: 'Build three combos and state their purpose.',
    },
    {
      id: 'counterpunch_path',
      title: 'Counterpunch Path',
      description: 'Use reactions, timing, and opponent mistakes as offense.',
      children: ['counterfighter_path', 'ring_strategy'],
      branch: 'counter',
      identity: 'Counterpuncher',
      tradeoff: 'Patience vs initiative',
      difficulty: 'adept',
      proofPrompt: 'Drill two counters against jab or cross entries.',
    },
    {
      id: 'outboxing_style',
      title: 'Outboxing Style',
      description: 'Win with range, footwork, and a controlling jab.',
      children: ['style_refinement', 'ring_strategy'],
      branch: 'style',
      identity: 'Outboxer',
      difficulty: 'adept',
      proofPrompt: 'Run jab-and-move rounds with controlled distance.',
    },
    {
      id: 'range_control',
      title: 'Range Control',
      description: 'Know when you are outside, mid-range, or inside and act accordingly.',
      children: ['style_refinement', 'defensive_sparring'],
      branch: 'style',
      identity: 'Range Manager',
      difficulty: 'adept',
      proofPrompt: 'Log three rounds focused on entering and exiting range.',
    },
    {
      id: 'counterfighter_path',
      title: 'Counterfighter Path',
      description: 'Blend defense into immediate, clean return fire.',
      children: ['style_refinement', 'first_real_spar'],
      branch: 'counter',
      identity: 'Counterfighter',
      difficulty: 'adept',
      proofPrompt: 'Record counter drills and the trigger for each counter.',
    },
    {
      id: 'defensive_sparring',
      title: 'Defensive Sparring',
      description: 'Spar with limited offense to train reads, guard, and exits.',
      children: ['first_real_spar', 'fight_readiness'],
      branch: 'defense',
      identity: 'Defensive Specialist',
      difficulty: 'adept',
      proofPrompt: 'Complete a defense-first sparring round and note what landed.',
    },
    {
      id: 'first_real_spar',
      title: 'Controlled Sparring (Real Resistance)',
      description: 'Meet real resistance while still protecting learning and safety.',
      children: ['fight_ready', 'style_refinement'],
      branch: 'sparring',
      identity: 'Sparring Boxer',
      difficulty: 'expert',
      proofPrompt: 'Log a controlled spar and the main adjustment you made mid-round.',
    },
    {
      id: 'style_discovery',
      title: 'Style Discovery',
      description: 'Identify whether your best path is outboxing, pressure, counters, or defense.',
      children: ['style_refinement', 'ring_strategy'],
      branch: 'style',
      identity: 'Style Explorer',
      difficulty: 'expert',
      proofPrompt: 'Compare two sparring rounds and name your emerging style.',
    },
    {
      id: 'fight_readiness',
      title: 'Fight Readiness Check',
      description: 'Assess conditioning, defense, coach approval, composure, and safety.',
      children: ['amateur_fight_prep', 'ring_strategy'],
      branch: 'fight-prep',
      identity: 'Fight Candidate',
      difficulty: 'expert',
      hidden: true,
      unlockCondition: 'Unlock after repeated sparring, pressure, and coach-feedback signals.',
      proofPrompt: 'Complete a readiness checklist with coach feedback.',
    },
    {
      id: 'style_refinement',
      title: 'Style Refinement',
      description: 'Turn your preferred style into repeatable tactics and round plans.',
      children: ['ring_strategy', 'fight_ready'],
      branch: 'style',
      identity: 'Identity Fighter',
      difficulty: 'expert',
      proofPrompt: 'Write a round plan for your style.',
    },
    {
      id: 'amateur_fight_prep',
      title: 'Amateur Fight Preparation',
      description: 'Build camp structure, weight discipline, sparring rhythm, and tactical plan.',
      children: ['first_fight', 'ring_strategy'],
      branch: 'fight-prep',
      identity: 'Amateur Prospect',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated fight-readiness and sparring proof.',
      proofPrompt: 'Create a fight prep plan with rounds, recovery, and coach signoff.',
    },
    {
      id: 'ring_strategy',
      title: 'Ring Strategy',
      description: 'Make tactical decisions by range, score, opponent style, and fatigue.',
      children: ['first_fight'],
      branch: 'fight-iq',
      identity: 'Ring General',
      difficulty: 'expert',
      proofPrompt: 'Break down one sparring round by tactical decisions.',
    },
    {
      id: 'fight_ready',
      title: 'Fight Ready',
      description: 'Demonstrate safe, coach-approved readiness under realistic rounds.',
      children: ['first_fight'],
      branch: 'fight-prep',
      identity: 'Ready Fighter',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after consistent sparring and readiness proof.',
      proofPrompt: 'Record coach-approved readiness evidence.',
    },
    {
      id: 'first_fight',
      title: 'First Amateur Fight',
      description: 'Step into a sanctioned amateur bout with a prepared plan and support team.',
      children: [],
      branch: 'fight-prep',
      identity: 'Amateur Fighter',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock only after fight prep and coach approval signals.',
      proofPrompt: 'Log the fight outcome, lessons, and next camp focus.',
    },
  ],
};

const photographyBlueprint: DomainBlueprint = {
  domain: 'photography',
  root: {
    id: 'photo_start',
    title: 'Start Photography Journey',
    description: 'Learn camera control and composition, then diverge into genre, technical, or career paths.',
    children: ['camera_basics', 'composition_foundation'],
    branch: 'origin',
    identity: 'Visual Explorer',
    proofPrompt: 'Take 10 intentional photos and write what you tried to control.',
  },
  nodes: [
    {
      id: 'camera_basics',
      title: 'Understand Camera Settings (ISO, Shutter, Aperture)',
      description: 'Learn exposure as a set of creative choices, not just technical settings.',
      children: ['manual_control', 'low_light_focus'],
      branch: 'technical',
      identity: 'Camera Technician',
      tradeoff: 'Technical control vs spontaneous shooting',
      proofPrompt: 'Shoot the same subject with three exposure settings and compare results.',
    },
    {
      id: 'composition_foundation',
      title: 'Learn Composition (Rule of Thirds, Framing)',
      description: 'Control where attention goes inside the frame.',
      children: ['street_photography_path', 'portrait_path'],
      branch: 'composition',
      identity: 'Composer',
      tradeoff: 'Structure vs intuition',
      proofPrompt: 'Create a contact sheet showing three different framing choices.',
    },
    {
      id: 'manual_control',
      title: 'Shoot Fully in Manual Mode',
      description: 'Make exposure choices deliberately without relying on auto mode.',
      children: ['technical_mastery', 'creative_control'],
      branch: 'technical',
      identity: 'Manual Shooter',
      tradeoff: 'Control vs speed',
      difficulty: 'apprentice',
      proofPrompt: 'Shoot one session fully manual and note your settings choices.',
    },
    {
      id: 'low_light_focus',
      title: 'Low Light Photography',
      description: 'Work with noise, motion blur, available light, and mood.',
      children: ['night_street', 'cinematic_style'],
      branch: 'low-light',
      identity: 'Low-Light Shooter',
      tradeoff: 'Mood vs clarity',
      difficulty: 'apprentice',
      proofPrompt: 'Shoot five low-light frames and explain exposure tradeoffs.',
    },
    {
      id: 'street_photography_path',
      title: 'Street Photography Path',
      description: 'Capture timing, gesture, environment, and public life.',
      children: ['candid_mastery', 'storytelling_focus'],
      branch: 'street',
      identity: 'Street Photographer',
      tradeoff: 'Candid truth vs composed control',
      difficulty: 'apprentice',
      proofPrompt: 'Shoot a street set and choose three frames with strong moments.',
    },
    {
      id: 'portrait_path',
      title: 'Portrait Photography Path',
      description: 'Shape expression, pose, light, and trust with a subject.',
      children: ['lighting_mastery', 'model_direction'],
      branch: 'portrait',
      identity: 'Portrait Maker',
      tradeoff: 'Subject direction vs authentic expression',
      difficulty: 'apprentice',
      proofPrompt: 'Shoot a portrait session and write what direction helped.',
    },
    {
      id: 'technical_mastery',
      title: 'Technical Mastery',
      description: 'Control focus, exposure, lens choice, and repeatable quality.',
      children: ['studio_work', 'commercial_photography'],
      branch: 'technical',
      identity: 'Technical Specialist',
      difficulty: 'adept',
      proofPrompt: 'Create a technically consistent mini-series.',
    },
    {
      id: 'creative_control',
      title: 'Creative Control',
      description: 'Choose settings and constraints to create a deliberate look.',
      children: ['cinematic_style', 'visual_storytelling'],
      branch: 'creative',
      identity: 'Creative Director',
      tradeoff: 'Experimentation vs consistency',
      difficulty: 'adept',
      proofPrompt: 'Shoot one concept with a deliberate color, lens, or motion choice.',
    },
    {
      id: 'night_street',
      title: 'Night Street',
      description: 'Use city light, reflections, blur, and contrast for atmosphere.',
      children: ['documentary_style', 'cinematic_style'],
      branch: 'street',
      identity: 'Night Walker',
      difficulty: 'adept',
      proofPrompt: 'Create a five-photo night street sequence.',
    },
    {
      id: 'cinematic_style',
      title: 'Cinematic Photo Style',
      description: 'Use light, color, crop, and sequencing to make stills feel filmic.',
      children: ['color_grading', 'visual_storytelling'],
      branch: 'cinematic',
      identity: 'Cinematic Artist',
      tradeoff: 'Stylization vs realism',
      difficulty: 'adept',
      proofPrompt: 'Edit five images into one consistent cinematic look.',
    },
    {
      id: 'candid_mastery',
      title: 'Capture Candid Moments',
      description: 'Anticipate human moments without overdirecting them.',
      children: ['documentary_style', 'human_stories'],
      branch: 'street',
      identity: 'Candid Hunter',
      difficulty: 'adept',
      proofPrompt: 'Capture three candid moments with clear gesture or story.',
    },
    {
      id: 'storytelling_focus',
      title: 'Storytelling Focus',
      description: 'Sequence photos so the set says more than a single image.',
      children: ['documentary_style', 'visual_storytelling'],
      branch: 'story',
      identity: 'Visual Storyteller',
      difficulty: 'adept',
      proofPrompt: 'Build a five-image sequence with a beginning, tension, and resolution.',
    },
    {
      id: 'lighting_mastery',
      title: 'Master Lighting (Natural + Artificial)',
      description: 'Shape faces, mood, and attention using direction and quality of light.',
      children: ['studio_work', 'commercial_photography'],
      branch: 'portrait',
      identity: 'Lighting Specialist',
      tradeoff: 'Controlled polish vs natural feel',
      difficulty: 'adept',
      proofPrompt: 'Shoot the same subject with natural and artificial light.',
    },
    {
      id: 'model_direction',
      title: 'Model Direction',
      description: 'Guide posing, expression, comfort, and collaboration.',
      children: ['studio_work', 'human_stories'],
      branch: 'portrait',
      identity: 'People Director',
      difficulty: 'adept',
      proofPrompt: 'Document three direction prompts that improved a portrait.',
    },
    {
      id: 'documentary_style',
      title: 'Documentary Style',
      description: 'Create honest, contextual work around real people and places.',
      children: ['portfolio_building'],
      branch: 'documentary',
      identity: 'Documentarian',
      difficulty: 'expert',
      proofPrompt: 'Create a short documentary photo essay.',
    },
    {
      id: 'human_stories',
      title: 'Human Stories',
      description: 'Use portraits and candid frames to reveal character and emotion.',
      children: ['portfolio_building'],
      branch: 'story',
      identity: 'Humanist',
      difficulty: 'expert',
      proofPrompt: 'Build a story set around one person or group.',
    },
    {
      id: 'studio_work',
      title: 'Studio Work',
      description: 'Control backdrop, light, pose, tethering, and repeatable output.',
      children: ['commercial_photography'],
      branch: 'commercial',
      identity: 'Studio Photographer',
      difficulty: 'expert',
      proofPrompt: 'Shoot one controlled studio-style setup.',
    },
    {
      id: 'color_grading',
      title: 'Color Grading',
      description: 'Create a repeatable color identity through editing decisions.',
      children: ['visual_storytelling', 'portfolio_building'],
      branch: 'cinematic',
      identity: 'Color Stylist',
      difficulty: 'expert',
      proofPrompt: 'Grade a set with one consistent palette.',
    },
    {
      id: 'visual_storytelling',
      title: 'Visual Storytelling',
      description: 'Combine subject, light, sequence, and edit into a coherent narrative.',
      children: ['portfolio_building'],
      branch: 'story',
      identity: 'Story Artist',
      difficulty: 'expert',
      proofPrompt: 'Publish a sequence with captions explaining the story arc.',
    },
    {
      id: 'commercial_photography',
      title: 'Commercial / Paid Work Ready',
      description: 'Translate taste and technique into client-ready output.',
      children: ['portfolio_building', 'client_work'],
      branch: 'commercial',
      identity: 'Commercial Shooter',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated portrait, lighting, studio, or client-intent signals.',
      proofPrompt: 'Create a mock client brief and deliver a polished set.',
    },
    {
      id: 'portfolio_building',
      title: 'Portfolio Building',
      description: 'Curate your strongest identity into a tight body of work.',
      children: ['client_work'],
      branch: 'career',
      identity: 'Portfolio Builder',
      difficulty: 'expert',
      proofPrompt: 'Select 12 images and explain the audience for the portfolio.',
    },
    {
      id: 'client_work',
      title: 'Client Work',
      description: 'Manage brief, communication, delivery, revisions, and expectations.',
      children: [],
      branch: 'career',
      identity: 'Working Photographer',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after portfolio and commercial readiness proof.',
      proofPrompt: 'Complete a client or mock-client shoot from brief to delivery.',
    },
  ],
};

const calisthenicsBlueprint: DomainBlueprint = {
  domain: 'calisthenics',
  root: {
    id: 'calisthenics_start',
    title: 'Begin Calisthenics Journey',
    description: 'Build strength, skill control, mobility, and movement identity through branching bodyweight paths.',
    children: ['push_foundation', 'pull_foundation'],
    branch: 'origin',
    identity: 'Bodyweight Beginner',
    proofPrompt: 'Record baseline pushups, rows or pullups, and mobility notes.',
  },
  nodes: [
    {
      id: 'push_foundation',
      title: 'Push Strength Foundation',
      description: 'Build pressing volume and shoulder control for dips and handstand work.',
      children: ['dips_path', 'handstand_line'],
      branch: 'push',
      identity: 'Push Athlete',
      tradeoff: 'Pressing strength vs joint recovery',
      proofPrompt: 'Log pushup volume and one shoulder-prep drill.',
    },
    {
      id: 'pull_foundation',
      title: 'Pull Strength Foundation',
      description: 'Build scapular control, rows, and pullup progressions.',
      children: ['pullup_path', 'core_control'],
      branch: 'pull',
      identity: 'Pull Athlete',
      tradeoff: 'Max strength vs clean form',
      proofPrompt: 'Log pulling volume and form notes.',
    },
    {
      id: 'dips_path',
      title: 'Dips Path',
      description: 'Progress support holds, assisted dips, and controlled depth.',
      children: ['muscle_up_pathway', 'planche_prep'],
      branch: 'push',
      identity: 'Dip Specialist',
      difficulty: 'apprentice',
      proofPrompt: 'Record dip progression reps and shoulder comfort.',
    },
    {
      id: 'handstand_line',
      title: 'Handstand Line',
      description: 'Build wall line, wrist prep, balance, and overhead confidence.',
      children: ['handstand_balance', 'planche_prep'],
      branch: 'skill',
      identity: 'Balance Athlete',
      tradeoff: 'Skill precision vs strength output',
      difficulty: 'apprentice',
      proofPrompt: 'Hold wall line practice and log balance attempts.',
    },
    {
      id: 'pullup_path',
      title: 'Pullup Path',
      description: 'Progress toward strict pullups, tempo reps, and clean scapular mechanics.',
      children: ['muscle_up_pathway', 'front_lever_basics'],
      branch: 'pull',
      identity: 'Pullup Specialist',
      difficulty: 'apprentice',
      proofPrompt: 'Record strict pulling work or progression level.',
    },
    {
      id: 'core_control',
      title: 'Core Control',
      description: 'Build hollow body, compression, and anti-extension strength.',
      children: ['front_lever_basics', 'mobility_recovery'],
      branch: 'core',
      identity: 'Control Athlete',
      tradeoff: 'Tension strength vs mobility',
      difficulty: 'apprentice',
      proofPrompt: 'Log hollow holds, compression, or hanging knee raises.',
    },
    {
      id: 'muscle_up_pathway',
      title: 'Muscle Up Pathway',
      description: 'Blend pulling power, transition skill, and dip strength.',
      children: ['explosive_pulling', 'transition_mastery'],
      branch: 'dynamic',
      identity: 'Explosive Athlete',
      tradeoff: 'Explosive power vs strict control',
      difficulty: 'adept',
      hidden: true,
      unlockCondition: 'Unlock after repeated dips, pullups, or explosive pulling signals.',
      proofPrompt: 'Record high pulls, transition drills, or band-assisted attempts.',
    },
    {
      id: 'front_lever_basics',
      title: 'Front Lever Basics',
      description: 'Build straight-arm pulling strength and full-body tension.',
      children: ['lever_progressions', 'mobility_recovery'],
      branch: 'static',
      identity: 'Static Strength Athlete',
      tradeoff: 'Isometric strength vs dynamic output',
      difficulty: 'adept',
      hidden: true,
      unlockCondition: 'Unlock after repeated pullup, core, or lever signals.',
      proofPrompt: 'Log tuck lever holds and scapular position.',
    },
    {
      id: 'planche_prep',
      title: 'Planche Prep',
      description: 'Develop straight-arm pushing, wrist capacity, and lean tolerance.',
      children: ['straight_arm_strength', 'mobility_recovery'],
      branch: 'static',
      identity: 'Planche Athlete',
      tradeoff: 'Straight-arm strength vs recovery demand',
      difficulty: 'adept',
      hidden: true,
      unlockCondition: 'Unlock after repeated handstand, dips, or planche-lean signals.',
      proofPrompt: 'Record planche leans and wrist readiness.',
    },
    {
      id: 'handstand_balance',
      title: 'Freestanding Handstand Balance',
      description: 'Move from wall line to freestanding kick-ups and saves.',
      children: ['straight_arm_strength'],
      branch: 'skill',
      identity: 'Handstand Athlete',
      difficulty: 'expert',
      proofPrompt: 'Record balance attempts and best hold.',
    },
    {
      id: 'explosive_pulling',
      title: 'Explosive Pulling',
      description: 'Train high pulls and speed through the transition zone.',
      children: [],
      branch: 'dynamic',
      identity: 'Power Puller',
      difficulty: 'expert',
      proofPrompt: 'Record high-pull height and rep quality.',
    },
    {
      id: 'transition_mastery',
      title: 'Muscle Up Transition Mastery',
      description: 'Own the turnover between pull and dip.',
      children: [],
      branch: 'dynamic',
      identity: 'Muscle Up Specialist',
      difficulty: 'legendary',
      hidden: true,
      proofPrompt: 'Record a clean transition drill or full muscle up attempt.',
    },
    {
      id: 'lever_progressions',
      title: 'Lever Progressions',
      description: 'Advance tuck, one-leg, straddle, and full lever progressions.',
      children: [],
      branch: 'static',
      identity: 'Lever Athlete',
      difficulty: 'expert',
      proofPrompt: 'Log lever progression holds and video form notes.',
    },
    {
      id: 'straight_arm_strength',
      title: 'Straight Arm Strength',
      description: 'Build connective-tissue tolerance and locked-arm control.',
      children: [],
      branch: 'static',
      identity: 'Straight-Arm Specialist',
      difficulty: 'expert',
      proofPrompt: 'Log straight-arm drills and recovery response.',
    },
    {
      id: 'mobility_recovery',
      title: 'Mobility & Recovery System',
      description: 'Protect wrists, shoulders, elbows, and consistency.',
      children: [],
      branch: 'recovery',
      identity: 'Durable Athlete',
      difficulty: 'adept',
      proofPrompt: 'Complete a recovery session and note pain or readiness.',
    },
  ],
};

const codingBlueprint: DomainBlueprint = {
  domain: 'coding',
  root: {
    id: 'coding_start',
    title: 'Begin Coding Journey',
    description: 'Build fundamentals, projects, and specialization paths instead of marching through one tutorial lane.',
    children: ['programming_fundamentals', 'build_first_projects'],
    branch: 'origin',
    identity: 'Builder',
    proofPrompt: 'Push or describe your first working code exercise.',
  },
  nodes: [
    {
      id: 'programming_fundamentals',
      title: 'Programming Fundamentals',
      description: 'Learn variables, control flow, functions, debugging, and data structures.',
      children: ['frontend_path', 'backend_path'],
      branch: 'fundamentals',
      identity: 'Problem Solver',
      tradeoff: 'Concept depth vs shipping speed',
      proofPrompt: 'Solve five small problems and explain one bug.',
    },
    {
      id: 'build_first_projects',
      title: 'Build First Projects',
      description: 'Turn concepts into visible projects with feedback loops.',
      children: ['product_builder', 'automation_path'],
      branch: 'projects',
      identity: 'Project Shipper',
      tradeoff: 'Polish vs learning breadth',
      proofPrompt: 'Ship a tiny app or script and write what it does.',
    },
    {
      id: 'frontend_path',
      title: 'Frontend Path',
      description: 'Build interfaces with components, state, styling, and user feedback.',
      children: ['react_systems', 'ui_animation'],
      branch: 'frontend',
      identity: 'Interface Builder',
      difficulty: 'apprentice',
      proofPrompt: 'Build a component with interactive state.',
    },
    {
      id: 'backend_path',
      title: 'Backend Path',
      description: 'Build APIs, data models, auth, and reliable server behavior.',
      children: ['api_architecture', 'database_design'],
      branch: 'backend',
      identity: 'Systems Builder',
      difficulty: 'apprentice',
      proofPrompt: 'Create one API route with validation.',
    },
    {
      id: 'product_builder',
      title: 'Product Builder Path',
      description: 'Make small, useful products with UX, scope, and iteration.',
      children: ['frontend_path', 'deployment_path'],
      branch: 'product',
      identity: 'Indie Builder',
      difficulty: 'apprentice',
      proofPrompt: 'Write a one-page project brief and ship one feature.',
    },
    {
      id: 'automation_path',
      title: 'Automation Path',
      description: 'Use code to automate repetitive tasks and workflows.',
      children: ['backend_path', 'data_path'],
      branch: 'automation',
      identity: 'Automation Hacker',
      difficulty: 'apprentice',
      proofPrompt: 'Automate one personal workflow.',
    },
    {
      id: 'react_systems',
      title: 'React Systems',
      description: 'Compose state, data fetching, forms, and reusable components.',
      children: ['design_systems', 'frontend_architecture'],
      branch: 'frontend',
      identity: 'React Engineer',
      tradeoff: 'Reusable architecture vs feature speed',
      difficulty: 'adept',
      hidden: true,
      unlockCondition: 'Unlock after repeated React/component/UI signals.',
      proofPrompt: 'Build a multi-component UI flow.',
    },
    {
      id: 'ui_animation',
      title: 'UI Animation',
      description: 'Use motion to communicate state, delight, and hierarchy.',
      children: ['design_systems'],
      branch: 'frontend',
      identity: 'Interaction Designer',
      tradeoff: 'Expressiveness vs performance',
      difficulty: 'adept',
      proofPrompt: 'Add one meaningful animation to a UI.',
    },
    {
      id: 'api_architecture',
      title: 'API Architecture',
      description: 'Design endpoints, validation, error handling, and versionable contracts.',
      children: ['reliability_engineering', 'deployment_path'],
      branch: 'backend',
      identity: 'API Engineer',
      difficulty: 'adept',
      proofPrompt: 'Document and test an API endpoint.',
    },
    {
      id: 'database_design',
      title: 'Database Design',
      description: 'Model relationships, indexes, constraints, and query patterns.',
      children: ['reliability_engineering', 'data_path'],
      branch: 'backend',
      identity: 'Data Modeler',
      difficulty: 'adept',
      proofPrompt: 'Design a schema and explain one index.',
    },
    {
      id: 'data_path',
      title: 'Data / ML Path',
      description: 'Move from data handling into analysis, models, and evaluation.',
      children: ['model_evaluation', 'ml_product'],
      branch: 'ml',
      identity: 'ML Builder',
      difficulty: 'adept',
      hidden: true,
      unlockCondition: 'Unlock after repeated Python, data, or ML signals.',
      proofPrompt: 'Analyze a dataset and explain one finding.',
    },
    {
      id: 'deployment_path',
      title: 'Deployment Path',
      description: 'Ship apps where real users can reach them.',
      children: ['reliability_engineering'],
      branch: 'ops',
      identity: 'Ship-It Engineer',
      difficulty: 'adept',
      proofPrompt: 'Deploy one project and record the URL.',
    },
    {
      id: 'design_systems',
      title: 'Design Systems',
      description: 'Create reusable UI primitives, tokens, and accessibility rules.',
      children: [],
      branch: 'frontend',
      identity: 'UI Systems Engineer',
      difficulty: 'expert',
      proofPrompt: 'Build three reusable components with variants.',
    },
    {
      id: 'frontend_architecture',
      title: 'Frontend Architecture',
      description: 'Structure state, routing, tests, and data boundaries for scale.',
      children: [],
      branch: 'frontend',
      identity: 'Frontend Architect',
      difficulty: 'legendary',
      hidden: true,
      proofPrompt: 'Refactor a project into clear frontend boundaries.',
    },
    {
      id: 'reliability_engineering',
      title: 'Reliability Engineering',
      description: 'Add observability, tests, graceful errors, and operational confidence.',
      children: [],
      branch: 'backend',
      identity: 'Reliability Engineer',
      difficulty: 'expert',
      proofPrompt: 'Add tests and logs around a failure path.',
    },
    {
      id: 'model_evaluation',
      title: 'Model Evaluation',
      description: 'Measure model quality with baselines, metrics, and error analysis.',
      children: [],
      branch: 'ml',
      identity: 'ML Evaluator',
      difficulty: 'expert',
      proofPrompt: 'Train or compare a baseline model and explain its errors.',
    },
    {
      id: 'ml_product',
      title: 'ML Product Thinking',
      description: 'Connect model behavior to user value, trust, and product constraints.',
      children: [],
      branch: 'ml',
      identity: 'AI Product Builder',
      difficulty: 'legendary',
      hidden: true,
      proofPrompt: 'Design an ML feature with evaluation and user feedback loop.',
    },
  ],
};

const defaultBlueprint: DomainBlueprint = {
  domain: 'personal-growth',
  root: {
    id: 'growth_start',
    title: 'Begin Growth Journey',
    description: 'Create a non-linear growth path around consistency, fundamentals, identity, and specialization.',
    children: ['habit_foundation', 'skill_foundation'],
    branch: 'origin',
    identity: 'Explorer',
    proofPrompt: 'State your baseline and complete one starter session.',
  },
  nodes: [
    {
      id: 'habit_foundation',
      title: 'Habit Foundation',
      description: 'Make practice repeatable before optimizing advanced outcomes.',
      children: ['consistency_path', 'accountability_path'],
      branch: 'habit',
      identity: 'Consistent Builder',
      tradeoff: 'Consistency vs intensity',
      proofPrompt: 'Log three practice sessions.',
    },
    {
      id: 'skill_foundation',
      title: 'Skill Foundation',
      description: 'Learn the core mechanics and vocabulary of the goal.',
      children: ['technical_path', 'creative_path'],
      branch: 'skill',
      identity: 'Foundation Builder',
      tradeoff: 'Technical control vs creative exploration',
      proofPrompt: 'Complete one beginner exercise and note what improved.',
    },
    {
      id: 'consistency_path',
      title: 'Consistency Path',
      description: 'Build streaks, rituals, and reliable practice slots.',
      children: ['endurance_identity', 'weekly_quest_chain'],
      branch: 'habit',
      identity: 'Habit Keeper',
      difficulty: 'apprentice',
      proofPrompt: 'Complete a three-session streak.',
    },
    {
      id: 'accountability_path',
      title: 'Accountability Path',
      description: 'Use proof, review, and external feedback to sustain growth.',
      children: ['feedback_loop', 'weekly_quest_chain'],
      branch: 'habit',
      identity: 'Accountable Learner',
      difficulty: 'apprentice',
      proofPrompt: 'Share or review one proof artifact.',
    },
    {
      id: 'technical_path',
      title: 'Technical Path',
      description: 'Prioritize precision, fundamentals, and measurable improvement.',
      children: ['specialist_identity', 'feedback_loop'],
      branch: 'technical',
      identity: 'Technician',
      difficulty: 'apprentice',
      proofPrompt: 'Measure one technical baseline.',
    },
    {
      id: 'creative_path',
      title: 'Creative Path',
      description: 'Prioritize expression, exploration, and personal style.',
      children: ['creative_identity', 'specialist_identity'],
      branch: 'creative',
      identity: 'Creative Explorer',
      difficulty: 'apprentice',
      proofPrompt: 'Create one original variation.',
    },
    {
      id: 'feedback_loop',
      title: 'Feedback Loop',
      description: 'Review proof, spot patterns, and choose the next branch deliberately.',
      children: ['adaptive_mastery'],
      branch: 'review',
      identity: 'Reflective Learner',
      difficulty: 'adept',
      proofPrompt: 'Write one review with next-step decisions.',
    },
    {
      id: 'weekly_quest_chain',
      title: 'Weekly Quest Chain',
      description: 'Turn the goal into recurring quests with rewards and constraints.',
      children: ['adaptive_mastery'],
      branch: 'quest',
      identity: 'Quest Runner',
      difficulty: 'adept',
      proofPrompt: 'Complete a weekly quest and record the result.',
    },
    {
      id: 'endurance_identity',
      title: 'Endurance Identity',
      description: 'Become the person who keeps showing up under imperfect conditions.',
      children: [],
      branch: 'identity',
      identity: 'Endurance Builder',
      difficulty: 'expert',
      proofPrompt: 'Complete a session when motivation was low.',
    },
    {
      id: 'creative_identity',
      title: 'Creative Identity',
      description: 'Develop a recognizable personal style or approach.',
      children: [],
      branch: 'identity',
      identity: 'Stylist',
      difficulty: 'expert',
      proofPrompt: 'Show three examples with a consistent personal signature.',
    },
    {
      id: 'specialist_identity',
      title: 'Specialist Identity',
      description: 'Lean into one high-signal specialization path.',
      children: ['adaptive_mastery'],
      branch: 'identity',
      identity: 'Specialist',
      difficulty: 'expert',
      proofPrompt: 'Choose one specialization and justify why it fits your behavior.',
    },
    {
      id: 'adaptive_mastery',
      title: 'Adaptive Mastery',
      description: 'Unlock future branches from repeated proof patterns instead of a static checklist.',
      children: [],
      branch: 'mastery',
      identity: 'Adaptive Master',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated proof in one identity path.',
      proofPrompt: 'Summarize the pattern your practice data reveals.',
    },
  ],
};

const blueprints: Record<string, DomainBlueprint> = {
  chess: chessBlueprint,
  boxing: boxingBlueprint,
  photography: photographyBlueprint,
  calisthenics: calisthenicsBlueprint,
  strength: calisthenicsBlueprint,
  gym: calisthenicsBlueprint,
  coding: codingBlueprint,
  machine: codingBlueprint,
  default: defaultBlueprint,
};

const adaptiveBranches: Record<string, BlueprintNode[]> = {
  calisthenics: [
    {
      id: 'adaptive_muscle_up',
      title: 'Muscle Up Pathway',
      description: 'A dynamic branch created because your proof repeatedly mentions dips, pullups, or explosive pulling.',
      children: ['adaptive_front_lever', 'adaptive_explosive_pull'],
      branch: 'calisthenics-evolution',
      identity: 'Explosive Calisthenics Athlete',
      tradeoff: 'Explosive power vs strict static control',
      difficulty: 'adept',
      proofPrompt: 'Record transition drills, high pulls, or assisted attempts.',
    },
    {
      id: 'adaptive_front_lever',
      title: 'Front Lever Basics',
      description: 'Static pulling strength branch unlocked by pullup, core, and lever signals.',
      children: ['adaptive_planche'],
      branch: 'calisthenics-evolution',
      identity: 'Static Strength Athlete',
      tradeoff: 'Isometric strength vs dynamic output',
      difficulty: 'adept',
      proofPrompt: 'Log tuck lever holds and scapular position.',
    },
    {
      id: 'adaptive_explosive_pull',
      title: 'Explosive Pulling',
      description: 'Power-focused pulling for high pulls and transition speed.',
      children: [],
      branch: 'calisthenics-evolution',
      identity: 'Power Puller',
      difficulty: 'expert',
      proofPrompt: 'Record high-pull height and rep quality.',
    },
    {
      id: 'adaptive_planche',
      title: 'Planche Prep',
      description: 'Straight-arm pushing branch for advanced bodyweight strength.',
      children: [],
      branch: 'calisthenics-evolution',
      identity: 'Planche Athlete',
      difficulty: 'expert',
      hidden: true,
      unlockCondition: 'Unlock after repeated handstand, dips, or planche-lean signals.',
      proofPrompt: 'Record planche leans and wrist readiness.',
    },
  ],
  chess: [
    {
      id: 'adaptive_tactics_identity',
      title: 'Tactical Identity Branch',
      description: 'A sharper path generated from repeated tactics, combinations, blitz, or attack signals.',
      children: ['adaptive_calculation_speed', 'adaptive_sacrifice_vision'],
      branch: 'chess-evolution',
      identity: 'Tactical Specialist',
      tradeoff: 'Sharp tactics vs long-term structure',
      difficulty: 'adept',
      proofPrompt: 'Complete a tactic set and tag each motif.',
    },
    {
      id: 'adaptive_calculation_speed',
      title: 'Calculation Speed',
      description: 'Train candidate moves and forcing lines under time pressure.',
      children: [],
      branch: 'chess-evolution',
      identity: 'Fast Calculator',
      difficulty: 'expert',
      proofPrompt: 'Record timed puzzle accuracy.',
    },
    {
      id: 'adaptive_sacrifice_vision',
      title: 'Sacrifice Vision',
      description: 'Learn when material investment creates lasting attack or initiative.',
      children: [],
      branch: 'chess-evolution',
      identity: 'Attacker',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated attack or sacrifice annotations.',
      proofPrompt: 'Annotate three sacrifices and their compensation.',
    },
  ],
  boxing: [
    {
      id: 'adaptive_counterfighter',
      title: 'Counterfighter Evolution',
      description: 'A style branch generated from repeated defense, slips, counters, or sparring signals.',
      children: ['adaptive_pressure_rounds', 'adaptive_ring_generalship'],
      branch: 'boxing-evolution',
      identity: 'Counterfighter',
      tradeoff: 'Patience vs initiative',
      difficulty: 'adept',
      proofPrompt: 'Record counter drills and the trigger for each counter.',
    },
    {
      id: 'adaptive_pressure_rounds',
      title: 'Pressure Rounds',
      description: 'Stay composed while tired, crowded, and forced to answer.',
      children: [],
      branch: 'boxing-evolution',
      identity: 'Pressure-Ready Fighter',
      difficulty: 'expert',
      proofPrompt: 'Log a fatigue round and your defensive decisions.',
    },
    {
      id: 'adaptive_ring_generalship',
      title: 'Ring Generalship',
      description: 'Choose tactics by score, range, opponent behavior, and fatigue.',
      children: [],
      branch: 'boxing-evolution',
      identity: 'Ring General',
      difficulty: 'expert',
      proofPrompt: 'Break down one sparring round by tactical decisions.',
    },
  ],
  photography: [
    {
      id: 'adaptive_visual_identity',
      title: 'Visual Identity Branch',
      description: 'A genre branch generated from repeated portrait, street, lighting, or cinematic proof.',
      children: ['adaptive_cinematic_sequence', 'adaptive_client_ready'],
      branch: 'photography-evolution',
      identity: 'Visual Storyteller',
      tradeoff: 'Personal style vs commercial clarity',
      difficulty: 'adept',
      proofPrompt: 'Curate five images that share a recognizable style.',
    },
    {
      id: 'adaptive_cinematic_sequence',
      title: 'Cinematic Sequence',
      description: 'Build a short story through lighting, color, crop, and ordering.',
      children: [],
      branch: 'photography-evolution',
      identity: 'Cinematic Artist',
      difficulty: 'expert',
      proofPrompt: 'Create a six-frame cinematic sequence.',
    },
    {
      id: 'adaptive_client_ready',
      title: 'Client-Ready Set',
      description: 'Translate your strongest genre into brief-driven deliverables.',
      children: [],
      branch: 'photography-evolution',
      identity: 'Working Photographer',
      difficulty: 'legendary',
      hidden: true,
      unlockCondition: 'Unlock after repeated portfolio, portrait, lighting, or client signals.',
      proofPrompt: 'Deliver a mock client set with a brief and selects.',
    },
  ],
  frontend: [
    {
      id: 'adaptive_react_systems',
      title: 'React Systems Branch',
      description: 'A frontend path generated from repeated React, UI, component, or animation signals.',
      children: ['adaptive_motion_design', 'adaptive_design_tokens'],
      branch: 'frontend-evolution',
      identity: 'Frontend Specialist',
      tradeoff: 'Reusable systems vs feature velocity',
      difficulty: 'adept',
      proofPrompt: 'Build a reusable component flow with state.',
    },
    {
      id: 'adaptive_motion_design',
      title: 'Motion Design',
      description: 'Use animation to communicate state and hierarchy.',
      children: [],
      branch: 'frontend-evolution',
      identity: 'Interaction Designer',
      difficulty: 'expert',
      proofPrompt: 'Add one purposeful animation and explain why it helps.',
    },
    {
      id: 'adaptive_design_tokens',
      title: 'Design Tokens',
      description: 'Create reusable visual decisions for color, spacing, type, and motion.',
      children: [],
      branch: 'frontend-evolution',
      identity: 'UI Systems Engineer',
      difficulty: 'expert',
      proofPrompt: 'Define tokens and use them in three components.',
    },
  ],
  backend: [
    {
      id: 'adaptive_api_architecture',
      title: 'API Architecture Branch',
      description: 'A backend path generated from repeated API, database, or reliability signals.',
      children: ['adaptive_database_indexing', 'adaptive_background_jobs'],
      branch: 'backend-evolution',
      identity: 'Backend Specialist',
      tradeoff: 'System correctness vs shipping speed',
      difficulty: 'adept',
      proofPrompt: 'Design and test a validated API route.',
    },
    {
      id: 'adaptive_database_indexing',
      title: 'Database Indexing',
      description: 'Tune data access around real query patterns.',
      children: [],
      branch: 'backend-evolution',
      identity: 'Data Modeler',
      difficulty: 'expert',
      proofPrompt: 'Explain an index with before/after query behavior.',
    },
    {
      id: 'adaptive_background_jobs',
      title: 'Background Jobs',
      description: 'Move slow work into reliable queues and retries.',
      children: [],
      branch: 'backend-evolution',
      identity: 'Reliability Engineer',
      difficulty: 'expert',
      proofPrompt: 'Implement or design a retryable job flow.',
    },
  ],
  machine: [
    {
      id: 'adaptive_model_eval',
      title: 'Model Evaluation Branch',
      description: 'An ML path generated from repeated data, model, Python, or experiment signals.',
      children: ['adaptive_error_analysis', 'adaptive_mlops'],
      branch: 'ml-evolution',
      identity: 'ML Builder',
      tradeoff: 'Experiment speed vs evaluation rigor',
      difficulty: 'adept',
      proofPrompt: 'Compare a model to a baseline with a clear metric.',
    },
    {
      id: 'adaptive_error_analysis',
      title: 'Error Analysis',
      description: 'Find where the model fails and what data or features would help.',
      children: [],
      branch: 'ml-evolution',
      identity: 'Model Diagnostician',
      difficulty: 'expert',
      proofPrompt: 'Categorize model errors and pick one improvement.',
    },
    {
      id: 'adaptive_mlops',
      title: 'MLOps Pipeline',
      description: 'Track data, experiments, deployment, and monitoring.',
      children: [],
      branch: 'ml-evolution',
      identity: 'MLOps Engineer',
      difficulty: 'legendary',
      hidden: true,
      proofPrompt: 'Design an experiment tracking and deployment loop.',
    },
  ],
};

export function parseInterests(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((item) => normalize(item))
    .filter(Boolean)
    .slice(0, 8);
}

export function inferDomain(goal: string, interests: string[]): string {
  const haystack = normalize([goal, ...interests].join(' '));
  const entries = [
    ['chess', ['chess', 'opening', 'tactics', 'checkmate', 'rating', 'blunder']],
    ['boxing', ['boxing', 'boxer', 'sparring', 'fight', 'jab', 'guard', 'counterpunch']],
    ['photography', ['photography', 'photo', 'camera', 'portrait', 'street photography', 'shutter', 'aperture']],
    ['machine', ['machine learning', 'ml', 'ai', 'data science']],
    ['calisthenics', ['calisthenics', 'pullup', 'pull-up', 'dip', 'handstand', 'muscle up']],
    ['strength', ['stronger', 'strength', 'lifting', 'gym', 'fitness', 'pushup']],
    ['coding', ['coding', 'programming', 'developer', 'software', 'react', 'frontend', 'backend']],
    ['drawing', ['drawing', 'art', 'sketch', 'illustration']],
    ['guitar', ['guitar', 'music', 'song']],
    ['speaking', ['public speaking', 'presentation', 'speaking']],
  ] as const;

  return entries.find(([, terms]) => terms.some((term) => haystack.includes(term)))?.[0] ?? 'default';
}

function slug(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildNodeFromBlueprint(
  blueprint: BlueprintNode,
  id: string,
  prerequisites: string[],
  position: { x: number; y: number },
): SkillNode {
  const difficulty = blueprint.difficulty ?? (prerequisites.length === 0 ? 'starter' : 'apprentice');
  return {
    id,
    title: blueprint.title,
    description: blueprint.description,
    difficulty,
    xp: difficultyXp[difficulty],
    estimatedHours: difficulty === 'starter' ? 1 : difficulty === 'apprentice' ? 2 : difficulty === 'adept' ? 4 : difficulty === 'expert' ? 7 : 12,
    prerequisites,
    proof: {
      type: difficulty === 'expert' || difficulty === 'legendary' ? 'metric' : 'journal',
      prompt: blueprint.proofPrompt ?? 'Upload proof or write what you practiced and what improved.',
    },
    tips: blueprint.tips ?? createDefaultTips(blueprint.title, blueprint.identity),
    branch: blueprint.branch,
    identity: blueprint.identity,
    tradeoff: blueprint.tradeoff,
    unlockCondition: blueprint.unlockCondition,
    rarity: difficulty === 'legendary' ? 'legendary' : difficulty === 'expert' ? 'epic' : difficulty === 'adept' ? 'rare' : 'common',
    hidden: blueprint.hidden,
    status: prerequisites.length === 0 ? 'unlocked' : 'locked',
    position,
  };
}

export function generateSkillTree(input: GoalInput, now = new Date().toISOString()): SkillTree {
  const interests = parseInterests(input.interests);
  const domain = inferDomain(input.title, interests);
  const rootId = slug(input.title) || 'personal-growth';
  const blueprint = blueprints[domain] ?? defaultBlueprint;
  const layout = layoutBlueprint(blueprint);
  const root = buildNodeFromBlueprint(
    {
      ...blueprint.root,
      title: input.title,
      description: `${blueprint.root.description} Central quest: "${input.title}".`,
    },
    `${rootId}-${blueprint.root.id}`,
    [],
    layout.get(blueprint.root.id) ?? { x: 0, y: 260 },
  );
  const nodes = [root];
  const edges: SkillEdge[] = [];
  const allBlueprintNodes = [blueprint.root, ...blueprint.nodes];
  const nodeByBlueprintId = new Map(allBlueprintNodes.map((node) => [node.id, node]));
  const appIdByBlueprintId = new Map(allBlueprintNodes.map((node) => [node.id, `${rootId}-${node.id}`]));

  blueprint.nodes.forEach((blueprintNode) => {
    const prerequisites = allBlueprintNodes
      .filter((candidate) => candidate.children.includes(blueprintNode.id))
      .map((candidate) => appIdByBlueprintId.get(candidate.id)!)
      .filter(Boolean);
    nodes.push(
      buildNodeFromBlueprint(
        blueprintNode,
        appIdByBlueprintId.get(blueprintNode.id)!,
        prerequisites,
        layout.get(blueprintNode.id) ?? { x: 240, y: 260 },
      ),
    );
  });

  allBlueprintNodes.forEach((source) => {
    source.children.forEach((targetId) => {
      const sourceId = appIdByBlueprintId.get(source.id);
      const target = nodeByBlueprintId.get(targetId);
      const targetAppId = appIdByBlueprintId.get(targetId);
      if (sourceId && target && targetAppId) {
        edges.push({ id: `${sourceId}-${targetAppId}`, source: sourceId, target: targetAppId });
      }
    });
  });

  return {
    id: `${rootId}-${Date.now().toString(36)}`,
    generationSource: 'blueprint',
    palette: getPaletteForGoal(input.title, domain),
    rootGoal: input.title,
    experienceLevel: input.experienceLevel,
    weeklyHours: input.weeklyHours,
    interests,
    nodes,
    edges,
    progress: [],
    achievements: [],
    totalXp: 0,
    level: 1,
    streak: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function layoutBlueprint(blueprint: DomainBlueprint): Map<string, { x: number; y: number }> {
  const allNodes = [blueprint.root, ...blueprint.nodes];
  const byId = new Map(allNodes.map((node) => [node.id, node]));
  const depth = new Map<string, number>([[blueprint.root.id, 0]]);
  const queue = [blueprint.root.id];

  while (queue.length) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current) ?? 0;
    byId.get(current)?.children.forEach((child) => {
      const nextDepth = currentDepth + 1;
      if (!depth.has(child) || nextDepth < depth.get(child)!) {
        depth.set(child, nextDepth);
        queue.push(child);
      }
    });
  }

  const columns = new Map<number, string[]>();
  allNodes.forEach((node) => {
    const column = depth.get(node.id) ?? 1;
    columns.set(column, [...(columns.get(column) ?? []), node.id]);
  });

  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((ids, column) => {
    const spacing = Math.max(145, 720 / Math.max(ids.length, 1));
    const startY = 360 - ((ids.length - 1) * spacing) / 2;
    ids.forEach((id, index) => {
      positions.set(id, { x: column * 250, y: startY + index * spacing });
    });
  });
  return positions;
}

export function getPaletteForGoal(goal: string, domain = inferDomain(goal, [])): TreePalette {
  const text = normalize(`${goal} ${domain}`);
  if (/(love|crush|dating|romance|relationship|social|confidence|friend)/.test(text)) {
    return {
      name: 'Cherry Blossom',
      primary: '#fb7185',
      secondary: '#f9a8d4',
      accent: '#fecdd3',
      background: '#24111d',
      surface: '#3b1729',
      text: '#fff1f5',
    };
  }
  if (/(garden|plant|nature|outdoor|earth)/.test(text)) {
    return {
      name: 'Garden Grove',
      primary: '#65a30d',
      secondary: '#84cc16',
      accent: '#bef264',
      background: '#101a0b',
      surface: '#1f2f14',
      text: '#f7fee7',
    };
  }
  if (domain === 'photography' || /(photo|camera|portrait|cinematic)/.test(text)) {
    return {
      name: 'Golden Hour',
      primary: '#f59e0b',
      secondary: '#fb7185',
      accent: '#fde68a',
      background: '#1f1308',
      surface: '#34200f',
      text: '#fff7ed',
    };
  }
  if (domain === 'chess' || /chess/.test(text)) {
    return {
      name: 'Ivory Board',
      primary: '#e7d8b1',
      secondary: '#8b5e34',
      accent: '#facc15',
      background: '#16110b',
      surface: '#2a1f14',
      text: '#fff8e7',
    };
  }
  if (domain === 'boxing' || /boxing|fight|spar/.test(text)) {
    return {
      name: 'Red Corner',
      primary: '#ef4444',
      secondary: '#f97316',
      accent: '#fecaca',
      background: '#1f0b0b',
      surface: '#351313',
      text: '#fff1f2',
    };
  }
  if (domain === 'calisthenics' || domain === 'strength' || /workout|gym|strong/.test(text)) {
    return {
      name: 'Iron Pulse',
      primary: '#22d3ee',
      secondary: '#818cf8',
      accent: '#a7f3d0',
      background: '#07131f',
      surface: '#102235',
      text: '#ecfeff',
    };
  }
  if (domain === 'coding' || domain === 'machine' || /coding|programming|ai|machine/.test(text)) {
    return {
      name: 'Neon Terminal',
      primary: '#22c55e',
      secondary: '#38bdf8',
      accent: '#bbf7d0',
      background: '#04140c',
      surface: '#0b2517',
      text: '#ecfdf5',
    };
  }
  return {
    name: 'Astral Blue',
    primary: '#6ee7ff',
    secondary: '#a78bfa',
    accent: '#a7f3d0',
    background: '#060a12',
    surface: '#0f172a',
    text: '#ecf4ff',
  };
}

function createDefaultTips(title: string, identity?: string): string[] {
  return [
    `Keep the next attempt small enough to do this week.`,
    `After practicing ${title}, write one thing that felt easier and one thing that still feels unclear.`,
    identity ? `Act like a ${identity}: choose proof that shows the identity in action.` : 'Capture proof that shows action, not just intention.',
  ];
}

export function completeNode(
  tree: SkillTree,
  nodeId: string,
  note: string,
  focusTags: string[],
  proofUrl?: string,
  now = new Date().toISOString(),
): SkillTree {
  const node = tree.nodes.find((item) => item.id === nodeId);
  if (!node || node.status !== 'unlocked') {
    throw new Error('Skill is not unlocked yet.');
  }

  const progress: ProgressEntry = {
    id: `${nodeId}-${Date.now().toString(36)}`,
    nodeId,
    note,
    focusTags: focusTags.map(normalize).filter(Boolean),
    proofUrl,
    completedAt: now,
    xpAwarded: node.xp,
  };
  const completed = new Set([...tree.progress.map((entry) => entry.nodeId), nodeId]);
  const nodes = tree.nodes.map((item) => {
    if (item.id === nodeId) {
      return { ...item, status: 'complete' as const, hidden: false };
    }
    const canUnlock = item.prerequisites.every((prerequisite) => completed.has(prerequisite));
    return canUnlock && item.status === 'locked' ? { ...item, status: 'unlocked' as const, hidden: false } : item;
  });
  const totalXp = tree.totalXp + node.xp;
  const level = Math.floor(totalXp / 250) + 1;
  const achievements = unlockAchievements(tree.achievements, totalXp, completed.size, now);

  return {
    ...tree,
    nodes,
    progress: [progress, ...tree.progress],
    achievements,
    totalXp,
    level,
    streak: tree.streak + 1,
    updatedAt: now,
  };
}

function unlockAchievements(existing: Achievement[], totalXp: number, completedCount: number, now: string): Achievement[] {
  const achieved = new Set(existing.map((item) => item.id));
  const next = [...existing];
  const maybeAdd = (id: string, title: string, description: string) => {
    if (!achieved.has(id)) {
      next.push({ id, title, description, unlockedAt: now });
    }
  };

  if (completedCount >= 1) maybeAdd('first-step', 'First Step', 'Completed the first skill node.');
  if (completedCount >= 5) maybeAdd('branch-runner', 'Branch Runner', 'Completed five skill nodes.');
  if (totalXp >= 500) maybeAdd('level-forged', 'Level Forged', 'Earned 500 total XP.');

  return next;
}

export function adaptSkillTree(
  tree: SkillTree,
  signals: string[],
  now = new Date().toISOString(),
): SkillTree {
  const combinedSignals = [...signals, ...tree.progress.flatMap((entry) => entry.focusTags), ...tree.interests];
  const focus = inferAdaptiveFocus(combinedSignals);
  const additions = adaptiveBranches[focus] ?? adaptiveBranches.frontend;
  const rootId = tree.nodes[0]?.id.replace('-root', '') ?? slug(tree.rootGoal);
  const existingTitles = new Set(tree.nodes.map((node) => normalize(node.title)));
  const completed = new Set(tree.nodes.filter((node) => node.status === 'complete').map((node) => node.id));
  const anchor =
    [...tree.nodes].reverse().find((node) => node.status === 'complete') ??
    tree.nodes.find((node) => node.branch === 'root') ??
    tree.nodes[0];
  const adaptiveTitles = new Set(additions.map((node) => normalize(node.title)));
  const nodes = tree.nodes.map((node) => {
    if (!adaptiveTitles.has(normalize(node.title))) return node;
    const signalUnlocks = anchor.status === 'complete' || node.prerequisites.every((prerequisite) => completed.has(prerequisite));
    return {
      ...node,
      hidden: false,
      status: node.status === 'complete' ? node.status : signalUnlocks ? ('unlocked' as const) : node.status,
    };
  });
  const edges = [...tree.edges];
  const idMap = new Map(additions.map((node) => [node.id, `${rootId}-${node.id}`]));
  const anchorChildren = additions.filter((candidate) => !additions.some((other) => other.children.includes(candidate.id)));

  additions.forEach((blueprint, index) => {
    if (existingTitles.has(normalize(blueprint.title))) return;
    const parents = additions
      .filter((candidate) => candidate.children.includes(blueprint.id))
      .map((candidate) => idMap.get(candidate.id)!)
      .filter(Boolean);
    const prerequisites = parents.length ? parents : [anchor.id];
    const node = buildNodeFromBlueprint(blueprint, idMap.get(blueprint.id)!, prerequisites, {
      x: 500 + index * 250,
      y: 660 + (index % 2) * 155,
    });
    node.status = node.prerequisites.every((prerequisite) => completed.has(prerequisite)) ? 'unlocked' : 'locked';
    nodes.push(node);
  });

  anchorChildren.forEach((child) => {
    const targetId = idMap.get(child.id);
    if (targetId && !edges.some((edge) => edge.source === anchor.id && edge.target === targetId)) {
      edges.push({ id: `${anchor.id}-${targetId}`, source: anchor.id, target: targetId });
    }
  });
  additions.forEach((source) => {
    source.children.forEach((targetId) => {
      const sourceId = idMap.get(source.id);
      const targetAppId = idMap.get(targetId);
      if (sourceId && targetAppId && !edges.some((edge) => edge.source === sourceId && edge.target === targetAppId)) {
        edges.push({ id: `${sourceId}-${targetAppId}`, source: sourceId, target: targetAppId });
      }
    });
  });

  return {
    ...tree,
    interests: Array.from(new Set([...tree.interests, focus])),
    nodes,
    edges,
    updatedAt: now,
  };
}

function inferAdaptiveFocus(signals: string[]): string {
  const text = signals.map(normalize).join(' ');
  const candidates = [
    ['chess', ['chess', 'tactic', 'fork', 'pin', 'opening', 'endgame', 'blunder', 'rating']],
    ['boxing', ['boxing', 'spar', 'jab', 'guard', 'slip', 'counter', 'fight', 'round']],
    ['photography', ['photo', 'camera', 'portrait', 'street', 'lighting', 'cinematic', 'aperture']],
    ['calisthenics', ['calisthenics', 'pushup', 'push-up', 'dip', 'pullup', 'pull-up', 'handstand', 'front lever']],
    ['frontend', ['frontend', 'react', 'ui', 'animation', 'css', 'component']],
    ['backend', ['backend', 'api', 'database', 'server', 'queue']],
    ['machine', ['machine', 'model', 'data', 'python', 'neural']],
    ['nutrition', ['nutrition', 'protein', 'meal', 'macro']],
    ['speaking', ['speech', 'speaking', 'presentation', 'audience']],
  ] as const;

  return candidates.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] ?? 'frontend';
}
