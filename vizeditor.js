(function () {
    var imgCard;

    //Polyfill for IE8
    if (!String.prototype.trim) {
        String.prototype.trim = function () {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
    }

    //Set focus on first and only present text area
    document.getElementsByClassName('caption')[0].focus();

    imgCard = document.getElementsByClassName('image-card')[0].cloneNode(true);

    //Handler for new word search on pressing tab, space or enter
    document.getElementById('textarea').onkeydown = function (event) {
        event = event || window.event;

        if ((event.target && event.target.className == 'caption' ) && (event.keyCode == 13 || event.keyCode == 9 || event.keyCode == 32)) {
            event.preventDefault();
            Vizpedia.getUrls(event.target.innerHTML.trim());
        }
    };
}());