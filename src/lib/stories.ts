/**
 * Read Along stories: Aesop's fables (public domain), retold in our own simple words, separately in English
 * and Dutch. Four levels by sentence length: 1 three to five words, 2 up to seven, 3 up to ten, 4 longer
 * sentences with "but" and "because". Each sentence has an emoji scene, so a pre-reader can guess from the
 * picture as in a picture book. No digits or abbreviations: speech recognition writes those differently.
 * Emoji are from Unicode 13 or older, so older iPads draw them too.
 */
import type { Language } from './words';

export { READ_LEVELS } from './limits';

export interface Sentence {
	scene: string;
	text: string;
}
export interface Story {
	id: string;
	level: number;
	cover: string;
	title: Record<Language, string>;
	sentences: Record<Language, Sentence[]>;
}

const s = (scene: string, text: string): Sentence => ({ scene, text });

export const STORIES: Story[] = [
	{
		id: 'lion-mouse',
		level: 1,
		cover: '🦁🐭',
		title: { en: 'The Lion and the Mouse', nl: 'De leeuw en het muisje' },
		sentences: {
			en: [
				s('🦁😴', 'The lion is asleep.'),
				s('🐭🦁', 'A mouse runs on him.'),
				s('🦁🐭', 'The lion grabs the mouse.'),
				s('🐭🙏', '"Please let me go!"'),
				s('🦁🙂', 'The lion lets her go.'),
				s('🦁🕸️', 'Then the lion is caught.'),
				s('🐭🕸️', 'The mouse bites him free.'),
				s('🦁❤️🐭', 'Little friends can help too.')
			],
			nl: [
				s('🦁😴', 'De leeuw slaapt.'),
				s('🐭🦁', 'Een muisje rent over hem.'),
				s('🦁🐭', 'De leeuw pakt het muisje.'),
				s('🐭🙏', '"Laat me alsjeblieft gaan!"'),
				s('🦁🙂', 'De leeuw laat haar gaan.'),
				s('🦁🕸️', 'Dan zit de leeuw vast.'),
				s('🐭🕸️', 'Het muisje bijt hem los.'),
				s('🦁❤️🐭', 'Kleine vrienden kunnen ook helpen.')
			]
		}
	},
	{
		id: 'dog-bone',
		level: 1,
		cover: '🐶🦴',
		title: { en: 'The Dog and his Bone', nl: 'De hond en zijn bot' },
		sentences: {
			en: [
				s('🐶🦴', 'The dog has a bone.'),
				s('🐶🌉', 'He walks over a bridge.'),
				s('🐶💧', 'He sees a dog below.'),
				s('💧🦴', 'That dog has a bone.'),
				s('🐶😠', '"I want that bone!"'),
				s('🐶🗯️', 'He barks: woof!'),
				s('🦴💦', 'His bone falls down.'),
				s('🐶💧', 'The other dog was him.'),
				s('🐶🙂', 'Be happy with yours.')
			],
			nl: [
				s('🐶🦴', 'De hond heeft een bot.'),
				s('🐶🌉', 'Hij loopt over een brug.'),
				s('🐶💧', 'Hij ziet een hond beneden.'),
				s('💧🦴', 'Die hond heeft een bot.'),
				s('🐶😠', '"Ik wil dat bot!"'),
				s('🐶🗯️', 'Hij blaft: waf!'),
				s('🦴💦', 'Zijn bot valt erin.'),
				s('🐶💧', 'De andere hond was hijzelf.'),
				s('🐶🙂', 'Wees blij met het jouwe.')
			]
		}
	},
	{
		id: 'fox-grapes',
		level: 1,
		cover: '🦊🍇',
		title: { en: 'The Fox and the Grapes', nl: 'De vos en de druiven' },
		sentences: {
			en: [
				s('🦊😋', 'The fox is hungry.'),
				s('🍇🌳', 'He sees grapes up high.'),
				s('🦊⬆️', 'He jumps and jumps.'),
				s('🍇☁️', 'The grapes are too high.'),
				s('🦊😒', '"They are sour," he says.'),
				s('🦊🚶', 'And he walks away.'),
				s('🦊🤫', 'But he did want them!')
			],
			nl: [
				s('🦊😋', 'De vos heeft honger.'),
				s('🍇🌳', 'Hij ziet hoog druiven hangen.'),
				s('🦊⬆️', 'Hij springt en springt.'),
				s('🍇☁️', 'De druiven zijn te hoog.'),
				s('🦊😒', '"Ze zijn zuur," zegt hij.'),
				s('🦊🚶', 'En hij loopt weg.'),
				s('🦊🤫', 'Maar hij wilde ze wel!')
			]
		}
	},
	{
		id: 'tortoise-hare',
		level: 2,
		cover: '🐢🐇',
		title: { en: 'The Tortoise and the Hare', nl: 'De haas en de schildpad' },
		sentences: {
			en: [
				s('🐇😆🐢', 'The hare laughs at the slow tortoise.'),
				s('🐢🏁', '"Let us have a race," she says.'),
				s('🐇💨', 'The hare runs off very fast.'),
				s('🐇😴🌳', 'He stops to sleep under a tree.'),
				s('🐢🐾', 'The tortoise walks on and on.'),
				s('🐢🐇', 'She walks past the sleeping hare.'),
				s('🐇😲', 'The hare wakes up, but too late.'),
				s('🐢🏆', 'Slow and steady wins the race.')
			],
			nl: [
				s('🐇😆🐢', 'De haas lacht om de trage schildpad.'),
				s('🐢🏁', '"Zullen we een wedstrijd doen?" zegt ze.'),
				s('🐇💨', 'De haas rent heel snel weg.'),
				s('🐇😴🌳', 'Hij gaat slapen onder een boom.'),
				s('🐢🐾', 'De schildpad loopt door en door.'),
				s('🐢🐇', 'Ze loopt langs de slapende haas.'),
				s('🐇😲', 'De haas wordt wakker, maar te laat.'),
				s('🐢🏆', 'Langzaam maar zeker wint de race.')
			]
		}
	},
	{
		id: 'crow-pitcher',
		level: 2,
		cover: '🐦🏺',
		title: { en: 'The Crow and the Jug', nl: 'De kraai en de kruik' },
		sentences: {
			en: [
				s('🐦☀️', 'It is hot. The crow is thirsty.'),
				s('🐦🏺', 'She finds a jug with some water.'),
				s('🐦🏺', 'Her beak cannot reach the water.'),
				s('🐦💡', 'Then she has an idea.'),
				s('🪨🏺', 'She drops a stone in the jug.'),
				s('🪨🪨🪨', 'And another stone, and another!'),
				s('💧⬆️', 'The water comes up and up.'),
				s('🐦💧', 'Now she can drink.'),
				s('💡💪', 'Thinking helps more than being strong.')
			],
			nl: [
				s('🐦☀️', 'Het is warm. De kraai heeft dorst.'),
				s('🐦🏺', 'Ze vindt een kruik met wat water.'),
				s('🐦🏺', 'Haar snavel kan er niet bij.'),
				s('🐦💡', 'Dan krijgt ze een idee.'),
				s('🪨🏺', 'Ze gooit een steentje in de kruik.'),
				s('🪨🪨🪨', 'Nog een steentje, en nog een!'),
				s('💧⬆️', 'Het water komt hoger en hoger.'),
				s('🐦💧', 'Nu kan ze drinken.'),
				s('💡💪', 'Slim denken helpt meer dan kracht.')
			]
		}
	},
	{
		id: 'boy-wolf',
		level: 2,
		cover: '👦🐺',
		title: { en: 'The Boy Who Cried Wolf', nl: 'De jongen die wolf riep' },
		sentences: {
			en: [
				s('👦🐑', 'A boy looks after the sheep.'),
				s('👦😆', '"Wolf! Wolf!" he shouts for fun.'),
				s('🏃🏃', 'The people run to help him.'),
				s('🤷', 'But there is no wolf.'),
				s('👦😆', 'The next day he does it again.'),
				s('🐺🐑', 'Then a real wolf comes.'),
				s('👦📢', '"Wolf! Wolf!" shouts the boy.'),
				s('🙉', 'This time nobody comes to help.'),
				s('🤥', 'If you lie, people stop believing you.')
			],
			nl: [
				s('👦🐑', 'Een jongen past op de schapen.'),
				s('👦😆', '"Wolf! Wolf!" roept hij voor de grap.'),
				s('🏃🏃', 'De mensen rennen om te helpen.'),
				s('🤷', 'Maar er is geen wolf.'),
				s('👦😆', 'De volgende dag doet hij het weer.'),
				s('🐺🐑', 'Dan komt er een echte wolf.'),
				s('👦📢', '"Wolf! Wolf!" roept de jongen.'),
				s('🙉', 'Nu komt er niemand helpen.'),
				s('🤥', 'Wie liegt, wordt niet meer geloofd.')
			]
		}
	},
	{
		id: 'ant-grasshopper',
		level: 3,
		cover: '🐜🦗',
		title: { en: 'The Ant and the Grasshopper', nl: 'De mier en de sprinkhaan' },
		sentences: {
			en: [
				s('☀️🦗🎵', 'All summer the grasshopper sings and plays in the sun.'),
				s('🐜🌾', 'The ant works hard and carries food to her home.'),
				s('🦗🐜', '"Come and play with me!" says the grasshopper.'),
				s('🐜🌾', '"I am saving food for the winter," says the ant.'),
				s('❄️☃️', 'Then winter comes and there is snow everywhere.'),
				s('🦗🥶', 'The grasshopper is cold and has nothing to eat.'),
				s('🐜🏠', 'The ant is warm at home with lots of food.'),
				s('🐜🍲🦗', 'The kind ant shares her food with the grasshopper.'),
				s('🐜💪', 'Work today, and you will be ready for tomorrow.')
			],
			nl: [
				s('☀️🦗🎵', 'De hele zomer zingt de sprinkhaan in de zon.'),
				s('🐜🌾', 'De mier werkt hard en sjouwt eten naar haar huis.'),
				s('🦗🐜', '"Kom met mij spelen!" zegt de sprinkhaan.'),
				s('🐜🌾', '"Ik spaar eten voor de winter," zegt de mier.'),
				s('❄️☃️', 'Dan komt de winter en ligt er overal sneeuw.'),
				s('🦗🥶', 'De sprinkhaan heeft het koud en heeft niets te eten.'),
				s('🐜🏠', 'De mier zit warm thuis met genoeg eten.'),
				s('🐜🍲🦗', 'De lieve mier deelt haar eten met de sprinkhaan.'),
				s('🐜💪', 'Wie vandaag werkt, is klaar voor morgen.')
			]
		}
	},
	{
		id: 'wind-sun',
		level: 3,
		cover: '🌬️☀️',
		title: { en: 'The Wind and the Sun', nl: 'De wind en de zon' },
		sentences: {
			en: [
				s('🌬️☀️', 'The wind and the sun argue about who is stronger.'),
				s('🚶🧥', 'They see a man walking in a warm coat.'),
				s('🌬️🧥', '"I can blow his coat off," says the wind.'),
				s('🌬️💨', 'The wind blows hard, harder and harder.'),
				s('🚶🧥', 'But the man holds his coat even tighter.'),
				s('☀️', 'Then the sun shines softly and warmly.'),
				s('🚶🥵', 'The man gets hot and takes off his coat.'),
				s('☀️🏆', 'Being kind works better than being rough.')
			],
			nl: [
				s('🌬️☀️', 'De wind en de zon vragen: wie is het sterkst?'),
				s('🚶🧥', 'Ze zien een man lopen in een warme jas.'),
				s('🌬️🧥', '"Ik blaas zijn jas wel weg," zegt de wind.'),
				s('🌬️💨', 'De wind blaast hard, harder en nog harder.'),
				s('🚶🧥', 'Maar de man houdt zijn jas nog steviger vast.'),
				s('☀️', 'Dan schijnt de zon zacht en warm.'),
				s('🚶🥵', 'De man krijgt het warm en doet zijn jas uit.'),
				s('☀️🏆', 'Vriendelijk zijn werkt beter dan hard zijn.')
			]
		}
	},
	{
		id: 'town-country-mouse',
		level: 4,
		cover: '🐭🏙️',
		title: { en: 'The Town Mouse and the Country Mouse', nl: 'De stadsmuis en de veldmuis' },
		sentences: {
			en: [
				s('🐭🌾', 'A country mouse lives in a quiet field and eats seeds and corn.'),
				s('🐭🏙️', 'One day her cousin, the town mouse, comes to visit her.'),
				s('🐭😕', '"Your food is so plain," says the town mouse, "come and see my house."'),
				s('🏙️🧀🍰', 'In the big house in town there is cheese, cake and bread.'),
				s('🐱💨', 'But just as they start to eat, a big cat jumps at them!'),
				s('🐭🐭🏃', 'The two mice run and hide, because they are very scared.'),
				s('🐭🌾', '"I am going home," says the country mouse, "where I can eat in peace."'),
				s('🌾❤️', 'A simple life without fear is better than a rich life full of fear.')
			],
			nl: [
				s('🐭🌾', 'Een veldmuis woont in een rustig veld en eet zaadjes en graan.'),
				s('🐭🏙️', 'Op een dag komt haar nicht, de stadsmuis, bij haar op bezoek.'),
				s('🐭😕', '"Wat is jouw eten saai," zegt de stadsmuis, "kom maar naar mijn huis."'),
				s('🏙️🧀🍰', 'In het grote huis in de stad is kaas, taart en brood.'),
				s('🐱💨', 'Maar net als ze willen eten, springt er een grote kat op ze af!'),
				s('🐭🐭🏃', 'De twee muizen rennen weg en verstoppen zich, want ze zijn heel bang.'),
				s('🐭🌾', '"Ik ga naar huis," zegt de veldmuis, "want daar kan ik rustig eten."'),
				s('🌾❤️', 'Liever rustig en eenvoudig leven dan rijk zijn en altijd bang.')
			]
		}
	},
	{
		id: 'golden-goose',
		level: 4,
		cover: '🦆🥚',
		title: { en: 'The Goose with the Golden Eggs', nl: 'De gans met de gouden eieren' },
		sentences: {
			en: [
				s('🧑‍🌾🦆', 'A farmer and his wife have a very special goose.'),
				s('🥚✨', 'Every morning the goose lays an egg made of shining gold.'),
				s('💰', 'The farmer sells the eggs, and soon they have lots of money.'),
				s('🧑‍🌾🤔', 'But the farmer wants more, and he wants it faster.'),
				s('💭🦆', '"There must be a lot of gold inside that goose," he thinks.'),
				s('🧑‍🌾🏃🦆', 'He tries to grab the goose, because he wants to look inside.'),
				s('🦆💨', 'But the goose is scared and flies away, and she never comes back.'),
				s('🙏', 'If you want too much, you can lose everything you have.')
			],
			nl: [
				s('🧑‍🌾🦆', 'Een boer en zijn vrouw hebben een heel bijzondere gans.'),
				s('🥚✨', 'Elke ochtend legt de gans een ei van glanzend goud.'),
				s('💰', 'De boer verkoopt de eieren, en al snel hebben ze veel geld.'),
				s('🧑‍🌾🤔', 'Maar de boer wil meer, en hij wil het sneller.'),
				s('💭🦆', '"In die gans zit vast heel veel goud," denkt hij.'),
				s('🧑‍🌾🏃🦆', 'Hij probeert de gans te pakken, want hij wil erin kijken.'),
				s('🦆💨', 'Maar de gans schrikt en vliegt weg, en ze komt nooit meer terug.'),
				s('🙏', 'Wie te veel wil, kan alles verliezen wat hij heeft.')
			]
		}
	}
];
