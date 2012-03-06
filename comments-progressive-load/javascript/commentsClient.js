$(document).ready(function(){
  var commentsContainer = $("#vox-cmnt-container")
    , countContainer  = commentsContainer.find("#vox-cmnt-count")
    , scrollTimeout   = 0
    , pingTimeout     = 0
    , loadIncrement   = 100
    , lastUpdateIndex = 30
    , lastScrollIndex = 30
    , pendingNextLoad = null
    , pendingPingLoad = null
    , floorReached    = false;

  // ajax requests  
  function loadNext(){
    console.log("loading next");
    if (pendingNextLoad) { return; }
    pendingNextLoad = $.getJSON('http://localhost:1337/data', { 'from' : lastScrollIndex, 'to' : (lastScrollIndex + loadIncrement)}, function(data){ 
      pendingNextLoad = null; 
      lastScrollIndex = data.lastIndex;
      handleServerResponse(data);
    });
  }

  function pingServer() {
    console.log("running ping");
    if (pendingPingLoad) { return; }
    pendingPingLoad = $.getJSON('http://localhost:1337/data', { 'from' : lastUpdateIndex }, function(data){ 
      pendingPingLoad = null; 
      lastUpdateIndex = data.lastIndex;
      handleServerResponse(data);
      resetPingTimer();
    });
  }

  function handleServerResponse(data) {
    console.log("handle server data", data);
    floorReached = data.floorReached;
    updateCount(data.totalComments);
    updateComments(data.comments);
  }

  // UI STUFF
  function updateCount(count) {
    countContainer.html(count);
    countContainer.attr("data-comments-total")
  }

  function updateComments(comments) {
    // go through each one and generate find out where it needs to go. 
    for (var i = 0, len = comments.length; i<len; i++) {
      var comment = comments[i]
        , replyTo = (comment.replyTo && comment.replyTo.id) ? comment.replyTo.id : null;
      placeComment(ich.comment(comment), replyTo || null);
    }
  }

  function placeComment(commentHTML, replyTo) {
    if (replyTo) {
      commentsContainer.find("#comment_" + replyTo).append(commentHTML);
    } else {
      commentsContainer.append(commentHTML);
    }
  }

  // Scroll Stuf
  function handleScrollEnd(event) {
    var scrollTop =  $(window).scrollTop() + $(window).height()
      , offSet = commentsContainer.offset().top + commentsContainer.height()
      , buffer = 300;
    if (scrollTop > offSet - buffer) { 
      loadNext(); 
    }
  }

  function handleScroll(){
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(handleScrollEnd, 400)
  }

  // Ping Timer
  function handlePingTimeout(){
    pingServer();
    resetPingTimer();
  }

  function resetPingTimer() {
    clearTimeout(pingTimeout);
    pingTimeout = setTimeout(handlePingTimeout, 30000);
  }
  
  $.ajax({
    url: "http://localhost:1337/templates/comment.html.mu",
    success: function(data){
      ich.addTemplate("comment", data);
      $(window).bind("scroll", handleScroll);
      resetPingTimer();
    }
  });
});