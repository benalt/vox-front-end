var jsdom = require('./node-module/jsdom')
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
      , commentsArray = []
      , commentsHash  = {}
      , comments = {"commentsArray" : commentsArray, "commentsHash" : commentsHash};
      
    $('body').append("<div class='commentsContainer'>" + commentsContent +"</div>");
    $(".citem").each(function(idx, elem){
      var $this   = $(elem)
        , $cNode  = $this.find("> .comment");
      
      $body = $cNode.find(".cbody").clone();
      $body.find(".sig").remove();
      
      var comment = { 
          id          : $this.attr("id").substr(13),
          index       : idx, 
          title       : $.trim($cNode.find(".comment_title").text()),
          body        : $.trim($body.html()),
          replyTo     : {"id" : ( $this.parent().attr("id").substr(13) == "comments_list") ? "" :  $this.parent().attr("id").substr(13)},
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

      commentsArray[commentsArray.length] = comment.id;
      commentsHash["comment_" + comment.id] = comment;

      //console.log("added" + comment.id + " at " (commentsArray.length - 1))
    });
    console.log("processd " + commentsArray.length + "comments");
    fs.writeFile('../resources/comments.json', JSON.stringify(comments) , function (err) {
      if (err) throw err;
      console.log("wrote ../resources/comments.json with " + commentsArray.length + " records");
      process.exit(0);
    });
  });
});