<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/Icon.svelte';
	import { loadLanguage } from '#lib/storage.ts';
	import type { Language } from '#lib/words.ts';

	let language = $state<Language>('en');
	onMount(() => (language = loadLanguage()));

	const T = {
		en: {
			title: 'The small print',
			lead: 'Plainly and completely: what this app does with your child\'s data, and what you can and cannot expect from it.',
			sections: [
				['Your data', 'This app stores a child\'s players, stickers, levels, play history and paintings only in this browser\'s local storage, on this device. It sends nothing to any server. It uses no cookies, no analytics, no accounts and no advertising, and it does not identify you or your child. Clearing the browser\'s site data removes everything; nothing is kept anywhere else. Read Along uses the browser\'s own speech recognition: on some browsers that service (for example Apple\'s or Google\'s) processes speech under that browser\'s terms, outside this app\'s control. The app itself keeps no audio.'],
				['Playing with others and moving progress', 'Two features send data, and only after a grown-up turns them on in Grown-ups. "Play with others" (off by default): while a child is in Paint Pot, this device connects directly to other devices over WebRTC, found through public Nostr relays. Those devices can see this device\'s IP address. What is shared is limited to the number of the drawn face the child picked, which Paint Pot screen they are on, and for a finished picture its id and one colour per area of its outline; names, photos, free text and drawings never are. Nothing is stored by anyone: pictures from others exist only while devices that hold them are open. "Move to another device" sends this device\'s progress, when a grown-up taps Send, directly and end-to-end encrypted to the device that scanned the code; the small link and the saved file are not encrypted and are as private as the place a grown-up puts them.'],
				['No warranty', 'The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement. In no event shall the author be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or its use.'],
				['No obligations', 'This is a personal project made by a parent for their own children and shared as it is. It may change, break, pause or disappear at any time without notice. There is no promise of support, updates, uptime, continued availability or compatibility, and no commercial relationship of any kind between you and the author. Nothing here is a product or a service you are entitled to.'],
				['Not advice', 'These are learning games. They are not a curriculum, an assessment, or educational, medical or psychological advice, and they do not replace a teacher or a professional.'],
				['Licence', 'The code is open source under the MIT licence. You may use, copy, change and share it, including commercially, as long as the licence notice stays with it. Fonts, icons, flags, emoji and voice models come from their own open licences, listed in the README.']
			],
			licence: 'Read the MIT licence',
			back: 'Back'
		},
		nl: {
			title: 'De kleine lettertjes',
			lead: 'Duidelijk en volledig: wat deze app met de gegevens van je kind doet, en wat je er wel en niet van mag verwachten.',
			sections: [
				['Je gegevens', 'Deze app bewaart de spelers, stickers, niveaus, speelgeschiedenis en tekeningen van een kind alleen in de lokale opslag van deze browser, op dit apparaat. Er wordt niets naar een server gestuurd. Er zijn geen cookies, geen statistieken, geen accounts en geen reclame, en jij en je kind worden niet geïdentificeerd. Als je de sitegegevens van de browser wist, is alles weg; nergens anders wordt iets bewaard. Lees Mee gebruikt de spraakherkenning van de browser zelf: in sommige browsers verwerkt die dienst (bijvoorbeeld die van Apple of Google) spraak onder de voorwaarden van die browser, buiten deze app om. De app zelf bewaart geen geluid.'],
				['Samen met anderen en voortgang verhuizen', 'Twee onderdelen sturen gegevens, en alleen nadat een volwassene ze aanzet bij Volwassenen. "Samen met anderen" (standaard uit): zolang een kind in Verfpot is, maakt dit apparaat via WebRTC rechtstreeks verbinding met andere apparaten, gevonden via openbare Nostr-relays. Die apparaten kunnen het IP-adres van dit apparaat zien. Gedeeld wordt alleen het nummer van het getekende gezichtje dat het kind koos, op welk scherm van Verfpot het is, en van een afgemaakte tekening het nummer en één kleur per vlak van de omtrek; namen, foto\'s, vrije tekst en tekeningen nooit. Niemand bewaart iets: tekeningen van anderen bestaan alleen zolang apparaten die ze hebben open zijn. "Naar een ander apparaat" stuurt de voortgang van dit apparaat, als een volwassene op Stuur tikt, rechtstreeks en end-to-end versleuteld naar het apparaat dat de code scande; de korte link en het bewaarde bestand zijn niet versleuteld en zo privé als de plek waar een volwassene ze bewaart.'],
				['Geen garantie', 'De software wordt geleverd "zoals ze is", zonder enige garantie, uitdrukkelijk of stilzwijgend, met inbegrip van maar niet beperkt tot garanties van verkoopbaarheid, geschiktheid voor een bepaald doel en niet-inbreuk. De maker is in geen geval aansprakelijk voor enige claim, schade of andere aansprakelijkheid, uit overeenkomst, onrechtmatige daad of anderszins, die voortvloeit uit of verband houdt met de software of het gebruik ervan.'],
				['Geen verplichtingen', 'Dit is een persoonlijk project, door een ouder gemaakt voor de eigen kinderen en gedeeld zoals het is. Het kan op elk moment zonder aankondiging veranderen, kapotgaan, stilvallen of verdwijnen. Er is geen belofte van ondersteuning, updates, beschikbaarheid of compatibiliteit, en er bestaat geen commerciële relatie van welke aard ook tussen jou en de maker. Niets hier is een product of dienst waar je recht op hebt.'],
				['Geen advies', 'Dit zijn leerspelletjes. Ze zijn geen lesprogramma, geen toets en geen onderwijskundig, medisch of psychologisch advies, en ze vervangen geen leerkracht of professional.'],
				['Licentie', 'De code is open source onder de MIT-licentie. Je mag ze gebruiken, kopiëren, aanpassen en delen, ook commercieel, zolang de licentievermelding erbij blijft. Lettertypes, iconen, vlaggen, emoji en stemmodellen vallen onder hun eigen open licenties, opgesomd in de README.']
			],
			licence: 'Lees de MIT-licentie',
			back: 'Terug'
		}
	};
	const s = $derived(T[language]);
	// Opened from the first page while adding a child, or from Grown-ups: Back goes where it came from.
	const back = $derived(page.url.searchParams.get('from') === 'start' ? resolve('/') : resolve('/grownups'));
