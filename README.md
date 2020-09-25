# Simple Business C apability Map Generator - WORK IN PROGRESS
This is a CLI tool that takes a markdown file supporting only the headers and plain text like:
````
# Capability Domain 1
## Capability Group (BADGE) 
Popover description
### Capability
````
and generates the HTML representation.

<img width="573" alt="Screenshot 2020-09-25 at 08 53 50" src="https://user-images.githubusercontent.com/1624855/94242608-986f0f00-ff16-11ea-9cb9-8fca8ae94a08.png">

## Usage
> npm install
Concerting a single file:
> node convert.js map.md 
or continuosly watching the file and converting on the fly:
> node convert.js map.md --watch
