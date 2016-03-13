(function () {
    'use strict';

    var TRIM_REGEX = /^(<br>|&nbsp;|[\s\uFEFF\u00A0])+|(<br>|&nbsp;|[\s\uFEFF\u00A0]|\.|,|;|:|\?|!)+$/gi;
    var WORD_KEYS = [9, 13, 32];

    var langSelEl;
    var newCardEl;
    var textAreaEl;
    var imgCardEl;
    
    //Makes sure trimming also takes into account <br> (introduced by a bug on Firefox) and any nbsp
    //(added to avoid a bug on Firefox and IE)
    String.prototype.trim = function () {
        return this.replace(TRIM_REGEX, '');
    };

    //Polyfill for IE8
    if (!Array.indexOf) {
        Array.prototype.indexOf = function (obj) {
            var arrLength = this.length;
            var i = 0;

            for (var i; i < arrLength; i++) {
                if (this[i] == obj) {
                    return i;
                }
            }
            return -1;
        }
    }

    //Needed for referencing the chosen language on keypress (see 'onWordBoundary' below)
    langSelEl = document.getElementById('select-language');

    //Caches block of free text, the image cards' container
    textAreaEl = document.getElementById('textarea');

    //Sets up the 'mold' for new image cards using the current (and only) image card
    imgCardEl = textAreaEl.children[0];
    imgCardEl.onclick = onCardClick;
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

    //Sets focus on input area on clicking the image card
    //TODO: add support for IE8 (no currentTarget)
    function onCardClick (event) {
        event = event || window.event;
        event.currentTarget.children[1].focus();
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

        var target = event.target || event.srcElement;
        var word;

        if ((target && target.className == 'caption') && (WORD_KEYS.indexOf(event.keyCode) != -1)) {
            
            //Prevent any caret movements
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }

            //Fetches the urls of all images corresponding to the term just typed in (if any)
            word = event.target.innerHTML.trim();
            if (word.length) {
                target.contentEditable = 'false';  //TODO: remove this once backspace supported
                window.Vizpedia.getUrls(
                    word, 
                    langSelEl.value, 
                    onPictoResponse.bind(target.parentElement.children[0], word)
                );

                //Appends a new empty image card right next to the current one and makes caret appear on it
                textAreaEl.appendChild(newCardEl);
                newCardEl.children[1].focus();
                newCardEl.onclick = onCardClick;
                newCardEl = newCardEl.cloneNode(true);
            }
        }
    }
}());