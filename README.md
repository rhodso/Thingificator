# Thingificator
A program to generate things

The purpose of this program is to generate things. Currently only NPCs, but in the future, maybe more.
All you need to do is select the generator from the top, and then you can either click "Generate All" to generate values for all fields, or generate selected to only generate ticked fields.

The program is designed to fit on half of a 1080p screen. Perfect in case you need to look at your notes on the other half when you're in the middle of playing.

## Generators
The generator is described in the `data/generators/` folder.
Each generator has an `id`, a `name`, and a list of `steps`.

Each step also has an `id`, a `name`, but it also has a `type`, a `table`, and a `depends_on`.
The `id` and `name` are the id and name of the step. The type can either be `select` or `text`. 
If it's `text`, then it's just a text box. If it's `select` then it's a selection.

Finally, `depends_on` is a list of ids that this depends on. 
For example, the name of a person depends on their race (such as Elf, Tiefling, Human), and their gender (such as Male or Female)

When the generator evaluates what to generate, it will look at this dependency graph and generate things based on their validity.
This means that if you generate a Human Woman called "Lauren" and then change the race to a Tiefling, the name will get re-generated as well

## Tables
Each field is defined as a random table, found in the `data/tables/` folder.

The tables are structured in 2 main ways:
- `definitive` - A list of options (either weighted or unweighted)
- `additive` - A collection of sub-tables

If it's `definitive`, then the option is just randomly rolled from that list. 
If it's `additive` then a collection of tables are added together and the result is rolled from that. 
For example, a Half-Elf can have either a Human or Elven name, so the following definition means to include all options from both Human and Elven names for that gender:
```
{
 "race": "Half-Elf",
 "gender": "Female",
 "options": [],
 "additive": [
  {
   "race": "Elf",
   "gender": "Female"
  },
  {
   "race": "Human",
   "gender": "Female"
  }
 ]
}
```
You can also add other names for this race/gender combination to `options` and these will also be options for the generator