</script>

<svelte:head><title>The small print — Games for Kids</title></svelte:head>

<main>
	<a class="icon" href={back} aria-label={s.back}><Icon name="back" size={28} /></a>
	<article>
		<h1>{s.title}</h1>
		<p class="lead">{s.lead}</p>
		{#each s.sections as [heading, body] (heading)}
			<h2>{heading}</h2>
			<p>{body}</p>
		{/each}
		<p class="links">
			<a href="https://github.com/sarathsp06/gamesforkids/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">{s.licence} ↗</a>
			<a href="https://github.com/sarathsp06/gamesforkids" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
		</p>
	</article>
</main>

<style>
	main {
		min-height: 100dvh;
		padding: 1.5rem 1.25rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.icon {
		align-self: flex-start;
		width: 3.5rem;
		height: 3.5rem;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		background: var(--white);
		box-shadow: 0 var(--line) 0 var(--ink);
		display: grid;
		place-items: center;
		color: inherit;
	}
	article {
		width: min(42rem, 100%);
		font-size: 1.02rem;
		line-height: 1.55;
	}
	h1 {
		margin: 0.5rem 0 0.25rem;
		font-size: 2rem;
	}
	h2 {
		margin: 1.6rem 0 0.3rem;
		font-size: 1.2rem;
	}
	.lead {
		color: var(--mute);
	}
	p {
		margin: 0;
	}
	.links {
		margin-top: 2rem;
		display: flex;
		gap: 1.2rem;
		flex-wrap: wrap;
		font-weight: 700;
	}
	.links a {
		color: var(--blue);
	}
	/* Phones: the two links are tapped, not clicked, so give them a finger's height. */
	@media (max-width: 600px) {
		.links a {
			display: inline-block;
			padding: 0.7rem 0;
		}
	}
</style>
