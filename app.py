# Imports
from flask import Flask, render_template, jsonify, request
from pathlib import Path
import json

app = Flask(__name__)

# Data directories
DATA_DIR = Path(__file__).parent / "data"
GENERATOR_DIR = DATA_DIR / "generators"
TABLE_DIR = DATA_DIR / "tables"

# Helpers

# Load and return a JSON file
def load_json_file(path):
	# Check that path exists
	if not path.exists():
		raise FileNotFoundError( f"Data file does not exist: {path}" )

	# Load it
	with path.open("r", encoding="utf-8") as file:
		return json.load(file)

# Main application
@app.get("/")
def index():
	return render_template("index.html")

# Generators
@app.get("/api/generators")
def get_generators():
	# Return a list of all available generators 

	# Make a list
	generators = []

	# For all json files in the generator directory...
	for path in sorted(GENERATOR_DIR.glob("*.json")):

		# Try and load the id and name from the json data
		try:
			data = load_json_file(path)

			generators.append({
				"id": data.get("id", path.stem),
				"name": data.get("name", path.stem)
			})

		# If there's an error
		except (OSError, json.JSONDecodeError):
			# Silently don't add them to the list
			continue
	
	# Return as json to frontend
	return jsonify(generators)


@app.get("/api/generators/<generator_id>")
def get_generator(generator_id):
	# Return the definition for a specific generator

	# Get the file
	generator_file = GENERATOR_DIR / f"{generator_id}.json"

	# If it doesn't exist
	if not generator_file.exists():
		return jsonify({"error": f"Generator '{generator_id}' does not exist."}), 404

	# Try to load the file
	try:
		generator = load_json_file(generator_file)
		return jsonify(generator)

	# On error
	except json.JSONDecodeError:
		return jsonify({"error": ( f"Generator '{generator_id}' contains invalid JSON.")}), 500

# Tables
@app.get("/api/tables/<table_name>")
def get_table(table_name):
	# Return a data table

	# Get the path
	table_file = TABLE_DIR / f"{table_name}.json"

	# Check it exists
	if not table_file.exists():
		return jsonify({ "error": f"Table '{table_name}' does not exist." }), 404

	# Try to load
	try:
		table = load_json_file(table_file)
		return jsonify(table)

	# On error
	except json.JSONDecodeError:
		return jsonify({
			"error": ( f"Table '{table_name}' contains invalid JSON." )}), 500



# Generation
@app.post("/api/generate")
def api_generate():
	# Interact with the generator

	# Get the object to describe what we want generated
	data = request.get_json()

	# If there is no data
	if not data:
		return jsonify({ "error": "No JSON data supplied." }), 400

	# Try to import and generate the data
	try:
		from generator import generate

		result = generate(data)
		return jsonify(result)

	# On error
	except Exception as error:
		return jsonify({ "error": str(error) }), 500

# Run
if __name__ == "__main__":
	app.run( debug=True, host="127.0.0.1", port=5000 )