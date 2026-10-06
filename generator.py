# Imports
import json
import random
from pathlib import Path

# Globals
DATA_DIR = Path(__file__).parent / "data"
GENERATOR_DIR = DATA_DIR / "generators"
TABLE_DIR = DATA_DIR / "tables"

# Load a json file
def load_json_file(path):
	with path.open("r", encoding="utf-8") as file:
		return json.load(file)

# Load a generator
def load_generator(generator_id):
	path = GENERATOR_DIR / f"{generator_id}.json"
	if not path.exists():
		raise ValueError( f"Generator '{generator_id}' does not exist." )

	return load_json_file(path)

# Load a generator table
def load_table(table_name):
	path = TABLE_DIR / f"{table_name}.json"
	if not path.exists():
		raise ValueError( f"Table '{table_name}' does not exist." )
	
	return load_json_file(path)


# Weighted Random Choice
def weighted_choice(options):
	# Choose from a list containing either strings or weighted random objects
	# Unweighted: ["Alice", "Bob", "Charlie"]
	# Weighted:
	# 	[{
	# 		"opt": "Alice",
	# 		"weight": 5
	# 	} ... ]

	# Check that it's not empty
	if not options:
		raise ValueError("Cannot choose from an empty option list.")

	# Create a list for normalisation
	normalised = []

	# For each option...
	for option in options:

		# Are we dealing with a weighted or unweighted choice?
		if isinstance(option, str):
			# If unweighted, just make it all weighted with weight 1
			normalised.append({
				"option": option,
				"weight": 1
			})

		elif isinstance(option, dict):
			# Support either option or opt
			value = option.get("opt", option.get("option"))

			# Make sure there's an option
			if value is None:
				raise ValueError(
					f"Option is missing 'opt': {option}"
				)

			# Normalise the data
			normalised.append({
				"option": value,
				"weight": option.get("weight", 1)
			})

		else:
			# Check for errors
			raise ValueError( f"Invalid option type: {type(option).__name__}" )

	# Create the total weight
	total_weight = sum( option["weight"] for option in normalised )

	# Ensure that there is a +ve weight
	if total_weight <= 0:
		raise ValueError( "Weighted table must have a positive total weight." )

	# Roll a random value from 1 to total weight
	roll = random.randint(1, total_weight)
	current_weight = 0

	# Go through the list...
	for option in normalised:
		
		# Add current weight to max val
		current_weight += option["weight"]

		# If roll is under or equal to max val, there we go
		if roll <= current_weight:
			return option["option"]

	# In case it messes up
	raise ValueError( "Could not select an option." )


# Table matching
def find_table_entry(table, criteria):
	
	# Find the single table entry matching all supplied criteria.

	# For example:
	#	criteria = {
	# 		"race": "Human",
	# 		"gender": "Female"
	# 	}

	# will find:

	# 	{
	# 		"race": "Human",
	# 		"gender": "Female",
	# 		"options": [...]
	# 	}
	
	# Create a list for matches
	matches = []

	# For each entry in the table...
	for entry in table:

		# If criteria matches, append
		if all( entry.get(key) == value for key, value in criteria.items() ):
			matches.append(entry)

	# If there are no matches, panic
	if not matches:
		raise ValueError( f"No table entry matches {criteria}" )

	# If there are multiple matches, panic but less
	if len(matches) > 1:
		raise ValueError( f"Multiple table entries match {criteria}" )

	# Return the match object
	return matches[0]


# Resolve the table options from multiple options into one option pool
# If there are no depenencies, then use the table itself
# If there are dependencies use either "definitive" or "additive"
# 
# Definitive means that the table is only used
# Additive means that more tables can be added
def resolve_table_options(table, step, values, visited=None):

	# Create a set of visited tables
	if visited is None:
		visited = set()

	# Find all depenencies
	dependencies = step["depends_on"]

	# If there are no dependencies, just return the table
	if not dependencies:
		return table

	# Creat the criteria for each dependency, and the key for each step
	criteria = { dependency: values.get(dependency) for dependency in dependencies }
	key = ( step["id"], tuple(criteria.items()) )

	# Check for circular dependencies
	if key in visited:
		raise ValueError(f"Circular additive reference detected while resolving '{step['id']}'." )
	visited.add(key)

	# Get the table entry and options
	entry = find_table_entry( table, criteria )
	options = list(entry.get("options", []))

	# Set the generator type
	generation_type = step.get( "generation", "definitive" )

	# Definitive, just return options
	if generation_type == "definitive":
		return options

	# Can only be additive generation at this point, so throw error if not
	if generation_type != "additive":
		raise ValueError( f"Unknown generation type '{generation_type}' for property '{step['id']}'." )

	# Add options for every additive table
	for additive in entry.get("additive", []):
		additive_entry = find_table_entry( table, additive )

		options.extend( resolve_additive_entry( table, additive_entry, step["id"], values, visited ))

	# Return options
	return options


# Resolve an additive entry and any additives it references.
def resolve_additive_entry(table, entry, property_id, values, visited):

	# If the key is not "options" or "properties", then get the entry items and add to the key
	key = (property_id, tuple(( key, value ) for key, value in entry.items() if key not in {"options", "additive"} ))
	# The weak tremble before my 1-liner abilities

	# Check for circular additive steps
	if key in visited:
		raise ValueError( "Circular additive reference detected." )
	visited.add(key)

	# Ge the options list
	options = list(entry.get("options", []))

	# For each additive table...
	for additive in entry.get("additive", []):

		# Find the table, add to the options
		additive_entry = find_table_entry( table, additive )
		options.extend( resolve_additive_entry( table, additive_entry, property_id, values, visited ))
	return options


