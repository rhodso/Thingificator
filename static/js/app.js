
// API Functions
import { getGenerators, getGenerator, getTable, generate} from "./api.js";


// Application state
const state = {
	generators: [],
	activeGenerator: null,
	generator: null,
	selectedThingId: null,
	currentThing: { type: null, values: {} },
	selectedSteps: {}
};

// Sample saved NPCs
const savedThings = [];

// Helpers
function escapeHtml(value) {
	if (value === null || value === undefined) {
		return "";
	}

	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}


function getActiveSteps() {
	return state.generator?.steps ?? [];
}

function getSelectedSteps() {
	return state.generator?.steps.filter(
		step => state.selectedSteps[step.id]
	) ?? [];
}

function getSavedThings() {
	return savedThings.filter(
		thing => thing.type === state.activeGenerator
	);
}

function capitalize(value) {
	if (!value) {
		return value;
	}

	return value.charAt(0).toUpperCase() + value.slice(1);
}

// Main rendering
function render() {
	document.getElementById("app").innerHTML = `
		<div class="h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 flex flex-col">
			${renderTopBar()}

			<div class="flex flex-1 min-h-0">
				${renderSidebar()}
				${renderGeneratorPanel()}
			</div>
		</div>
	`;
}


// Top bar
function renderTopBar() {
	const buttons = state.generators.map(generator => {
		const active = generator.id === state.activeGenerator;

		return `
			<button
				class="h-full px-4 text-sm font-medium border-b-2 ${
					active
						? "text-white border-blue-500 bg-gray-800"
						: "text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800"
				}"
				onclick="switchGenerator('${generator.id}')"
			>
				${escapeHtml(generator.name)}
			</button>
		`;
	}).join("");

	return `
		<header class="h-12 flex-shrink-0 flex items-center border-b border-gray-800 bg-gray-900">
			<div class="w-[260px] h-full flex items-center px-4 border-r border-gray-800">
				<span class="font-semibold tracking-wide text-gray-100">Thingificator</span>
			</div>

			<nav class="h-full flex items-center">
				${buttons}
			</nav>

			<div class="ml-auto px-3">
				<button class="w-8 h-8 rounded text-gray-500 hover:text-white hover:bg-gray-800" title="Settings">
					⚙
				</button>
			</div>
		</header>
	`;
}


// Sidebar
function renderSidebar() {
	const things = getSavedThings();

	const items = things.map(thing => {
		const active = thing.id === state.selectedThingId;

		return `
			<button
				class="saved-item w-full text-left px-3 py-2.5 rounded border ${
					active
						? "active border-blue-500"
						: "border-transparent"
				}"
				onclick="selectSavedThing(${thing.id})">
				<div class="text-sm font-medium text-gray-100 truncate">
					${escapeHtml(thing.name)}
				</div>
				<div class="text-xs text-gray-500 mt-0.5 truncate">
					${escapeHtml(thing.values.race ?? "")}
					<span class="text-gray-700">•</span>
					${escapeHtml(thing.values.occupation ?? "")}
				</div>
			</button>
		`;
	}).join("");

	return `
		<aside class="w-[260px] flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
			<div class="p-3 border-b border-gray-800">
				<div class="flex gap-2">
					<button class="flex-1 h-9 rounded border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 hover:text-white" onclick="uploadThings()">
						↑ Upload
					</button>

					<button class="flex-1 h-9 rounded border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 hover:text-white" onclick="downloadThings()">
						↓ Download
					</button>
				</div>

				<button class="w-full h-9 mt-2 rounded bg-blue-600 text-sm font-medium text-white hover:bg-blue-500" onclick="newThing()">
					+ New NPC
				</button>

				<input type="text" placeholder="Search..." class="w-full h-9 mt-3 rounded border border-gray-700 bg-gray-950 px-3 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500">
			</div>

			<div class="scroll-area flex-1 overflow-y-auto p-2 space-y-1">
				${items}
			</div>
		</aside>
	`;
}

