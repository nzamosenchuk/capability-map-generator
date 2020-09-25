const lineByLine = require('n-readlines')
const hb = require('handlebars')
const fs = require('fs');


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
    .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' />")
    .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2'>$1</a>")
}
function extractBadges(jsonObj) {
    var regExp = /\(([^)]+)\)/;

    if( jsonObj !== null && typeof jsonObj == "object" ) {
        if (jsonObj.header){
            var matches = regExp.exec(jsonObj.header);
            if (matches){
                console.log('Found badge in parenteces: ', jsonObj.header);
                jsonObj.badge = matches[1]
                jsonObj.header = jsonObj.header.replace(`(${matches[1]})`,'')
            }
            //matches[1] contains the value between the parentheses
            
        }
        Object.entries(jsonObj).forEach(([key, value]) => {
            extractBadges(value);
        });
    }
}


// ===== converter function =====
function convert(filename){
    const liner = new lineByLine(filename)
    let model = parseMD(liner, {parent: null, child:[], description:"", level:0} , 0)
    removeParentReference(model)
    extractBadges(model)
    let htmlTemaplate = fs.readFileSync('index.template.html',{ encoding: 'utf8' });
    
    var template = hb.compile(htmlTemaplate);
    var result = template(model);
    
    fs.writeFile('index.html', result, function (err) {
        if (err) return console.log(err);
        console.log('Generated: index.html');
    });
    fs.writeFile('model.json', JSON.stringify(model.child), function (err) {
        if (err) return console.log(err);
    });
}

// ===== actual converter =====
var appArgs = process.argv.slice(2);
if (!appArgs || appArgs.length == 0){
    console.error("Usage: > node convert.js name-of-md-file.md")
    process.exit(1)
}
const filename = appArgs[0]
convert(filename)

if (appArgs.length>1 && appArgs[1]=='--watch'){
    const fs = require('fs');

fs.watch(filename, { encoding: 'buffer' }, (eventType, filename) => {
    if (filename) {
      console.log('rebuilding ... ');
      convert(filename)
    }
  });
}