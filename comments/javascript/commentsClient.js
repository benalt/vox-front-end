$(document).ready(function(){
  var commentsContainer   = $("#vox-cmnt-container")
    , countContainer      = $("#vox-cmnt-count")
    , commentsBlock       = $("#vox-cmnt-block")
    , commentsBlockTop    = commentsContainer.offset().top
    , alertBar            = null
    , scrollTimeout       = 0
    , pingTimeout         = 0
    , commentCountTimeout = 0 
    , commentsCount       = 0 
    , lastUpdateIndex     = 0
    , pendingPingLoad     = null
    , lastThreadViewed    = false;

  // util 

  function pingServer() {
    if (pendingPingLoad) { return; }
    pendingPingLoad = $.getJSON('http://localhost:1337/data/updates', { 'idx' : lastUpdateIndex }, function(data){ 
      pendingPingLoad = null; 
      lastUpdateIndex = data.updateIdx;
      commentsCount = data.commentsCount;
      addComments(data.updates);
      animateCommentsCount();
    });
  }
  
  // Ping for updates Timer
  function handlePingTimeout(){
    pingServer();
    resetPingTimer();
  }

  function resetPingTimer() {
    clearTimeout(pingTimeout);
    pingTimeout = setTimeout(handlePingTimeout, 20000);
  }

  // UI STUFF
  function addThreads(threads) {
    for (var i = 0, len=threads.length; i<len; i++) {
      commentsContainer.append(ich.comment_raw({"id" : threads[i]}));
    }
    loadNextInView({duration:200});
  }
  
  function renderComment(comment, unread) {
    comment.unread = unread || false
    var cmnt = $(ich.comment(comment));
    
    if (comment.replies && comment.replies.length > 0) {
      for (var i=0,len=comment.replies.length; i<len; i++) {
        cmnt.append(renderComment(comment.replies[i]));
      }
    }
    return cmnt;
  }
  
  function updateThread(thread) {
    var newThread = $(renderComment(thread));
    $("#comment_" + thread.id).replaceWith(newThread);
    newThread.hide();
    newThread.fadeIn("slow");
    loadNextInView();
  }
  
  function addComments(comments) {
    // THIS THING IS FUGLY
    for (var i=0, len=comments.length;i<len;i++){
      var comment = comments[i];
      if (comment.replyTo && comment.replyTo.id) {
        var parent = commentsContainer.find("#comment_" + comment.replyTo.id);
        if(parent.length > 0) {
          parent.append(renderComment(comment));
          pushAlert({"type":"reply","id" : comment.id});
        }
      } else{ 
          commentsContainer.append(ich.comment_raw({"id" : comment.id}));
          pushAlert({"type":"new" , "id" : comment.id});
      } 
    }
  }
  
  function reccomendComment(id) {
    $("#comment_" + id + " .vox-cmnt-item").first().addClass("vox-cmnt-recommended");
    pushAlert({"type":"recommend" , "id" : id});
  }
  
  // Count up top value
  function animateCommentsCount() {
    clearTimeout(commentCountTimeout);
    var currentCount = parseInt(countContainer.text());
    if (currentCount == NaN) { 
    }
    if (currentCount < commentsCount) {
      countContainer.text(currentCount + 1);
      commentCountTimeout = setTimeout(animateCommentsCount, 200);
    }
  }
  
  function loadNextInView(scroll){
    commentsContainer.find(".vox-cmnt-raw:in-viewport").each(function(idx, item){
      $.getJSON('http://localhost:1337/data/thread', { 'id' : $(item).attr("data-comment-id") }, function(data){ 
        updateThread(data);
      });
    });
  }

  // navBlockStuff
  function buildAlertBar() {
    alertBar = $('<div id="vox-cmnt-alertBar"><div class="vox-cmnt-alertRail" /></div>');
    $("#vox-doc").append(alertBar);
    commentsBlockTop = commentsBlock.offset().top
    updateAlertBarUI();
  }
  
  function updateAlertBarUI() {
    updateAlertBarPosition();
    updateAlertItems();
  }
  
  function updateAlertBarPosition() {
    // set size, set position
    var height      = $(window).height()
      , commentsEnd = commentsBlock.height() - height
      , scrollTop   = $(document).scrollTop()
      , height      = (scrollTop < commentsBlockTop) ? (height - commentsBlockTop) : height
      , yPos        = (scrollTop < commentsBlockTop) ? commentsBlockTop : (scrollTop>commentsEnd) ? commentsEnd : scrollTop;
    alertBar.height(height);
    alertBar.animate({"top": yPos }, 200);
  }
  
  function updateAlertItems(){
    var abHeight = alertBar.height();
    
    // TODO : If another of the same type exists within the same join them into one block,
    
    alertBar.find('.vox-cmnt-alert').each(function(idx, item){
      // YUK, this really could use some help
      var alert = $(item)
        , comment = commentsContainer.find('#comment_' + alert.attr("data-comment-id"))
        , relativeY = (((comment.offset().top - commentsBlockTop) / commentsBlock.height()) * abHeight ) - 10;
      alert.css({"top":relativeY});  
    });
  }
  
  function alertContextFactory(alert) {
    // this could be done more elegantly
    var type = alert.type
      , count = alert.count;
      
    return {
      "count"     : count,
      "id"        : alert.id,
      "label"     : "new", 
      "type"      : type,
      "typeClass" : function(){
        if (type == "reply") return "vox-cmnt-alert-reply";
        if (type == "recommend") return "vox-cmnt-alert-rec";
        if (type == "new") return "vox-cmnt-alert-new";
      }(),
      "messages"  : function(){
        if (type == "reply") {
          return (count == 1) ? "reply" : "replies";
        }
        if (type == "new") {
          return (count == 1) ? "comment" : "comments";
        }
        if (type == "recommend") {
          return "recommended";
        }
        return "";
      }()
    }
  }
  
  function handleAlertClick(event){
    event.stopPropagation();
    var alert = $(event.currentTarget);
    scrollTo(alert.attr("data-comment-id"));
    alert.remove()
  }
  
  function handleAlertMouseenter(event) {
    $(event.currentTarget).find(".vox-cmnt-alert-label").fadeIn("fast");
  }
  
  function handleAlertMouseleave(event) {
    $(event.currentTarget).find(".vox-cmnt-alert-label").delay(5000).fadeOut("slow");
  }
  
  function pushAlert(alert){
    if (alert.type == "new") {
      if (alertBar.find('vox-cmnt-alert.[data-alert-type = "new"]').length > 0) { return; }
    }
    alert.count = alert.count || 1;
    var alertItem = ich.comment_alert(alertContextFactory(alert));
    alertItem.bind("click", handleAlertClick);
    
    alertItem.bind("mouseenter", handleAlertMouseenter);
    alertItem.bind("mouseleave", handleAlertMouseleave);
    
    alertItem.hide();
    alertBar.append(alertItem);
    alertItem.fadeIn("slow");
    var delayTO = setTimeout(function (){ clearTimeout(delayTO); alertItem.find(".vox-cmnt-alert-label").fadeOut("slow");}, 5000);
    updateAlertItems();
  }
  
  // Scroll Stuf
  function scrollTo(id) {
    $.scrollTo(("#comment_" + id), {duration: 200});
  }
  var alertBarHidden = false;
  function handleScrollEnd(event) {
    clearTimeout(scrollTimeout);
    loadNextInView();
    updateAlertBarUI();
    alertBarHidden = false;
    alertBar.show();
  }

  function handleScroll(){
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(handleScrollEnd, 200);
    if (alertBarHidden == false) { alertBarHidden = true; alertBar.hide(); }
  }

  // initialization type stuff
  
  function handleLoadRequest(event) {
    event.preventDefault();
    $.getJSON('http://localhost:1337/data/threads', function(data){ 
      $("#vox-cmnt-loadBtn").remove();
      lastUpdateIndex = data.updateIdx;
      buildAlertBar();
      $(window).bind("scroll resize", handleScroll);
      $(window).trigger("scroll");
      resetPingTimer();
      addThreads(data.threads);
      $(".demo-ctl-main").show();
      
      var skipAheadBtn = $('<a href="#">Skip To Newest</a>');
      skipAheadBtn.bind("click", function(event){
        event.preventDefault();
        scrollTo(commentsContainer.find(".vox-cmnt-comment").last().attr("data-comment-id"));
      });
      
      $(".vox-cmnt-main-controls").append(skipAheadBtn)
      
    });
  }
  
  function attemptInit() {
    if (ich.comment_raw && ich.comment && ich.comment_alert) {
      console.log("attemptInit passed")
      $("#vox-cmnt-loadBtn").bind("click", handleLoadRequest);
      
    }
  }
  
  // loding the comment template
  $.ajax({
    url: "http://localhost:1337/templates/comment-raw.html.mu",
    success: function(data){
      ich.addTemplate("comment_raw", data);
      attemptInit();
    }
  });
  
  $.ajax({
    url: "http://localhost:1337/templates/comment.html.mu",
    success: function(data){
      ich.addTemplate("comment", data);
      attemptInit();
    }
  });
  
  $.ajax({
    url: "http://localhost:1337/templates/comment-alert.html.mu",
    success: function(data){
      ich.addTemplate("comment_alert", data);
      attemptInit();
    }
  });
  
  
  // Prototype Stuff
  
  
  function getAnyComment() {
    var allComments = $(".vox-cmnt-comment[data-comment-index]")
      , rand = Math.floor(Math.random() * allComments.length);
    return $(allComments[rand]);
  }
  
  function cloneAnyComment(){
    return getAnyComment().clone();
  }
  
  function replyToSomething(){
    addSomething(getAnyComment().attr("data-comment-id"))
  }
  
  function reccomendSomething(){
    reccomendComment(getAnyComment().attr("data-comment-id")) 
  }
  
  function addSomething(replyTo){
    var newComment = cloneAnyComment();    
    addComments([{ 
        id          : new Date().getTime(), 
        index       : 0,
        title       : newComment.find(".vox-cmnt-title").text(),
        body        : newComment.find(".vox-cmnt-body").html(),
        commenter   : {
          "name":"PrototypeUser",
          "url":"http://www.sbnation.com/users/sbnation",
          "avatarUrl":"http://cdn1.sbnation.com/profile_images/422657/images_small.jpg",
          "signature":"<p>\"Hooves.\"</p>" },
        recommended : false,
        replyTo     : (replyTo) ? {"id":replyTo} : null,
        replies     : []
    }]);
  }
  
  $("#demo-ctl-reply").bind("click", function(event){ event.preventDefault(); replyToSomething(); });
  $("#demo-ctl-recc").bind("click", function(event){ event.preventDefault(); reccomendSomething(); });
});