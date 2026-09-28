export const STEP_ORANGE = '#f5a938'
export const PLAN_ORANGE = '#ff7a3d'

export interface Symptom {
  key: string
  label: string
  checked: boolean
}

export interface TitledItem {
  title: string
  body: string
}

export interface HowItWorksStep extends TitledItem {
  number: number
  color: string
  chips: string[]
}

export interface FixExampleState extends TitledItem {
  chips: string[]
  code: string
  score: number
  scoreLabel: string
  scoreNote: string
}

export type FixExampleView = 'before' | 'after'

export interface UnderHoodItem extends TitledItem {
  eyebrow: string
  accent: string
}

export interface FaqItem {
  question: string
  answer: string
}

export const SYMPTOMS: Symptom[] = [
  { key: 'slow', label: 'slow af', checked: true },
  { key: 'broken', label: 'broken on phones', checked: true },
  { key: 'overlap', label: 'stuff overlapping', checked: true },
  { key: 'sideways', label: 'scrolls sideways', checked: false },
  { key: 'flashing', label: 'fonts flashing', checked: false },
  { key: 'jumps', label: 'layout jumps around', checked: true },
  { key: 'images', label: 'images take ages', checked: false },
]

export const CHECKUP_TABS = ['Link', 'Paste code', 'Screenshot'] as const

export type CheckupTab = (typeof CHECKUP_TABS)[number]

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    number: 1,
    color: 'secondary.main',
    title: 'Drop it in',
    body: "Paste your site's link, paste some code, or drop a screenshot of the mess. Any combo works. More info means a sharper diagnosis.",
    chips: ['a link', 'code', 'a screenshot'],
  },
  {
    number: 2,
    color: STEP_ORANGE,
    title: 'We run the checkup',
    body: 'We open your site on a real phone and a real laptop, time every request, weigh every image and script, and hunt for overlaps and sideways scroll.',
    chips: ['phone + laptop', 'every request'],
  },
  {
    number: 3,
    color: 'success.main',
    title: 'You get the diagnosis',
    body: "Two scores, every problem in plain English, and copy-paste fixes ranked by how much they'll help. Tick them off as you go.",
    chips: ['scores', 'fixes with code'],
  },
]

export const WHY_SLOW_ITEMS: TitledItem[] = [
  { title: 'Render-blocking scripts', body: 'JavaScript that stops the page from showing until it loads.' },
  { title: 'Chonky images', body: 'Huge PNGs and JPGs that could be a fraction of the size.' },
  { title: 'Bloated bundles', body: 'Whole libraries shipped for one function.' },
  { title: 'Fonts that ghost you', body: 'Text that stays invisible while fonts download.' },
  { title: 'Slow servers and redirects', body: 'Time wasted before the first byte even arrives.' },
]

export const WHY_BROKEN_ITEMS: TitledItem[] = [
  { title: 'Overlapping elements', body: 'Navs, buttons and text stacked on top of each other.' },
  { title: 'Sideways scroll', body: 'Something wider than the screen pushing everything off.' },
  { title: 'Layout jumps', body: 'Content shoving down as images and ads load in.' },
  { title: 'Phone-only bugs', body: 'Fine on your laptop, a disaster on a real phone.' },
  { title: 'Clipped or tiny text', body: 'Words cut off, or too small to read.' },
]

export const FIX_EXAMPLE: Record<FixExampleView, FixExampleState> = {
  before: {
    chips: ['big yikes', 'broken', 'example'],
    title: 'Nav sits on top of the headline on phones',
    body: "The nav has a fixed 1200px width and absolute position, so on a 390px phone it spills across the headline and makes the whole page scroll sideways.",
    code: '.nav {\n  position: absolute;\n  width: 1200px;\n}',
    score: 58,
    scoreLabel: 'Looks score',
    scoreNote: 'phones are suffering',
  },
  after: {
    chips: ['fixed', 'clean', 'example'],
    title: 'Nav stacks neatly above the headline',
    body: "Swapping to a relative position with a max-width lets the nav wrap to the screen, so nothing spills and the page stops scrolling sideways.",
    code: '.nav {\n  position: relative;\n  max-width: 100%;\n}',
    score: 94,
    scoreLabel: 'Looks score',
    scoreNote: 'phones are happy',
  },
}

export const UNDER_HOOD_ITEMS: UnderHoodItem[] = [
  {
    eyebrow: '01 / real browser',
    title: 'Playwright + Chrome',
    body: 'Loads your page like a real visitor at phone and laptop sizes, screenshots both, and records every network request.',
    accent: 'secondary.main',
  },
  {
    eyebrow: '02 / speed metrics',
    title: 'Lighthouse data',
    body: "The same LCP, CLS and blocking-time numbers Google uses, so your speed score isn't made up.",
    accent: STEP_ORANGE,
  },
  {
    eyebrow: '03 / the diagnosis',
    title: 'AI that reads your code',
    body: 'Looks at your code, the screenshots and the numbers together, explains the cause, and writes the fix.',
    accent: 'success.main',
  },
]

export const PRIVACY_ITEMS: TitledItem[] = [
  { title: 'Never used for training', body: 'Your code and screenshots are only used for your checkup.' },
  { title: 'Deleted after 30 days', body: 'Uploads are wiped automatically. Your saved diagnosis stays until you delete it.' },
  { title: 'One-click delete', body: 'Remove any checkup, or your whole account, any time.' },
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is it free?',
    answer: "Yes, you can run checkups for free. Heavy users may hit a daily limit, and we'll tell you clearly if you do.",
  },
  {
    question: 'What frameworks does it work with?',
    answer: 'Any of them. We load the page in a real browser, so React, Vue, Svelte, plain HTML — it all works the same way.',
  },
  {
    question: 'Can it check pages behind a login?',
    answer: "Not yet — for now we can only check pages that are publicly reachable without signing in first.",
  },
  {
    question: 'How accurate is it?',
    answer: 'The scores come from the same engines Google uses (Lighthouse), and every visual issue is backed by a real screenshot, not a guess.',
  },
  {
    question: 'Do I need to install anything?',
    answer: "No installs — everything runs in your browser. Paste a link, code, or screenshot and you're done.",
  },
]
