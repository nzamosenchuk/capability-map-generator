const lineByLine = require('n-readlines')
const hb = require('handlebars')
const fs = require('fs');
const showdown = require('showdown')

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

hb.registerHelper('switch', function(value, options) {
    this.switch_value = value;
    return options.fn(this);
});

hb.registerHelper('case', function(value, options) {
    if (value == this.switch_value) {
        return options.fn(this);
    }
});

function isH3(txt) {
    regex = /^### (.*$)/gim
    return txt.match(regex)? txt.replace(regex, '$1') : undefined
}
function isH2(txt) {
    regex = /^## (.*$)/gim
    return txt.match(regex)? txt.replace(regex, '$1') : undefined
}
function isH1(txt) {
    regex = /^# (.*$)/gim
    return txt.match(regex)? txt.replace(regex, '$1') : undefined
}
function isQuote(txt){
    regex = /^\> (.*$)/gim
    return txt.match(regex)? txt.replace(regex, '$1') : undefined
}

function findParent(currentParent, currentLevel, desiredLevel){
    if (currentLevel < desiredLevel){
        console.log(`Malformed structure! Current Level ${currentLevel}, Desired Level ${desiredLevel}, Object ${currentParent}.`)
        process.exit(1)
    }
    let targetParent = currentParent
    let targetLevel = currentLevel
    while (targetLevel > desiredLevel)
    {
        targetParent = targetParent.parent;
        targetLevel = targetLevel - 1
    }
    return targetParent
}

function parseMD(liner,  parent, level){
    let line = liner.next()
    if (line) {
        line = line.toString()
        line = applyTypographyStylesToRawText (line)
        let value
        if (value = isH3(line)) {
            let myParent = findParent(parent, level, 2)
            let me = {
                parent: myParent,
                header: value,
                description: "",
                level : 3,
                child: [],
            }

            myParent.child.push(me)
            parseMD(liner, me, 3)
        } else  if (value = isH2(line)) {
            let myParent = findParent(parent, level, 1)
            let me = {
                parent: myParent,
                header: value,
                description: "",
                level : 2,
                child: []
            }

            myParent.child.push(me)
            parseMD(liner, me, 2)
        } else if (value = isH1(line)) {
            let myParent = findParent(parent, level, 0)
            let me = {
                parent: myParent,
                header: value,
                description: "",
                level : 1,
                child: []
            }

            myParent.child.push(me)
            parseMD(liner, me, 1)
        } else {
            line = line.trim()
            if (line.length > 0){
                parent.description = parent.description.concat('<p>'+line+'</p>')
            }
            parseMD(liner, parent, level)
        }
    }
    return parent
}
function removeParentReference(jsonObj) {
    if( jsonObj !== null && typeof jsonObj == "object" ) {
        delete jsonObj.parent
        Object.entries(jsonObj).forEach(([key, value]) => {
            removeParentReference(value);
        });
    }
}

function applyTypographyStylesToRawText(markdownText){
    return markdownText
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\~(.*)\~/gim, '<del>$1</del>')
    .replace(/^\> (.*$)/gim, '<div class="alert alert-danger">$1</div>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' />")
    .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2'>$1</a>")
}
function hashCode(str){
    let hash = Array.from(str).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
    return Math.abs(hash % 17 % 4);              
}
function extractBadges(jsonObj) {
    var regExp = /\(([^)]+)\)/;

    if( jsonObj !== null && typeof jsonObj == "object" ) {
        if (jsonObj.header){
            var matches = regExp.exec(jsonObj.header);
            if (matches){
                // console.log('Found badge in parenteces: ', jsonObj.header);
                jsonObj.badge = matches[1]
                jsonObj.badgeCategory = hashCode(jsonObj.badge)
                jsonObj.header = jsonObj.header.replace(`(${matches[1]})`,'')
            }
            //matches[1] contains the value between the parentheses
            
        }
        Object.entries(jsonObj).forEach(([key, value]) => {
            extractBadges(value);
        });
    }
}

function writeByTemplate(mapTemaplateFile, model, outputFileName){
    let temaplateFile = fs.readFileSync(mapTemaplateFile,{ encoding: 'utf8' });
    let template = hb.compile(temaplateFile);
    var generatedHtml = template(model);

    fs.writeFile(outputFileName, generatedHtml, function (err) {
        if (err) return console.log(err);
        console.log('Generated: ', outputFileName);
    });
}

function generateDoc()
{    	
    var converter = new showdown.Converter();
    var html = converter.makeHtml(md);
}

// ===== converter function =====
function convert(filename, title){
    const sourceMdFileLiner = new lineByLine(filename)
    let parsedMdMapModel = parseMD(sourceMdFileLiner, {parent: null, child:[], description:"", level:0} , 0)
    removeParentReference(parsedMdMapModel)
    extractBadges(parsedMdMapModel)
    
    parsedMdMapModel.title = title
    writeByTemplate('index.template.html', parsedMdMapModel, 'index.html');

    let sourceMdFile = fs.readFileSync(filename,{ encoding: 'utf8' });
    var mdHtml = new showdown.Converter().makeHtml(sourceMdFile);
    
    writeByTemplate('index.doc.template.html', {content:mdHtml}, 'doc.html');
    
    fs.writeFile('model.json', JSON.stringify(parsedMdMapModel.child), function (err) {
        if (err) return console.log(err);
    });
    
}

// ===== actual converter =====
var argv = require('yargs/yargs')(process.argv.slice(2)).argv;

if (!argv.file){
    console.error("Usage: > node convert.js --file name-of-md-file.md --title 'Title'")
    process.exit(1)
}

//var appArgs = process.argv.slice(2);




// if (!appArgs || appArgs.length == 0){
//     console.error("Usage: > node convert.js name-of-md-file.md")
//     process.exit(1)
// }

const filename = argv.file
const title = argv.title? argv.title : "Capability Map"
convert(filename, title)

if (argv.watch){
    const fs = require('fs');

    fs.watch(filename, { encoding: 'buffer' }, (eventType, filename) => {
        if (filename) {
        console.log('rebuilding ... ');
        try{
            convert(filename, title)
            } catch(err){
                console.log(err)
            }
        }
    });
}