# Generate a single property using its table and dependencies.
def generate_field(step, values):

	# Get the table name
	table_name = step.get("table")

	# Ensure there is one. If not, then return nothing
	if not table_name:
		return values.get(step["id"], "")

	# Load the table
	table = load_table(table_name)

	# Ensure the table contains data
	if not table:
		raise ValueError( f"Table '{table_name}' is empty." )

	# Resolve options, and ensure they are not empty
	options = resolve_table_options( table, step, values )
	if not options:
		raise ValueError( f"No options available for '{step['id']}'." )

	# Return the choice
	return weighted_choice(options)

# Dependency graph
# Build both dependency and reverse-dependency mappings.
def build_dependency_graph(generator):

	# Create dicts for depenencies and dependents
	dependencies = {}
	dependents = {}

	# For each step in the generator...
	for step in generator.get("steps", []):

		# Get the id and depends_on, then add to dependencies
		field_id = step["id"]
		field_dependencies = step["depends_on"]
		dependencies[field_id] = field_dependencies

		# For each dependency...
		for dependency in field_dependencies:

			# Append the field id
			dependents.setdefault( dependency, [] ).append(field_id)

	# Return the dicts
	return dependencies, dependents

# Find the changed properties
# A property is changed when it had a non-blank value that is different from the current value
def find_changed_properties(previous, current, steps):
	# Create a list
	changed = []

	# For each generation step...
	for step in steps:

		# Get the id
		field_id = step["id"]

		# Get the old and new values, use blank as a default
		old_value = previous.get( field_id, "" )
		new_value = current.get( field_id, "" )

		# If there's a change, note it
		if old_value and old_value != new_value:
			changed.append(field_id)

	return changed

# Invalidate dependent values based on generation step heirarchy
# Does NOT clear the property
def invalidate_dependents(field_id, dependents, values, visited=None):
	# If visited is non, create a new set
	if visited is None:
		visited = set()

	# If already visited, do nothing
	if field_id in visited:
		return

	# Add visited
	visited.add(field_id)

	# For each dependent...
	for dependent in dependents.get(field_id, []):

		# Set value to blank, and invalidate dependents
		values[dependent] = ""
		invalidate_dependents( dependent, dependents, values, visited )


# Clear any property that has a blank dependency.
# Repeat until stable so that invalidation propagates through multiple levels of the dependency graph.
def invalidate_blank_dependencies(values, dependencies):

	# Create infinte loop
	changed = True
	while changed:

		# Set changed to false so we exit this time unless changed
		changed = False

		# For the field id and dependencies..
		for field_id, field_dependencies in dependencies.items():

			# If there are no values, then continue
			if not values.get(field_id):
				continue

			# If there are not any dependency values in field dependencies...
			if any( not values.get(dependency) for dependency in field_dependencies):

				# Set value of the field to blank, and set changed to true again
				values[field_id] = ""
				changed = True


# Generation

# Generate blank properties with satisfied depenencies and repeat until no more 
# properties can be generated
def generate_missing_values(generator, values, dependencies):

	# Get the list of steps
	steps = { step["id"]: step for step in generator.get("steps", []) }

	# Infinte loop
	while True:

		# Set a flag for if we generated anything this time
		generated_anything = False

		# For field id and dependenceies in dependency items...
		for field_id, field_dependencies in dependencies.items():
			
			# If it already has a value, continue
			if values.get(field_id):
				continue

			# Don't try to generate properties that don't have a generation table
			step = steps[field_id]
			if not step.get("table"):
				continue

			# If dependencies aren't ready yet
			if not all( values.get(dependency) for dependency in field_dependencies):
				continue

			values[field_id] = generate_field( step, values )
			generated_anything = True # We generated something, so set flag

		# If we didn't generate anything, break
		if not generated_anything:
			break

# Generate a complete object from previous values
# {
# 	"generator": "npc",
# 	"previous": "{...}",
# 	"values": "..."
# }
# Becomes
# {
# 	"generator": "npc",
# 	"values": {
# 		"field1": "value1",
# 		"field2": "value2"
# 	}
# }
def generate(data):
	# Get the generator id
	generator_id = data.get("generator")

	# If there is no id, then error
	if not generator_id:
		raise ValueError( "No generator specified." )

	# Load the generator, and get steps, previous, and current
	generator = load_generator(generator_id)
	steps = generator.get("steps", [])
	previous = data.get( "previous", {} )
	current = data.get( "values", {} ).copy()

	# Make sure every generator property exists in the object
	for step in steps:
		current.setdefault( step["id"], "" )

	# Step 1: Build the dependency graph
	dependencies, dependents = build_dependency_graph( generator )

	# Step 2: Find what changed and invalidate them, and anything that's blank
	changed = find_changed_properties( previous, current, steps )
	for field_id in changed:
		invalidate_dependents( field_id, dependents, current )
	invalidate_blank_dependencies(current,dependencies)

	# Step 3: Generate all remaining blank properties.
	generate_missing_values( generator, current, dependencies )

	# And return
	return { "generator": generator_id, "values": current }