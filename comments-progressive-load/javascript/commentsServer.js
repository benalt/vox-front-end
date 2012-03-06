var fs        = require("fs")
  , mustache  = require("./node-modules/mustache")
  , Mu        = require("./node-modules/mu")
  , http      = require("http")
  , jsdom     = require('./node-modules/jsdom');

Mu.templateRoot = '../templates';

var commentsLoaded  = false
  , commentsHash    = null
  , commentsArray   = [];

var server;

var initialLoadNumber = 30;

var randomTypeFlag = 0;
  
function renderBasePage(callback, startIdx) {
  var startIdx = startIdx || 0;
  jsdom.env({
    html: '<html><head></head><body><div id="vox-doc"><h2 class="vox-subtitle">Comments</h2><div id="vox-cmnt-container"><span id="vox-cmnt-count" data-comments-total="' + commentsArray.length + '">' + commentsArray.length + '</span></div></div></body></html>',
    scripts: [
      'http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js',
      'javascript/plugins/ICanHaz.min.js',
      'javascript/plugins/jquery.lazyload.min.js',
      'javascript/plugins/jquery.scrollto.min.js',
      'javascript/commentsClient.js',
      'javascript/voxPage.js'
    ]
  }, function (err, window) {
    //console.log("jsdom loaded");
    var $ = window.jQuery
      , commentsContainer = $('#vox-cmnt-container')
      , loadedCount = initialLoadNumber
      , headAddedFlag = false
      , footAddedFlag = false
      , outstandingProcesses = initialLoadNumber
    
    function attemptContinue(){
      //console.log("attemptContinue ran")
      if (outstandingProcesses<1 && headAddedFlag) {
        // rejigger the dom
        commentsContainer.find(".vox-cmnt-comment").each(function(idx,comment) {
          var $comment      = $(comment)
            , commentFor    = $comment.attr("data-reply-to")
            , parentComment = commentsContainer.find("#comment_" + commentFor);
            
          //console.log(commentFor + ":" + parentComment.length );
          if (parentComment.length>0) {
            parentComment.append($comment);
          }
        });
        callback($('html').html());
      }
    };
    
    Mu.render('head.html', {}, {}, function (err, output) {
      if (err) {
        throw err;
      }
      var buffer = '';
      output.addListener('data', function (c) {buffer += c; }).addListener('end', function () { 
        headAddedFlag = true;
        $("head").append(buffer);
        attemptContinue();
      });
    });
    
    
    $.each(getFromIdx(0,initialLoadNumber).comments, function(idx,ctx){
      Mu.render('comment.html', ctx, {}, function (err, output) {
        if (err) {
          throw err;
        }
        var buffer = '';
        output.addListener('data', function (c) {buffer += c; }).addListener('end', function () { 
          outstandingProcesses -= 1;
          commentsContainer.append(buffer);
          attemptContinue();
        });
      });
    });
    
    Mu.render('foot.html', {}, {}, function (err, output) {
      if (err) {
        throw err;
      }
      var buffer = '';
      output.addListener('data', function (c) {buffer += c; }).addListener('end', function () { 
        footAddedFlag = true;
        //console.log(buffer);
        commentsContainer.append(buffer);
        attemptContinue();
      });
    });
        
  });
}

function getFromIdx(from, to){
  var idx   = from || 0
    , to      = to || commentsArray.length-1
    , retArr  = []
    , retObj  = {
        floorReached  : to >=  commentsArray.length,
        totalComments : commentsArray.length,
        comments      : retArr
      };
    
  if (commentsArray.length<1){ return null; }
  
  while(commentsArray[idx] && idx <= to) {
    retArr[retArr.length] = commentsHash["comment_" + commentsArray[idx]]; 
    idx += 1;
  }
  retObj.lastIndex = idx;
  return retObj;
}

function getQueryVariable(queryUrl) { 
  var query = queryUrl.split("?")[1] || ""
    , retObj= {}
    , vars  = query.split("&"); 
  for (var i=vars.length-1; i>-1;i-=1) { 
    var pair = vars[i].split("="); 
    retObj[pair[0]] = parseInt(pair[1])
  } 
  return retObj;
}

function loadStaticFile (path, res, callback){
  fs.readFile('..' + path, function (err, data) {
    if (err) {
      do404(res);
      callback(res,null);
    }
    callback(res,data);
  });
}

function do404 (res) {
  res.writeHead(404, {'Content-Type': res.typeToken});
  res.end("File not found");
}

function do200 (res,data) {
  res.writeHead(200, {'Content-Type': res.typeToken});
  res.end(data);
}

function handleRequest(req, res) {
  var url = req.url;
  //console.log("request at " + url);
  if (commentsLoaded == false) {
    console.log("comments not yet loaded, setting a timeout of 1 sec");
    var to = setTimeout(  function(){ clearTimeout(to); handleRequest(req, res) }, 1000);
    return;
  }
  
  res.typeToken = 'text/plain';
  
  if (url == "/" || url == "index.html") {
    res.typeToken = 'text/html';
    renderBasePage(function(data){ do200(res, data); }, 0);
    return;
  }
  
  if (url.indexOf("/data") > -1) {
    var vars = getQueryVariable(url)
      , from = vars.from || 0
      , to = vars.to || null;
    do200(res, JSON.stringify( (to) ? getFromIdx(from, to) : getFromIdx(from) ));
    return;
  }
  loadStaticFile(url, res, function(res,data) { if (data) { do200(res,data) } });
}

function addRandomComment() {
  var to = setTimeout(function(){ clearTimeout(to); addRandomComment(); }, 10000)
    , caLen = commentsArray.length
    , rand  = Math.floor(caLen * Math.random())
    , rand2 = Math.floor(caLen * Math.random())
    , lastItem = commentsHash["comment_" + commentsArray[caLen - 1]]
    , nextId = parseInt(lastItem.id) + 1
    , baseComment = commentsHash["comment_" + commentsArray[rand]]
    , commentedUpon = commentsHash["comment_" + commentsArray[rand2]]
    , newComment = { 
        id          : nextId, 
        index       : commentsArray.length,
        title       : baseComment.title,
        body        : baseComment.body,
        commenter   : baseComment.commenter,
        recommended : (rand2 < (.10 * caLen)),
        replies     : []
    };
    
  commentsArray.push(newComment.id);
  commentsHash["comment_" + newComment.id] = newComment;
  if (randomTypeFlag < 1) {
     commentedUpon.replies.push(nextId);
     newComment.replyTo = {"id" : commentedUpon.id};
     randomTypeFlag += 1;
  } else {
    randomTypeFlag = 0;
  }  
}

fs.readFile('../resources/comments.json', function (err, data) {
  if (err) throw err;
  //console.log('../resources/comments.json read' );
  var commentsData = JSON.parse(data);
  commentsHash = commentsData.commentsHash;
  commentsArray = commentsData.commentsArray;
  commentsLoaded = true;
  addRandomComment();
});

server = http.createServer(handleRequest);
server.listen(1337, "127.0.0.1");