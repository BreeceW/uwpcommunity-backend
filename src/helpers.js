
/**
 * @summary Get the first matching regex group, instead of an array with the full string and all matches
 * @param {string} toMatch  
 * @param {regex} regex 
 * @returns {string} First matching regex group
 */
function match(toMatch, regex) {
    let m = regex.exec(toMatch);
    return (m && m[1]) ? m[1] : undefined;
}

function replaceAll(text, target, replacement) {
    return text.split(target).join(replacement);
};

function remove(text, target) {
    return text.split(target).join("");
};

module.exports = {
    match, replaceAll, remove
};