(function () {
    'use strict';

    var LOADING_IMG = 'data:image/gif;base64,R0lGODlhKwALAMIEAP///wAAAIKCggAAABRaZhRaZhRaZhRaZiH/C05FVFNDQVBFMi4wAwEAAAAh+QQJMgADACwAAAAAKwALAAADNDiyzPNQtRbhpHfWTCP/mgduYEl+Z8mlGauG1ii+7bzadBejeL64sIfvAtQJR7yioHJsJQAAIfkECTIAAwAsAAAAACsACwAAAz84sMzzcIhJaYQ1q8bBzeAHVh0njtOJlo06uiDrRKhF14K8wNpd6x4fikfSEW0YHPCYEo6WzlBUI7s8albJMAEAIfkECTIAAwAsAAAAACsACwAAAz84sszzcIBJaYQtq6xj/dPFjaRwgZ9YrsuJWhHLui+gyiT93jino7xe4wcKCluemi127ECUS8xqM7o8alaqLwEAIfkEATIAAwAsAAAAACsACwAAA0I4sszzULUWIbgYy0kjn1UmXl8HlU40iuhStUK4YvDbyjNQe7ea671T8PEDomxHX24nTFp+zEd0UNxwKtISljobJAAAOw==';
    var TRIM_REGEX = /^(#|<br>|&nbsp;|[\s\uFEFF\u00A0])+|(<br>|&nbsp;|[\s\uFEFF\u00A0]|\.|,|;|:|\?|!)+$/gi;
    var WORD_KEYS = [9, 13, 32];        //keycodes considered word boundary markers: tab, enter, space
    var FRAME_CLASS;                    //default pictogram container's class
    var PICTO_CLASS;                    //default pictogram's img class
    var LOAD_CLASS = 'load';            //class for loading spinner
    var MULTIPICTO_CLASS = 'multiple';  //class for pictogram container if multiple pictos found
    var WORD_HASH_SEPARATOR = '+';
    var WORD_HASH_LIMIT = '20';

    var langSelEl;
    var newCardEl;
    var textAreaEl;
    var imgCardEl;
    var pictoUrls = {};           //Global response cache. Every entry points to a list of urls.
    
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
    imgCardEl = textAreaEl.firstChild;
    FRAME_CLASS = imgCardEl.firstChild.className;
    PICTO_CLASS = imgCardEl.firstChild.firstChild.className;
    imgCardEl.onclick = focusOnClick(imgCardEl);
    newCardEl = imgCardEl.cloneNode(true);

    //Makes cursor appear on first image card's input area below the pictogram
    imgCardEl.lastChild.focus();

    //Assigns global handlers
    textAreaEl.onkeydown = onWordBoundary;
    document.getElementById('delete-button').onclick = onDelete;

    //Programmatically adds words and their pictograms, waiting for any request to finish before proceeding
    //with the next word. This is to maximise cache hits when inserting new words.
    function autoWrite (words, cardEl) {
        if (words.length) {
            cardEl.lastChild.innerHTML = words.shift();
            addPictos(cardEl.lastChild, function () {
                setFocus();
                autoWrite(words, cardEl.nextSibling);
            });
        }
    }

    //If there's a hash fragment, takes words from it. Truncates word list if necessary.
    if (location.hash) {
        autoWrite(location.hash.trim().split(WORD_HASH_SEPARATOR).slice(0, WORD_HASH_LIMIT), imgCardEl);
    }

    //Wipes out all the existing image cards and adds a blank one.
    function onDelete () {
        textAreaEl.innerHTML = newCardEl.outerHTML;
        textAreaEl.firstChild.lastChild.focus();
    }

    //Sets focus on input area on clicking the image card
    function focusOnClick (currentTarget) {       
        return function () {currentTarget.lastChild.focus()}
    }

    //Actions to be performed when a word ending is detected (such as pressing space)
    function onWordBoundary (event) {
        event = event || window.event;

        var target = event.target || event.srcElement;

        if ((target && target.className == 'caption') && (WORD_KEYS.indexOf(event.keyCode) != -1)) {
            
            //Prevents any caret movements
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
              
            //Adds any found pictograms
            addPictos(target);
            setFocus(target.parentElement.nextSibling);
        }
    }

    //Sets focus on next card element. If there's no sibling card, appends a new empty one right next to the 
    //current.
    function setFocus (nextCardEl) {
        if (nextCardEl) {
            nextCardEl.lastChild.focus();
        } else {
            textAreaEl.appendChild(newCardEl);
            newCardEl.lastChild.focus();
            newCardEl.onclick = focusOnClick(newCardEl);
            newCardEl = newCardEl.cloneNode(true);
        }
    }

    //Adds any found pictograms and moves caret to new pictogram card. 
    //A callback after pictogram insertion (or not) can be specified 
    function addPictos (activeInput, callback) {
        var word = activeInput.innerHTML.trim();
        var frameEl = activeInput.previousSibling;

        callback = callback || function () {};

        if (word.length) {

            //If not cached, fetches the urls of all images corresponding to the term just typed in (if any)
            activeInput.parentElement.title = word;

            if (pictoUrls.hasOwnProperty(word)) {
                onPictoResponse(frameEl, word)(pictoUrls[word]);
                callback();
            } else {
                frameEl.firstChild.className = 'load';
                frameEl.firstChild.src = LOADING_IMG;
                window.Vizpedia.getUrls(
                    word, 
                    langSelEl.value,
                    function (imgUrls) {
                        onPictoResponse(frameEl, word)(imgUrls);
                        callback();
                    }
                );
            }
        }        
    }

    //"Compiles" the actions for words with one or more pictograms
    function onPictoResponse (frameEl, word) {
        var nextPicto = 1;
        var cacheEl = new Image();
        var imgEl = frameEl.firstChild;

        return function (imgUrls) {
            var numPictos = imgUrls.length;
            var i = 1;

            //Clears card of any previous pictogram
            imgEl.src = '';

            //If pictos found, shows first one
            if (numPictos) {
                imgEl.className = PICTO_CLASS;
                imgEl.src = imgUrls[0];
                pictoUrls[word] = imgUrls;

                //If more than one picto...
                if (numPictos > 1) {

                    //Caches the other pictos
                    for (i; i < numPictos; i++) {
                        cacheEl.src = imgUrls[i];
                    }

                    //Change cursor when hovering over picto
                    frameEl.className += ' ' + MULTIPICTO_CLASS;

                    //Shows next picto on click
                    frameEl.onclick = function () {
                        imgEl.src = pictoUrls[word][nextPicto % numPictos];
                        nextPicto++;
                    }
                }

            //Resets pictogram's container cursor
            } else {
                frameEl.className = FRAME_CLASS;
            }
        }
    }
}());