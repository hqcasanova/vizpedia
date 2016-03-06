(function () {
    var imgCard = document.getElementsByClassName('image-card')[0].cloneNode(true);

    document.getElementsByClassName('caption')[0].focus();

    //Handler for new word search on pressing tab, space or enter
    document.getElementById('textarea').onkeydown = function (event) {
        event = event || window.event;

        if ((event.target && event.target.className == 'caption' ) && (event.keyCode == 13 || event.keyCode == 9 || event.keyCode == 32)) {
            Vizpedia.getUrls(event.target.innerHTML);
        } else {
            console.log(event);
      }
    };
}());