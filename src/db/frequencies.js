// Sageduste andmebaas - struktuur näidisandmetega
// Päris andmed sisestatakse teie poolt eraldi

export const CATEGORIES = [
  { id: 'trust', label: 'Usaldus / Trust' },
  { id: 'anxiety', label: 'Ärevus / Anxiety' },
  { id: 'nervous', label: 'Närvisüsteem' },
  { id: 'emotion', label: 'Emotsioonid' },
  { id: 'thoughts', label: 'Mõttemustrid' },
  { id: 'trauma', label: 'Trauma / Šokk' },
  { id: 'joy', label: 'Rõõm / Rahulikkus' },
  { id: 'sleep', label: 'Uni / Taastumine' },
];

export const FREQUENCIES = [
  { id: 'F001', name: 'Distrust', categories: ['trust'], description: 'General distrust of someone or something (not trusting life, oneself, or other people).' },
  { id: 'F002', name: 'Mistrust', categories: ['trust'], description: 'Active suspicion or doubt toward a person, system, or situation.' },
  { id: 'F003', name: 'Self-doubt', categories: ['trust', 'emotion'], description: 'Lack of confidence in one\'s own abilities, judgement, or worth.' },
  { id: 'F004', name: 'Betrayal', categories: ['trust', 'emotion'], description: 'Deep wound from trust being broken by another person or institution.' },
  { id: 'F005', name: 'Control need', categories: ['trust', 'anxiety'], description: 'Compulsive need to control outcomes, environments or other people.' },
  { id: 'F006', name: 'Suspicion', categories: ['trust'], description: 'Persistent tendency to question the motives of others without clear cause.' },
  { id: 'F007', name: 'Hypervigilance', categories: ['trust', 'nervous'], description: 'State of heightened alertness and scanning for threats, often chronic.' },
  { id: 'F008', name: 'Fear of vulnerability', categories: ['trust', 'emotion'], description: 'Avoidance of openness or emotional exposure to protect against being hurt.' },
  { id: 'F009', name: 'Anxiety generalised', categories: ['anxiety'], description: 'Persistent and excessive worry about a number of different things.' },
  { id: 'F010', name: 'Panic response', categories: ['anxiety', 'nervous'], description: 'Acute activation of the fight-or-flight response without clear external cause.' },
  { id: 'F011', name: 'Vagus nerve', categories: ['nervous'], description: 'Regulation of the parasympathetic nervous system, rest and digest functions.' },
  { id: 'F012', name: 'Limbic system', categories: ['nervous', 'emotion'], description: 'Emotional memory, threat detection and attachment system regulation.' },
  { id: 'F013', name: 'Pineal gland', categories: ['nervous'], description: 'Circadian rhythm, melatonin regulation and deep integration functions.' },
  { id: 'F014', name: 'Theta wave', categories: ['nervous'], description: 'Brain wave state associated with deep relaxation, creativity and memory consolidation.' },
  { id: 'F015', name: 'Adrenal glands', categories: ['nervous', 'emotion'], description: 'Stress hormone regulation (cortisol, adrenaline) and energy management.' },
  { id: 'F016', name: 'Amygdala', categories: ['nervous', 'emotion', 'trauma'], description: 'Fear processing and threat response centre in the brain.' },
  { id: 'F017', name: 'Prefrontal cortex', categories: ['nervous', 'thoughts'], description: 'Executive function, decision-making, planning and emotional regulation.' },
  { id: 'F018', name: 'Obsessive thoughts', categories: ['thoughts'], description: 'Repetitive, intrusive thought patterns that loop without resolution.' },
  { id: 'F019', name: 'Rumination', categories: ['thoughts', 'emotion'], description: 'Dwelling on past events or mistakes, replaying situations repeatedly.' },
  { id: 'F020', name: 'Shock', categories: ['trauma'], description: 'Acute or chronic state of overwhelm following a distressing event.' },
  { id: 'F021', name: 'Trauma response', categories: ['trauma', 'nervous'], description: 'Stored physiological and emotional response to overwhelming experiences.' },
  { id: 'F022', name: 'Joy', categories: ['joy'], description: 'Capacity to experience spontaneous positive emotion and aliveness.' },
  { id: 'F023', name: 'Calm', categories: ['joy'], description: 'Ability to access inner stillness and stability independent of circumstances.' },
  { id: 'F024', name: 'Sleep quality', categories: ['sleep'], description: 'Depth, continuity and restorative quality of sleep cycles.' },
];
