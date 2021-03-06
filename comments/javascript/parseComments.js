var jsdom = require('./node-modules/jsdom')
  , fs    = require('fs');

fs.readFile('../resources/comments-html.txt', function (err, data) {
  if (err) throw err;
  var commentsContent = data;
  
  console.log("../resources/comments-html.txt loaded");
  
  jsdom.env({
    html: "<html><body></body></html>",
    scripts: [
      'http://code.jquery.com/jquery-1.5.min.js'
    ]
  }, function (err, window) {
    console.log("jsdom initialized correctly");
    var $ = window.jQuery
      , threadsArray  = []
      , commentsArray = []
      , commentsHash  = {}
      , commentsCount = 0
      , comments = {"commentsArray" : commentsArray, "threadsArray" : threadsArray, "commentsHash" : commentsHash};
      
    $('body').append("<div class='commentsContainer'>" + commentsContent +"</div>");
    $(".citem").each(function(idx, elem){
      var $this   = $(elem)
        , $cNode  = $this.find("> .comment")
        , parentId =  $this.parent().attr("id").substr(13)
        , isThread = (parentId == "comments_list");
      
      $body = $cNode.find(".cbody").clone();
      $body.find(".sig").remove();
      
      var comment = { 
          id          : $this.attr("id").substr(13),
          index       : idx, 
          title       : $.trim($cNode.find(".comment_title").text()),
          body        : $.trim($body.html()),
          replyTo     : (parentId == "comments_list") ? null : {"id" : parentId },
          replies     : function(){ 
            var repliesArray = [];
              $this.children().filter(".citem").each(function(idx, citem){
                repliesArray[repliesArray.length] = $(citem).attr("id").substr(13);
              });
              return repliesArray;
            }(),
          time        : $.trim($cNode.find(".by .time").text()),
          recommended : $cNode.hasClass("recommended"),
          commenter   : {
            name 			: $.trim($($cNode.find(".by a")[0]).text()),
            url 			: $cNode.find(".pic").attr("href"),
            avatarUrl : $cNode.find(".pic img").attr("src"),
            signature : $.trim($cNode.find(".sig").html())
          }
        };
      if (isThread) {
        threadsArray[threadsArray.length] = comment.id;
      } 
      commentsArray[commentsArray.length] = comment.id;
      commentsHash["comment_" + comment.id] = comment;
    });
    commentsHash.commentsCount = commentsCount;
    console.log("processd " + commentsCount + " comments");
    fs.writeFile('../resources/comments.json', JSON.stringify(comments) , function (err) {
      if (err) throw err;
      console.log("wrote ../resources/comments.json with " + commentsCount + " records");
      process.exit(0);
    });
  });
});