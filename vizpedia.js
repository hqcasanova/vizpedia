/* vizpedia v1.0
 * Copyright (c) 2017 Hector Quintero Casanova
 * Released under the MIT license
 */

/**
 * @fileOverview Pure JavaScript interface for the the CORS-enabled web service at
 * http://www.hqcasanova.com/vizpedia. Supports IE8+.
 * @version git-master
 * @author <a href="http://www.hqcasanova.com">hqcasanova</a>
 */
;(function (window, document, undefined) {
    'use strict';

    /**
     * Polyfill for IE8 to determine if a given argument is an array.
     * @autor <a href="https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray">Mozilla</a>
     */
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    /**
     * Creates a cross-browser (IE8+) CORS request without credentials.
     * @param {String} method Request method to be used
     * @param {String} url Url to which request is made
     * @author <a href="http://www.html5rocks.com/en/tutorials/cors/">HTML5Rocks.com</a>
     */
    function createCORSRequest(method, url) {
        var xhr = new XMLHttpRequest();

        // Checks if the XMLHttpRequest object has a "withCredentials" property.
        // "withCredentials" only exists on XMLHTTPRequest2 objects.
        if ('withCredentials' in xhr) {
            xhr.open(method, url, true);

        // Otherwise, checks if XDomainRequest.
        // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
        } else if (typeof XDomainRequest !== 'undefined') {
            xhr = new XDomainRequest();
            xhr.open(method, url);

        // Otherwise, CORS is not supported by the browser.
        } else {
            xhr = null;
        }

        return xhr;
    }

    /**
     * Creates a new Vizpedia instance with which requests can be made. Its properties at
     * instantiation time are considered global defaults.
     * @param {Number} [language = 1] Integer representing the default language. Default is English.
     * @param {String} [url = 'http://www.hqcasanova.com/vizpedia'] Service's endpoint's url.
     * @param {String} [imgType = 'png'] Type of image file expected from the server.
     * @param {Object} [callback = console.log] Default callback.
     * @constructor
     */
    var Vizpedia = function (language, url, imgType, callback) {
        if (language === undefined) {   //default set this way since language can be 0
            this.language = 1;
        }                         
        this.url = url || 'http://www.hqcasanova.com/vizpedia';
        this.imgType = imgType || 'png';
        this.callback = callback || function (response) {console.log(response);};
    };

    /**
     * Methods
     */
    Vizpedia.prototype = {

        /**
         * Makes the actual CORS request to retrieve the array of image identifiers. It assumes an empty 
         * array if the server comes back with an error.
         * @param {String} term Term to be looked up
         * @param {Number} [language] Term's language. If none specified, the global default is used instead. 
         * @param {Object} [onSuccess] Callback executed on request's success. Default is global callback. 
         * @param {Object} [onError] Callback executed on request's failure. Default is global callback.
         * @throws Will throw an error if the XHR object was not created. This is likely to happen on
         * browsers older than Internet Explorer 8.
         * @author Based on <a href="http://www.html5rocks.com/en/tutorials/cors/">HTML5Rocks.com</a>  
         * and <a href="http://youmightnotneedjquery.com/#json">You might not need jQuery</a>
         */
        get: function (term, language, onSuccess, onError) {
            var xhr;                //standard request object
            var vizpedia = this;        
            
            if (language === undefined) {   //safer since language can be 0
                language = this.language;
            }
            xhr = createCORSRequest('GET', this.url + '/' + term + '/' + language);

            onSuccess = onSuccess || this.callback;
            onError = onError || this.callback;

            //The browser probably predates IE8
            if (!xhr) {
                throw new Error('CORS not supported');

            //The browser is supported => makes request 
            } else {
                xhr.onreadystatechange = function () {

                    //The request is complete
                    if (this.readyState === 4) {

                        //The request was served successfully
                        if (this.status >= 200 && this.status < 400) {
                            onSuccess.call(vizpedia, JSON.parse(this.responseText), this);
                        
                        //Resource not found, probably because there's no entry for that term (assuming correct endpoint url)
                        } else if (this.status === 404) {
                            onSuccess.call(vizpedia, [], this);

                        //Server came back with an error code => return empty array   
                        } else {
                            onError.call(vizpedia, [], this);
                        }
                    }
                };

                //Issues request
                xhr.send();
                xhr = null;
            }
        },

        /**
         * Convenience wrapper for the 'get' method above. Builds the URL string for every image identifier
         * retrieved
         * @param {String} term Term to be looked up
         * @param {Number} [language] Term's language. If none specified, the global default is used instead. 
         * @param {Object} [callback] Callback executed after the request, irrespective of its success. 
         * By default, the global callback is used. 
         * @throws Will throw an error if the response from the server is not an array.
         */
        getUrls: function (term, language, callback) { 
            callback = callback || this.callback;               

            function onSuccess (imgIds) {   //when called, 'this' will point to the Vizpedia instance
                var imgUrls = [];
                var numImgs = 0;
                var i = 0;

                //imgIds expected as array of image identifiers
                if (Array.isArray(imgIds)) {
                    numImgs = imgIds.length;

                    for (i; i < numImgs; i++) {
                        imgUrls[i] = this.url + '/' + imgIds[i].charAt(0) + '/' + imgIds[i] + '.' + this.imgType;
                    }

                    callback.call(this, imgUrls);

                //Strange response
                } else {
                    throw new Error('Invalid response format');
                }
            }

            this.get(term, language, onSuccess, callback);
        }
    };

    //Creates default instance. If different properties required (e.g. different default language), 
    //the user can always create its own instance.
    window.Vizpedia = new Vizpedia(); 
}(window, document));