// Generator panel
function renderGeneratorPanel() {
	const generator = state.generator;

	if (!generator) {
		return `
			<main class="flex-1 flex items-center justify-center bg-gray-950">
				<div class="text-sm text-gray-500">
					Loading generator...
				</div>
			</main>
		`;
	}

	return `
		<main class="flex-1 min-w-0 flex flex-col bg-gray-950">
			<div class="flex-shrink-0 border-b border-gray-800 bg-gray-900">
				<div class="h-14 px-5 flex items-center justify-between">
					<h1 class="text-base font-semibold text-gray-100">
						${escapeHtml(generator.name)} Generator
					</h1>

					<div class="flex items-center gap-2">
						<button class="h-9 px-3 rounded border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 hover:text-white" onclick="generateAll()">
							Generate All
						</button>

						<button class="h-9 px-3 rounded bg-blue-600 text-sm font-medium text-white hover:bg-blue-500" onclick="generateSelected()">
							Generate Selected
						</button>

						<div class="h-6 w-px bg-gray-700 mx-1"></div>

						<button class="h-9 px-3 rounded border border-gray-700 bg-gray-800 text-sm text-gray-400 hover:bg-gray-700 hover:text-white" onclick="selectAllSteps(true)">
							✓ All
						</button>

						<button class="h-9 px-3 rounded border border-gray-700 bg-gray-800 text-sm text-gray-400 hover:bg-gray-700 hover:text-white" onclick="selectAllSteps(false)">
							✗ All
						</button>
					</div>
				</div>
			</div>

			<div class="scroll-area flex-1 overflow-y-auto">
				<div class="max-w-5xl mx-auto p-5 space-y-2">
					${
						generator.steps.length
							? generator.steps.map(renderGeneratorStep).join("")
							: renderEmptyGenerator()
					}
				</div>
			</div>

			${renderDescriptionPanel()}
		</main>
	`;
}

// Generator row
function renderGeneratorStep(step) {
	const value = state.currentThing.values[step.id] ?? "";
	const selected = state.selectedSteps[step.id] ?? false;

	return `
		<div class="generator-row flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-800 bg-gray-900">
			<input
				type="checkbox"
				class="flex-shrink-0 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
				${selected ? "checked" : ""}
				onchange="toggleStep('${step.id}', this.checked)"
			>

			<div class="w-36 flex-shrink-0 text-sm font-medium text-gray-400">
				${escapeHtml(step.name)}
			</div>

			<div class="flex-1 min-w-0">
				${renderStepInput(step, value)}
			</div>

			<button
				class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-gray-800"
				title="Regenerate ${escapeHtml(step.name)}"
				onclick="regenerateStep('${step.id}')"
			>
				↻
			</button>
		</div>
	`;
}

// Generator input
function renderStepInput(step, value) {
	if (step.type === "select") {
		// console.log("Gender/table:", step.table, state.generator?.tables?.[step.table]);
		const options = state.generator?.tables?.[step.table] ?? [];

		const optionHtml = options.map(item => {
			const option = typeof item === "object"
				? item.option
				: item;

			return `
				<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>
					${escapeHtml(option)}
				</option>
			`;
		}).join("");

		// console.log("Rendered options:", optionHtml);

		return `
			<select class="w-full h-9 rounded border border-gray-700 bg-gray-950 px-3 text-sm text-gray-200 outline-none focus:border-blue-500" onchange="updateValue('${step.id}', this.value)">
				<option value="">— Select —</option>
				${optionHtml}
			</select>
		`;
	}

	if (step.type === "text") {
		return `
			<input type="text" value="${escapeHtml(value)}" class="w-full h-9 rounded border border-gray-700 bg-gray-950 px-3 text-sm text-gray-200 outline-none focus:border-blue-500" onchange="updateValue('${step.id}', this.value)">
		`;
	}

	return `
		<div class="text-sm text-red-400">
			Unknown input type: ${escapeHtml(step.type)}
		</div>
	`;
}

// Empty generator
function renderEmptyGenerator() {
	return `
		<div class="rounded-lg border border-dashed border-gray-800 p-10 text-center">
			<div class="text-sm text-gray-500">
				This generator hasn't been created yet.
			</div>
		</div>
	`;
}

