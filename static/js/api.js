
// Get the generators
export async function getGenerators() {
	const response = await fetch("/api/generators");
	const data = await response.json();

	if (!response.ok) { throw new Error(data.error || "Could not load generators."); }
	return data;
}

// Get the specific generator
export async function getGenerator(generatorId) {
	const response = await fetch(`/api/generators/${generatorId}`);
	const data = await response.json();

	if (!response.ok) { throw new Error(data.error || "Could not load generator."); }
	return data;
}

// Get the data table
export async function getTable(tableName) {
	const response = await fetch(`/api/tables/${tableName}`);
	const data = await response.json();

	if (!response.ok) { throw new Error( data.error || "Could not load table." ); }
	return data;
}

// Generate function
export async function generate(generator, previous, values = {}) {

	// POST the data to the API
	const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ generator, previous, values })
	});

	const data = await response.json();
	if (!response.ok) { throw new Error( data.error || "Generation failed." ); }

	return data;
}