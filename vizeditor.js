(function () {
    'use strict';

    var TRIM_REGEX = /^(#|<br>|&nbsp;|[\s\uFEFF\u00A0])+|(<br>|&nbsp;|[\s\uFEFF\u00A0]|\.|,|;|:|\?|!)+$/gi;
    var WORD_KEYS = '|9|13|32|';        //keycodes considered word boundary markers: tab, enter, space
    var SPACE_HTML = '&nbsp;';          //HTML-encoded character used as default word-boundary marker
    var CARD_CLASS;                     //default image card's class
    var FRAME_CLASS;                    //default pictogram container's class
    var PICTO_CLASS = 'picto';          //pictogram's img class
    var LOAD_CLASS = 'load';            //class for loading spinner
    var MULTIPICTO_CLASS = 'multiple';  //class for pictogram container if multiple pictos found
    var WORD_HASH_SEPARATOR = '+';
    var WORD_HASH_LIMIT = '20';

    var infoEl;                 //DOM element for info button
    var eraseEl;                //DOM element for erase button
    var langSelEl;              //DOM element needed for referencing the chosen language on keypress (see 'onWordBoundary' below)
    var textAreaEl;             //DOM element for block of free text, the image cards' container    
    var imgCardEl;              //DOM element for container of both pictogram and text represented by it
    var newCardEl;              //DOM element used as the mold for new image cards
    var pictoUrls = {};         //Global response cache. Every entry points to a list of urls.
    var lastCardTop = 0;        //Offset from viewport's top for last image card. Helps determine if above fold
    
    //Makes sure trimming also takes into account <br> (introduced by a bug on Firefox) and any nbsp
    //(added to avoid a bug on Firefox and IE)
    String.prototype.trim = function () {
        return this.replace(TRIM_REGEX, '');
    };

    //IE8 Polyfill for textContent functionality
    if (Object.defineProperty 
        && Object.getOwnPropertyDescriptor 
        && Object.getOwnPropertyDescriptor(Element.prototype, "textContent") 
        && !Object.getOwnPropertyDescriptor(Element.prototype, "textContent").get) {
        (function() {
            var innerText = Object.getOwnPropertyDescriptor(Element.prototype, "innerText");
            Object.defineProperty(Element.prototype, "textContent", {
                get: function() {
                    return innerText.get.call(this);
                },
                set: function(s) {
                    return innerText.set.call(this, s);
                }
            });
        })();
    }

    //Caches DOM elements
    infoEl = document.getElementById('info-button');
    eraseEl = document.getElementById('erase-button');
    langSelEl = document.getElementById('select-language');   
    textAreaEl = document.getElementById('textarea');
    
    //Sets up the 'mold' for new image cards using the current (and only) image card
    imgCardEl = textAreaEl.firstChild;
    CARD_CLASS = imgCardEl.className;
    FRAME_CLASS = imgCardEl.firstChild.className;
    newCardEl = imgCardEl.cloneNode(true);

    //Assigns event handlers
    imgCardEl.onclick = focusOnClick(imgCardEl);
    textAreaEl.onkeydown = onWordBoundary(textAreaEl);
    eraseEl.onclick = onDelete;
    infoEl.onclick = goTo(document.getElementById(infoEl.href.split('#')[1]));
    
    //If there's a hash fragment, takes words from it. Truncates word list if necessary.
    if (location.hash) {
        autoWrite(location.hash.trim().split(WORD_HASH_SEPARATOR).slice(0, WORD_HASH_LIMIT), imgCardEl);
    
    //No hash => first image card is last and only one => above the fold (except portrait) => sets focus
    } else {
        imgCardEl.lastChild.focus();
    }

    //Instead of using local anchoring, emulate it through JS to avoid polluting the hash fragment (used to maintain text state) 
    function goTo (targetEl) {
        return function (event) {
            event = event || window.event;

            //Prevents change of hash fragment and scrolling
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }

            targetEl.scrollIntoView();
        }
    }

    //Programmatically adds words and their pictograms, waiting for any request to finish before proceeding
    //with the next word. This is to maximise cache hits when inserting new words. Also disables any
    //text input while a pictogram is being looked up
    function autoWrite (words, cardEl) {
        var inputEl = cardEl.lastChild;
        if (words.length) {
            inputEl.contentEditable = false;       //only allows edition once response retrieved
            cardEl.className += ' disabled';
            inputEl.innerHTML = words.shift();
            addPictos(inputEl, function () {
                newCard();
                inputEl.contentEditable = true;
                cardEl.className = CARD_CLASS;
                autoWrite(words, cardEl.nextSibling);
            });

        //Makes cursor appear on the last image card's input area below the pictogram provided such card is
        //above the fold
        } else {
            window.innerHeight = window.innerHeight || document.documentElement.clientHeight;
            if (inputEl.getBoundingClientRect().top < window.innerHeight) {
                inputEl.focus();
            }
        }
    }

    //Wipes out all the existing image cards and adds a blank one.
    function onDelete () { 
        textAreaEl.innerHTML = '';
        newCard().lastChild.focus();
    }

    //Sets focus on input area on clicking the image card
    function focusOnClick (currentTarget) {       
        return function () {
            currentTarget.lastChild.focus();
        }
    }

    //Actions to be performed when a word ending is detected (such as pressing space)
    function onWordBoundary (currentTarget) {
        return function (event) {
            event = event || window.event;

            var target = event.target || event.srcElement;

            if ((target && target.className == 'caption') && (WORD_KEYS.indexOf('|' + event.keyCode + '|') != -1)) {
                
                //Prevents any caret movements
                if (event.preventDefault) {
                    event.preventDefault();
                } else {
                    event.returnValue = false;
                }
                  
                //Adds any found pictograms
                addPictos(target);

                //Updates URL fragment with whatever text has been written so far
                location.hash = currentTarget.textContent.trim().replace(/\s+/g, '+');

                //Sets focus on next image card
                setFocus(target.parentElement.nextSibling);
            }
        }
    }

    //Appends a new image card to the text area, complete with event handlers. Uses the global
    //image card mold element, updating it at the end for the next new card.
    function newCard () {
        textAreaEl.appendChild(newCardEl);
        newCardEl.onclick = focusOnClick(newCardEl);
        newCardEl = newCardEl.cloneNode(true);

        return textAreaEl.lastChild;
    }

    //Sets focus on next card element's input area. If there's no sibling card, appends a new empty 
    //one right next to the current.
    function setFocus (nextCardEl) {
        if (nextCardEl) {
            nextCardEl.lastChild.focus();
        } else {
            newCard().lastChild.focus();
        }
    }

    //Adds any found pictograms and moves caret to new pictogram card. 
    //A callback after pictogram insertion (or not) can be specified 
    function addPictos (activeInput, callback) {
        var word = activeInput.innerHTML.trim();
        var frameEl = activeInput.previousSibling;

        callback = callback || function () {};

        if (word.length) {

            //Normalises input's content to ensure later on there's at least one space separating words
            activeInput.innerHTML = activeInput.innerHTML.replace(SPACE_HTML, '') + SPACE_HTML;

            //If not cached, fetches the urls of all images corresponding to the term just typed in (if any)
            activeInput.parentElement.title = word;

            if (pictoUrls.hasOwnProperty(word)) {
                onPictoResponse(frameEl, word)(pictoUrls[word]);
                callback();
            } else {
                frameEl.className += ' ' + LOAD_CLASS;
                try {
                    window.Vizpedia.getUrls(
                        word, 
                        langSelEl.value,
                        function (imgUrls) {
                            onPictoResponse(frameEl, word)(imgUrls);
                            callback();
                        }
                    );

                //Rolls back if there's a server problem
                } catch (e) {
                    frameEl.className = FRAME_CLASS;
                }
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

            //Resets card
            frameEl.className = FRAME_CLASS;
            frameEl.onclick = function () {};
            imgEl.src = '';

            //If pictos found, shows first one
            if (numPictos) {
                frameEl.className = frameEl.className.replace(' none', '');
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
            }
        }
    }
}());