// Description panel
function renderDescriptionPanel() {
	const values = state.currentThing.values;

	const playerDescription =
		generatePlayerDescription(values);

	const notes =
		generateNotesDescription(values);

	return `
		<section class="flex-shrink-0 border-t border-gray-800 bg-gray-900">
			<div class="grid grid-cols-2 gap-4 p-4">
				<div>
					<div class="flex items-center justify-between mb-2">
						<label class="text-xs font-semibold uppercase tracking-wider text-gray-500">
							Player Description
						</label>

						<button class="text-xs text-gray-500 hover:text-gray-200" onclick="copyDescription('player-description')">
							Copy
						</button>
					</div>

					<textarea
						id="player-description"
						class="description-box w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm leading-relaxed text-gray-300 outline-none focus:border-blue-500"
					>${escapeHtml(playerDescription)}</textarea>
				</div>

				<div>
					<div class="flex items-center justify-between mb-2">
						<label class="text-xs font-semibold uppercase tracking-wider text-gray-500">
							NPC Notes
						</label>

						<button class="text-xs text-gray-500 hover:text-gray-200" onclick="copyDescription('npc-notes')">
							Copy
						</button>
					</div>

					<textarea
						id="npc-notes"
						class="description-box w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm leading-relaxed text-gray-300 outline-none focus:border-blue-500"
					>${escapeHtml(notes)}</textarea>
				</div>
			</div>
		</section>
	`;
}

// Descriptions - WIP
function generatePlayerDescription(values) {
	if (!values.race && !values.occupation) { return ""; }

	const race = values.race ? `a ${values.race.toLowerCase()}` : "a person";

	if (values.occupation) { return capitalize( `${race} who works as a ${values.occupation.toLowerCase()}.`); }
	return capitalize(`${race}.`);
}

function generateNotesDescription(values) {
	const parts = [];

	if (values.race) { parts.push(`Race: ${values.race}.`); }
	if (values.occupation) { parts.push(`Occupation: ${values.occupation}.`); }
	return parts.join(" ");
}

// Field interaction
function updateValue(stepId, value) {
	state.currentThing.values[stepId] = value;

	render();
}

function toggleStep(stepId, selected) {
	state.selectedSteps[stepId] = selected;
}

function selectAllSteps(selected) {
	for (const step of getActiveSteps()) {
		state.selectedSteps[step.id] = selected;
	}

	render();
}

// Generation
async function generateAll() {
	// Get steps
	const steps = getActiveSteps();

	// If steps are empty, oh no
	if (!steps.length) { return; }

	// Define prev and vals
	const previous = { ...state.currentThing.values };
	const values = { ...state.currentThing.values };
	for (const step of steps) { values[step.id] = ""; }

	// Try to generate
	try {
		const result = await generate( state.activeGenerator, previous, values );
		state.currentThing.values = result.values;
		render();
	}
	catch (error) { // If error, write to console and alert user
		console.error(error);
		alert( `Generation failed:\n\n${error.message}` );
	}
}

// Generate only selected values
async function generateSelected() {

	// Get only steps that the user has selected
	const steps = getSelectedSteps();

	// If we couldn't, oh no
	if (!steps.length) { return; }

	// Get the generator details
	const previous = { ...state.currentThing.values };
	const values = { ...state.currentThing.values };
	for (const step of steps) { values[step.id] = ""; }

	// Debug
	// console.log("Generate Selected:");
	// console.log("Previous:", previous);
	// console.log("Values:", values);

	// Try to generate
	try {
		const result = await generate( state.activeGenerator, previous, values );
		state.currentThing.values = result.values;
		render();
	}
	catch (error) { // On error write to consile and inform user
		console.error(error);
		alert( `Generation failed:\n\n${error.message}` );
	}
}

// Regenerate a step
async function regenerateStep(stepId) {
	// Try to generate
	try {
		const result = await generate( state.activeGenerator, [stepId], state.currentThing.values );
		if (stepId in result.values) { state.currentThing.values[stepId] = result.values[stepId]; }
		render();
	}
	catch (error) { // On error
		console.error(error);
		alert( `Generation failed:\n\n${error.message}` );
	}
}

