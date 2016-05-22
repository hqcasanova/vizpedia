//Vizpedia service plugin
!function(t,i,n){"use strict";function e(t,i){var n=new XMLHttpRequest;return"withCredentials"in n?n.open(t,i,!0):"undefined"!=typeof XDomainRequest?(n=new XDomainRequest,n.open(t,i)):n=null,n}Array.isArray||(Array.isArray=function(t){return"[object Array]"===Object.prototype.toString.call(t)});var a=function(t,i,e,a){t===n&&(this.language=1),this.url=i||"http://www.hqcasanova.com/vizpedia",this.imgType=e||"png",this.callback=a||function(t){console.log(t)}};a.prototype={get:function(t,i,a,r){var s,o=this;if(i===n&&(i=this.language),s=e("GET",this.url+"/"+t+"/"+i),a=a||this.callback,r=r||this.callback,!s)throw new Error("CORS not supported");s.onreadystatechange=function(){4===this.readyState&&(this.status>=200&&this.status<400?a.call(o,JSON.parse(this.responseText),this):404===this.status?a.call(o,[],this):r.call(o,[],this))},s.send(),s=null},getUrls:function(t,i,n){function e(t){var i=[],e=0,a=0;if(!Array.isArray(t))throw new Error("Invalid response format");for(e=t.length,a;e>a;a++)i[a]=this.url+"/"+t[a].charAt(0)+"/"+t[a]+"."+this.imgType;n.call(this,i)}n=n||this.callback,this.get(t,i,e,n)}},t.Vizpedia=new a}(window,document);

(function () {
    'use strict';

    var TRIM_REGEX = /^(#|<br>|&nbsp;|[\s\uFEFF\u00A0])+|(<br>|&nbsp;|[\s\uFEFF\u00A0]|\.|,|;|:|\?|!)+$/gi;
    var WORD_KEYS = '|9|13|';           //keycodes considered word boundary markers: tab, enter
    var CARD_CLASS;                     //default image card's class
    var FRAME_CLASS;                    //default pictogram container's class
    var PICTO_CLASS = 'picto';          //pictogram's img class
    var LOAD_CLASS = 'load';            //class for loading spinner
    var MULTIPICTO_CLASS = 'multiple';  //class for pictogram container if multiple pictos found
    var HASH_WORD_SEPARATOR = '+';
    var HASH_WORD_LIMIT = '20';

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

    initialise();
    
    //Sets up environment.
    function initialise () {

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
        newCardEl.lastChild.innerHTML = '';     //removes placeholder

        //Assigns event handlers
        window.onload = startScriptTasks;
        continueEl.onclick = goTo(document.getElementById(continueEl.href.split('#')[1]));
        eraseEl.onclick = eraseAll;
        infoEl.onclick = goTo(document.getElementById(infoEl.href.split('#')[1]));
        textAreaEl.onkeydown = onWordBoundary(textAreaEl);
        imgCardEl.onclick = focusOnClick(imgCardEl, true);
        imgCardEl.lastChild.onfocus = function () { //Allows clearing on click only once         
            focusOnClick(imgCardEl, true)();
            imgCardEl.onclick = focusOnClick(imgCardEl);
            imgCardEl.lastChild.onfocus = null;
        }

        //Detects and sets up localStorage in order to minimise requests.
        if (isLocalStorage()) {
            pictoUrls = getUrls('pictoUrls');
            window.onbeforeunload = flushUrls('pictoUrls', pictoUrls);
        } else {
            pictoUrls = {};
        }
    }

    //Detection of localStorage, taking into account buggy implementations that prevent setting and/or
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

    //Sets focus on input area on clicking the image card, clearing its current text content if specified.
    function focusOnClick (currentTarget, clear) {
        if (clear) {
            return function () {
                currentTarget.lastChild.innerHTML = '&nbsp;';
                currentTarget.lastChild.focus();
            }
        } else {
            return function () {
                currentTarget.lastChild.focus();
            }
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

    //Runs anything that may trigger additional resource downloads and, therefore, must wait first for the
    //critical ones before proceeding (eg: pictograms for sentence in hash if applicable)
    function startScriptTasks () {
        var hash = location.hash.trim();

        //Removes loading feedback
        continueEl.className = continueEl.className.replace(LOAD_CLASS, '');

        //Pushes the default card with placeholder to the end of the to-be-written sentence.
        //Truncates word list if necessary
        if (hash.length) {    
            autoWrite(hash.split(HASH_WORD_SEPARATOR).slice(0, HASH_WORD_LIMIT), newCard(imgCardEl));
        }
    }

    //Programmatically adds words and their pictograms, waiting for any request to finish before proceeding
    //with the next word. This is to maximise cache hits when inserting new words. Also disables any
    //text input while a pictogram is being looked up
    function autoWrite (words, cardEl) {
        var inputEl = cardEl.lastChild;

        inputEl.contentEditable = false;       //only allows edition once response retrieved
        cardEl.className += ' disabled';
        inputEl.innerHTML = words.shift();
        addPictos(inputEl, function () {
            inputEl.contentEditable = true;
            cardEl.className = CARD_CLASS;
            if (words.length) {
                newCard(imgCardEl);
                autoWrite(words, cardEl.nextSibling);
            }
        });
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

        return text.join(HASH_WORD_SEPARATOR);
    }

    //Appends a new image card to the text area, complete with event handlers. Uses the global
    //image card mold element, updating it at the end for the next new card. If "beforeEl" is specified,
    //it inserts the new card before the provided element.
    function newCard (beforeEl) {
        var cardEl;     //image card just inserted

        textAreaEl.insertBefore(newCardEl, beforeEl || null);
        newCardEl.onclick = focusOnClick(newCardEl);
        cardEl = newCardEl;
        newCardEl = newCardEl.cloneNode(true);
        return cardEl;
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