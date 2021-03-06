var fs        = require("fs")
  , mustache  = require("./node-modules/mustache")
  , Mu        = require("./node-modules/mu")
  , http      = require("http")
  , jsdom     = require('./node-modules/jsdom');

Mu.templateRoot = '../templates';

var commentsLoaded  = false
  , commentsHash    = null
  , threadsArray    = []
  , commentsArray   = []
  , updatesArray    = [];

var server;

var initialLoadNumber = 30;

var randomTypeFlag = 0;
  
function renderBasePage(callback, startIdx) {
  var startIdx = startIdx || 0;
  jsdom.env({
    html: '<html><head></head><body><div id="vox-doc"></div></body></html>',
    scripts: [
      'http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js',
      'javascript/plugins/ICanHaz.min.js',
      'javascript/plugins/jquery.scrollto.min.js',
      'javascript/plugins/jquery.viewport.min.js',
      'javascript/commentsClient.js',
      'javascript/voxPage.js'
    ]
  }, function (err, window) {
    //console.log("jsdom loaded");
    var $ = window.jQuery
      , commentsContainer = $('#vox-cmnt-container')
      , headAddedFlag = false
      , bodyAddedFlag = false;
    
    function attemptContinue(){
      if (headAddedFlag && bodyAddedFlag ) {
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
    Mu.render('body.html', {"commentsCount":commentsArray.length}, {}, function (err, output) {
      if (err) {
        throw err;
      }
      var buffer = '';
      output.addListener('data', function (c) {buffer += c; }).addListener('end', function () { 
        bodyAddedFlag = true;
        $("#vox-doc").append(buffer);
        attemptContinue();
      });
    });
  });
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

function do404 (res) {
  res.writeHead(404, {'Content-Type': res.typeToken});
  res.end("File not found");
}

function do200 (res,data) {
  res.writeHead(200, {'Content-Type': res.typeToken});
  res.end(data);
}

function loadStaticFile (path, res){
  fs.readFile('..' + path, function (err, data) {
    if (err) {
      do404(res);
    }
    do200(res,data);
  });
}

function loadThreads(res){
  do200(res,JSON.stringify( {"updateIdx" : updatesArray.length-1 , "threads" : threadsArray} ));
}

function populateReplies(comment){
  if (!comment) { return; }
  var rpls = comment.replies;
  if (rpls.length > 1) {
    for (var i=rpls.length; i>-1; i--) {
      var cmt = commentsHash["comment_" + rpls[i]]
      if (cmt) {
        rpls[i] = cmt;
        populateReplies(cmt);
      }
    }
  }
  return comment;
}

function loadThread(threadId, res) {
  console.log("request for " + threadId)
  do200(res,JSON.stringify( populateReplies(commentsHash["comment_" + threadId])));
}

function loadUpdates(sinceIndex, res) {
  var updates = updatesArray.slice(sinceIndex);
  for (var i=updates.length-1; i>-1; i--) {
    updates[i] = commentsHash["comment_" + updates[i]];
  }
  do200(res,JSON.stringify({"updateIdx" : updatesArray.length, "commentsCount" : commentsArray.length, "updates":updates}));
}

function handleRequest(req, res) {
  var url = req.url
    , vars = getQueryVariable(url);

  if (commentsLoaded == false) {
    console.log("comments not yet loaded, setting a timeout of 1 sec");
    var to = setTimeout(  function(){ clearTimeout(to); handleRequest(req, res) }, 750);
    return;
  }
  res.typeToken = 'text/plain';
  
  if (url == "/" || url == "index.html") {
    res.typeToken = 'text/html';
    renderBasePage(function(data){ do200(res, data); }, 0);
    return;
  }
  
  
  if (url.indexOf("/data/") > -1) {
    if (url.indexOf("threads") > -1) {
      loadThreads(res)
      return;
    }

    if (url.indexOf("thread") > -1) {
      loadThread(vars.id, res)
      return;
    }

    if (url.indexOf("updates") > -1) {
      loadUpdates(vars.idx || 0 ,res)
      return;
    }
  }
  loadStaticFile(url, res);
}

function addRandomComment() {
  var to = setTimeout(function(){ clearTimeout(to); addRandomComment(); }, 10000)
    , caLen = commentsArray.length
    , rand  = Math.floor(caLen * Math.random())
    , rand2 = Math.floor(caLen * Math.random())
    , nextId = new Date().getTime()
    , baseComment = commentsHash["comment_" + commentsArray[rand]]
    , commentedUpon = commentsHash["comment_" + commentsArray[rand2]]
    , newComment = { 
        id          : nextId, 
        index       : caLen,
        title       : baseComment.title,
        body        : baseComment.body,
        commenter   : baseComment.commenter,
        recommended : (rand2 < (.5 * caLen)),
        replies     : []
    };
  
  commentsArray.push(newComment.id);
  updatesArray.push(newComment.id);
  commentsHash["comment_" + newComment.id] = newComment;
  
  if (rand < .90 * caLen) {
     commentedUpon.replies.push(nextId);
     newComment.replyTo = {"id" : commentedUpon.id};
  } else {
    threadsArray.push(newComment.id);
  } 
  console.log("added a random comment " + caLen + " " + nextId);
}

fs.readFile('../resources/comments.json', function (err, data) {
  if (err) throw err;
  //console.log('../resources/comments.json read' );
  var commentsData = JSON.parse(data);
  commentsHash = commentsData.commentsHash;
  threadsArray = commentsData.threadsArray;
  commentsArray = commentsData.commentsArray;
  commentsLoaded = true;
  addRandomComment();
});

server = http.createServer(handleRequest);
server.listen(1337, "127.0.0.1");