// Saved things - WIP
function selectSavedThing(id) {
	
	const thing = savedThings.find(item => item.id === id);
	if (!thing) { return; }
	state.selectedThingId = id;
	state.currentThing = { type: thing.type, values: structuredClone(thing.values) };

	render();
}

function newThing() {
	const values = {};

	for (const step of getActiveSteps()) { values[step.id] = ""; }
	state.selectedThingId = null;
	state.currentThing = { type: state.activeGenerator, values };

	render();
}

// Generator switching
async function switchGenerator(generatorId) {
	// If not a generator ID, then oh no
	if (!generatorId) return;

	// Try to set the generator
	try {
		state.activeGenerator = generatorId;
		state.generator = null;
		render();

		// Get the generator and stuff
		const generator = await getGenerator(generatorId);
		const tableNames = [...new Set( generator.steps.map(step => step.table).filter(Boolean))];
		const tables = {};

		// We promise this will be ready and that it exists
		await Promise.all( tableNames.map(async tableName => { tables[tableName] = await getTable(tableName); }));

		state.generator = {...generator, tables };
		const values = {};
		const selectedSteps = {};

		// For step in generator steps
		for (const step of generator.steps) {
			values[step.id] = "";
			selectedSteps[step.id] = true;
		}

		// Set state
		state.currentThing = { type: generatorId, values};
		state.selectedSteps = selectedSteps;
		state.selectedThingId = null;

		render();
	} catch (error) { 
		console.error(error);
		state.generator = null;
		render();
		alert(`Could not load generator:\n\n${error.message}`);
	}
}

// Import / export
function downloadThings() {
	// Create a thing called thingificator.json so the user can download the whole thing
	const json = JSON.stringify(savedThings, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	// Hacky way to do this

	// Create a link
	const link = document.createElement("a");

	link.href = url;
	link.download = "thingificator.json";

	// Add it to the body, click it, remove it, revoke URL
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

// WIP also
function uploadThings() {
	const input = document.createElement("input");

	input.type = "file";
	input.accept = ".json,application/json";

	input.onchange = async () => {
		const file = input.files[0];

		if (!file) { return; }

		try {
			const text = await file.text();
			const data = JSON.parse(text);

			if (!Array.isArray(data)) { throw new Error( "Expected a Thingificator JSON array." ); }

			savedThings.length = 0;
			savedThings.push(...data);

			state.selectedThingId = null;

			render();
		}
		catch (error) {
			alert( `Could not import file:\n\n${error.message}` );
		}
	};

	input.click();
}

// Clipboard
async function copyDescription(id) {

	// Get the element
	const element = document.getElementById(id); 
	if (!element) { return; }

	// Try to write text to the clipboard
	try {
		await navigator.clipboard.writeText( element.value );

		// Get the button
		const button = element.parentElement.querySelector("button");
		if (!button) { return; }

		// Copy the original text, set to "Copied!" and then set back after a sec or so"
		const original = button.textContent;
		button.textContent = "Copied!";
		setTimeout(() => { button.textContent = original; }, 1000);
	}
	catch (error) {
		console.error(error);
	}
}

// Global functions used by inline HTML handlers
window.switchGenerator = switchGenerator;
window.selectSavedThing = selectSavedThing;
window.newThing = newThing;
window.updateValue = updateValue;
window.toggleStep = toggleStep;
window.selectAllSteps = selectAllSteps;
window.generateAll = generateAll;
window.generateSelected = generateSelected;
window.regenerateStep = regenerateStep;
window.uploadThings = uploadThings;
window.downloadThings = downloadThings;
window.copyDescription = copyDescription;

// Start application
async function startup() {
	// Try to get all generators
	try {
		state.generators = await getGenerators();
		render();

		// If there is at least 1 generator...
		if (state.generators.length > 0) {

			// Auto-switch to the 1st one in the list
			await switchGenerator( state.generators[0].id );
		}
	} catch (error) { // On error
		console.error(error);
		alert(`Could not load generators:\n\n${error.message}`);
	}
}

// Startup application
startup();