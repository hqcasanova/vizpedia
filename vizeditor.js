/*Pre-loads non-critical CSS asynchronously [c]2016 @scottjehl, Filament Group, Inc. Licensed MIT
!function(e){"use strict";var n=function(n,t,o){function i(e){return a.body?e():void setTimeout(function(){i(e)})}function r(){l.addEventListener&&l.removeEventListener("load",r),l.media=o||"all"}var d,a=e.document,l=a.createElement("link");if(t)d=t;else{var s=(a.body||a.getElementsByTagName("head")[0]).childNodes;d=s[s.length-1]}var f=a.styleSheets;l.rel="stylesheet",l.href=n,l.media="only x",i(function(){d.parentNode.insertBefore(l,t?d:d.nextSibling)});var u=function(e){for(var n=l.href,t=f.length;t--;)if(f[t].href===n)return e();setTimeout(function(){u(e)})};return l.addEventListener&&l.addEventListener("load",r),l.onloadcssdefined=u,u(r),l};"undefined"!=typeof exports?exports.loadCSS=n:e.loadCSS=n}("undefined"!=typeof global?global:this);
!function(t){if(t.loadCSS){var e=loadCSS.relpreload={};if(e.support=function(){try{return t.document.createElement("link").relList.supports("preload")}catch(e){return!1}},e.poly=function(){for(var e=t.document.getElementsByTagName("link"),n=0;n<e.length;n++){var r=e[n];"preload"===r.rel&&"style"===r.getAttribute("as")&&(t.loadCSS(r.href,r),r.rel=null)}},!e.support()){e.poly();var n=t.setInterval(e.poly,300);t.addEventListener&&t.addEventListener("load",function(){t.clearInterval(n)}),t.attachEvent&&t.attachEvent("onload",function(){t.clearInterval(n)})}}}(this);
*/
(function () {
    'use strict';

    var TRIM_REGEX = /^(#|<br>|&nbsp;|[\s\uFEFF\u00A0])+|(<br>|&nbsp;|[\s\uFEFF\u00A0]|\.|,|;|:|\?|!)+$/gi;
    var WORD_KEYS = '|9|13|32|';        //keycodes considered word boundary markers: tab, enter, space
    var CARD_CLASS;                     //default image card's class
    var FRAME_CLASS;                    //default pictogram container's class
    var PICTO_CLASS = 'picto';          //pictogram's img class
    var LOAD_CLASS = 'load';            //class for loading spinner
    var MULTIPICTO_CLASS = 'multiple';  //class for pictogram container if multiple pictos found
    var WORD_HASH_SEPARATOR = '+';
    var WORD_HASH_LIMIT = '20';

    var continueEl;             //DOM element for continue button
    var infoEl;                 //DOM element for info button
    var eraseEl;                //DOM element for erase button
    var langSelEl;              //DOM element needed for referencing the chosen language on keypress (see 'onWordBoundary' below)
    var textAreaEl;             //DOM element for block of free text, the image cards' container    
    var imgCardEl;              //DOM element for container of both pictogram and text represented by it
    var newCardEl;              //DOM element used as the mold for new image cards
    var pictoUrls;              //Global response cache. Every entry points to a list of urls.
    
    //Makes sure trimming also takes into account <br> (introduced by a bug on Firefox) and any nbsp
    //(added to avoid a bug on Firefox and IE)
    String.prototype.trim = function () {
        return this.replace(TRIM_REGEX, '');
    };

    //Normalises innerHeight (IE8's equivalent is clientHeight)
    window.innerHeight = window.innerHeight || document.documentElement.clientHeight;

    //Caches DOM elements
    continueEl = document.getElementById('continue-button');
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
    eraseEl.onclick = eraseAll;
    continueEl.onclick = goTo(document.getElementById(continueEl.href.split('#')[1]));
    infoEl.onclick = goTo(document.getElementById(infoEl.href.split('#')[1]));
    window.onload = stopSpinner;

    initialise();
    
    //Sets up text contents.
    function initialise () {
        var hash = location.hash.trim();

        //Detects and sets up localStorage in order to minimise requests.
        if (isLocalStorage()) {
            pictoUrls = getUrls('pictoUrls');
            window.onbeforeunload = flushUrls('pictoUrls', pictoUrls);
        } else {
            pictoUrls = {};
        }

        //If there's a hash fragment, takes words from it. Truncates word list if necessary.
        if (hash.length) {
            autoWrite(hash.split(WORD_HASH_SEPARATOR).slice(0, WORD_HASH_LIMIT), imgCardEl);
        
        //If the hash fragment is empty, the first image card is last and only one => sets focus.
        } else {
            deferredFocus(imgCardEl.lastChild);
        }
    }

    //Detection of locatStorage, taking into account buggy implementations that prevent setting and/or
    //removing items when on private browsing, for example.
    function isLocalStorage () {
        var supported = typeof window.localStorage !== 'undefined';
        if (supported) {
            try {
                localStorage.setItem('test_support', 'test_support');
                localStorage.removeItem('test_support');
            } catch (e) {
                supported = false;
            }
        }
        return supported;
    }

    //Retrieves all pictogram URLs currently on localStorage
    function getUrls (key) {
        return JSON.parse(localStorage.getItem(key)) || {};
    }

    //Saves all cached pictogram URLs to localStorage. Blank URLs are not persisted (entries without
    //a pictogram can be updated in the future).
    function flushUrls (key, urlObj) {
        return function () {
            var word;

            for (word in urlObj) {
                if (!urlObj[word]) {
                    delete urlObj[word];
                }
            }
            localStorage.setItem(key, JSON.stringify(urlObj));
        }
    }

    //Sets focus on input area on clicking the image card
    function focusOnClick (currentTarget) {       
        return function () {
            currentTarget.lastChild.focus();
        }
    }

    //Wipes out all the existing image cards and adds a blank one.
    function eraseAll (event) { 
        textAreaEl.innerHTML = '';
        newCard().lastChild.focus();
    }

    //Instead of using local anchoring, emulate it through JS to avoid polluting the hash fragment 
    //(used to maintain text state) 
    function goTo (targetEl) {
        return function (event) {
            event = event || window.event;

            //Cancels default behaviour: change of hash fragment and scrolling
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }

            targetEl.scrollIntoView();
        }
    }

    //Removes loading feedback once all page resources are loaded.
    function stopSpinner () {
        continueEl.className = continueEl.className.replace(LOAD_CLASS, '');
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
        } else {
            deferredFocus(inputEl);
        }
    }

    //Actions to be performed when a word ending is detected (such as pressing space)
    function onWordBoundary (currentTarget) {
        return function (event) {
            event = event || window.event;

            var target = event.target || event.srcElement;

            //TODO: support for backspace and arrows
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
                location.hash = getTextHash();

                //Sets focus on next image card
                setFocusNext(target.parentElement.nextSibling);
            }
        }
    }

    //Avoids using textContent (not supported on IE8) and sanitises each input area's text 
    //before adding it to the hash (needed as a workaround for Firefox's bug with innerHTML and
    //contentEditable; it sometimes appends a <br/>).
    function getTextHash () {
        var cards = textarea.children;
        var numCards = cards.length;
        var text = [];
        var word = '';
        var i = 0;

        for (i; i < numCards; i++) {
            word = cards[i].lastChild.innerHTML.trim();
            if (word) {
                text.push(word);
            }
        }

        return text.join(WORD_HASH_SEPARATOR);
    }

    //Appends a new image card to the text area, complete with event handlers. Uses the global
    //image card mold element, updating it at the end for the next new card.
    function newCard () {
        textAreaEl.appendChild(newCardEl);
        newCardEl.onclick = focusOnClick(newCardEl);
        newCardEl = newCardEl.cloneNode(true);

        return textAreaEl.lastChild;
    }

    //Sets focus on last image card once it climbs above the fold and only for once
    function deferredFocus (inputEl) { 
        var interval;

        if (inputEl.getBoundingClientRect().bottom > window.innerHeight) {
            interval = window.setInterval(function () {
                if (inputEl.getBoundingClientRect().bottom <= window.innerHeight) {
                    inputEl.focus();
                    window.clearInterval(interval); 
                }
            }, 300);
        } else {
            inputEl.focus();
        }
    }

    //Sets focus on next card element's input area. If there's no sibling card, appends a new empty 
    //one right next to the current.
    function setFocusNext (nextCardEl) {
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

            //Prevents making a additional requests for a words without an entry
            pictoUrls[word] = '';

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