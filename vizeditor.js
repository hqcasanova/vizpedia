(function () {
    'use strict';

    var langSelEl;
    var newCardEl;
    var textAreaEl;
    var imgCardEl;

    //Polyfill for IE8
    if (!String.prototype.trim) {
        String.prototype.trim = function () {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
    }

    //Needed for referencing the chosen language on keypress (see 'onWordBoundary' below)
    langSelEl = document.getElementById('select-language');

    //Caches block of free text, the image cards' container
    textAreaEl = document.getElementById('textarea');

    //Sets up the 'mold' for new image cards using the current (and only) image card
    imgCardEl = textAreaEl.children[0]
    newCardEl = imgCardEl.cloneNode(true);

    //Makes cursor appear on first image card's input area below the pictogram
    imgCardEl.children[1].focus();

    //Assigns global handlers
    textAreaEl.onkeydown = onWordBoundary;
    document.getElementById('delete-button').onclick = onDelete;


    //Wipes out all the existing image cards and adds a blank one.
    function onDelete () {
        textAreaEl.innerHTML = newCardEl.outerHTML;
        textAreaEl.children[0].children[1].focus();
    }

    function onPictoResponse (word, imgUrls) {
        var imgEl;

        if (imgUrls.length) {
            imgEl = this.children[0];
            imgEl.src = imgUrls[0];
            imgEl.alt = word;
        }
    }

    function onWordBoundary (event) {
        event = event || window.event;

        var target = event.target;
        var word;

        if ((target && target.className == 'caption' ) && (event.keyCode == 13 || event.keyCode == 9 || event.keyCode == 32)) {
            
            //Prevent any caret movements or further changes to the text
            event.preventDefault();
            target.contentEditable = 'false';

            //Fetches the urls of all images corresponding to the term just typed in
            word = event.target.innerHTML.trim();
            window.Vizpedia.getUrls(
                word, 
                langSelEl.value, 
                onPictoResponse.bind(target.parentElement.children[0], word)
            );

            //Appends a new empty image card right next to the current one and makes caret appear on it
            textAreaEl.appendChild(newCardEl);
            newCardEl.children[1].focus();
            newCardEl = newCardEl.cloneNode(true);
        }
    }
}());